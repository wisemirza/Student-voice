const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { startServer } = require('../src/server');
const db = require('../src/db');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDebuggerUrl(debugPort, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        const targets = await res.json();
        const page = targets.find((t) => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch {
      // retry
    }
    await sleep(150);
  }
  throw new Error('Timed out waiting for Chrome DevTools target');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.seq = 1;
    this.pending = new Map();
    this.consoleErrors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(
          msg.params?.exceptionDetails?.text || 'Uncaught exception in page'
        );
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        const text = (msg.params.args || []).map((a) => a.value || a.description).join(' ');
        this.consoleErrors.push(text);
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    });

    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
  }

  send(method, params = {}) {
    const id = this.seq++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(
        `JS Evaluation Error: ${res.exceptionDetails.text} (${
          res.exceptionDetails.exception?.description || ''
        })`
      );
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runBrowserE2E() {
  const testDbFile = path.join(os.tmpdir(), `sv_e2e_${Date.now()}.db`);
  process.env.NODE_ENV = 'test';
  process.env.SQLITE_DB_PATH = testDbFile;
  process.env.TRANSLATION_PROVIDER = 'none';
  process.env.AUTHOR_DELETE_WINDOW_MINUTES = '60';

  const { server, port } = await startServer(0);
  const appUrl = `http://127.0.0.1:${port}`;

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_sv_e2e_'));
  const debugPort = 9222 + Math.floor(Math.random() * 500);

  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=390,844',
      appUrl
    ],
    { stdio: 'ignore' }
  );

  let cdp = null;
  try {
    const wsUrl = await waitForDebuggerUrl(debugPort);
    cdp = new CDPClient(wsUrl);
    await cdp.connect();

    // Wait for initial empty state to load (0 mockup issues)
    for (let i = 0; i < 40; i++) {
      try {
        const emptyLoaded = await cdp.evaluate(
          `Boolean(document.getElementById('issues-count-label')?.textContent?.includes('0'))`
        );
        if (emptyLoaded) break;
      } catch {
        // DOM still loading
      }
      await sleep(100);
    }

    const initialCards = await cdp.evaluate(`document.querySelectorAll('.issue-card').length`);
    assert.equal(initialCards, 0, 'Must start completely clean with 0 mock issues');

    // Verify Theme Behaviour: No manual switcher buttons, purely follows OS system preference
    const manualButtonsCount = await cdp.evaluate(`document.querySelectorAll('[data-theme-option]').length`);
    assert.equal(manualButtonsCount, 0, 'Must have zero manual theme switcher buttons');

    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }]
    });
    await sleep(80);
    assert.equal(
      await cdp.evaluate(`document.documentElement.getAttribute('data-theme')`),
      'light',
      'Should resolve to light theme when OS is light'
    );
    assert.equal(
      await cdp.evaluate(`getComputedStyle(document.body).backgroundColor`),
      'rgb(247, 247, 247)',
      'Light theme page background should be #F7F7F7'
    );
    assert.equal(
      await cdp.evaluate(`getComputedStyle(document.querySelector('.site-header')).backgroundColor`),
      'rgb(247, 247, 247)',
      'Header background must match light page background #F7F7F7'
    );
    assert.equal(
      await cdp.evaluate(`getComputedStyle(document.getElementById('submit-form-btn')).backgroundColor`),
      'rgb(199, 44, 65)',
      'Primary action button should use #C72C41'
    );

    // Emulate OS switching to Dark
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'dark' }]
    });
    await sleep(80);
    assert.equal(
      await cdp.evaluate(`document.documentElement.getAttribute('data-theme')`),
      'dark',
      'Should automatically switch to dark when OS prefers dark'
    );
    assert.equal(
      await cdp.evaluate(`getComputedStyle(document.body).backgroundColor`),
      'rgb(17, 17, 17)',
      'Dark theme page background should be #111111'
    );
    assert.equal(
      await cdp.evaluate(`getComputedStyle(document.querySelector('.site-header')).backgroundColor`),
      'rgb(17, 17, 17)',
      'Header background must match dark page background #111111'
    );
    assert.equal(
      await cdp.evaluate(`getComputedStyle(document.getElementById('issue-form')).backgroundColor`),
      'rgb(26, 26, 26)',
      'Dark theme card/form surface should be #1A1A1A'
    );

    // Check mobile 16px input font size and zero horizontal overflow
    const mobileFontSize = await cdp.evaluate(
      `getComputedStyle(document.getElementById('issue-description')).fontSize`
    );
    assert.equal(mobileFontSize, '16px', 'Mobile textarea must use 16px font size to prevent iOS zoom');
    const mobileOverflow = await cdp.evaluate(
      `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
    );
    assert.equal(mobileOverflow, true, 'Mobile layout must have no horizontal overflow');

    // Switch to Desktop layout (1280x800) and verify layout
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(80);
    const desktopOverflow = await cdp.evaluate(
      `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
    );
    assert.equal(desktopOverflow, true, 'Desktop layout must have no horizontal overflow');

    // 1. Submit a plain issue without a title
    await cdp.evaluate(`
      (() => {
        const descInput = document.getElementById('issue-description');
        descInput.value = 'More power outlets in the back rows of lecture theatres please.';
        descInput.dispatchEvent(new Event('input'));
        document.getElementById('issue-form').requestSubmit();
      })()
    `);

    for (let i = 0; i < 40; i++) {
      const count = await cdp.evaluate(`document.querySelectorAll('.issue-card').length`);
      if (count === 1) break;
      await sleep(100);
    }
    assert.equal(await cdp.evaluate(`document.querySelectorAll('.issue-card').length`), 1);

    // Verify trash SVG icon button appears (with zero countdown text) and banner says "Posted successfully."
    const bannerMsg = await cdp.evaluate(`document.getElementById('status-banner-text').textContent`);
    assert.equal(bannerMsg, 'Posted successfully.');

    const hasTrashIcon = await cdp.evaluate(`
      Boolean(document.querySelector('.issue-card[data-issue-id="1"] .delete-icon-btn svg'))
    `);
    const trashText = await cdp.evaluate(`
      document.querySelector('.issue-card[data-issue-id="1"] .delete-icon-btn').textContent.trim()
    `);
    assert.equal(hasTrashIcon, true, 'Author should see the SVG trash icon');
    assert.equal(trashText, '', 'Trash button should contain only the SVG icon with no text');

    // 2. Upvote the issue and verify instant retract/undo capability
    await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .vote-btn').click()`);
    for (let i = 0; i < 40; i++) {
      const voted = await cdp.evaluate(`
        document.querySelector('.issue-card[data-issue-id="1"] .vote-btn').classList.contains('voted')
      `);
      if (voted) break;
      await sleep(100);
    }
    assert.equal(
      await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .vote-count').textContent`),
      '1',
      'Vote count should be 1 after voting'
    );

    // Instantly undo / retract vote by clicking the button again
    await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .vote-btn').click()`);
    for (let i = 0; i < 40; i++) {
      const unvoted = await cdp.evaluate(`
        !document.querySelector('.issue-card[data-issue-id="1"] .vote-btn').classList.contains('voted')
      `);
      if (unvoted) break;
      await sleep(100);
    }
    assert.equal(
      await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .vote-count').textContent`),
      '0',
      'Vote count should retract back to 0 after unvoting'
    );

    // Click again to re-vote
    await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .vote-btn').click()`);
    for (let i = 0; i < 40; i++) {
      const voted = await cdp.evaluate(`
        document.querySelector('.issue-card[data-issue-id="1"] .vote-btn').classList.contains('voted')
      `);
      if (voted) break;
      await sleep(100);
    }
    assert.equal(
      await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .vote-count').textContent`),
      '1'
    );

    await cdp.send('Page.reload');
    await sleep(300);
    for (let i = 0; i < 40; i++) {
      const count = await cdp.evaluate(`document.querySelectorAll('.issue-card').length`);
      if (count === 1) break;
      await sleep(100);
    }
    assert.equal(
      await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .vote-btn').classList.contains('voted')`),
      true,
      'Vote should persist across page reload'
    );

    // 3. Test switching UI language to Chinese and back
    await cdp.evaluate(`document.getElementById('lang-zh-btn').click()`);
    await sleep(200);
    assert.equal(await cdp.evaluate(`document.getElementById('ui-app-title').textContent`), '学生之声');
    await cdp.evaluate(`document.getElementById('lang-en-btn').click()`);
    await sleep(200);

    // Test sorting toggle (New / Top)
    await cdp.evaluate(`document.getElementById('sort-newest-btn').click()`);
    await sleep(150);
    await cdp.evaluate(`document.getElementById('sort-popular-btn').click()`);
    await sleep(150);

    // 4. Test clicking the trash SVG icon -> opens confirmation modal -> click Delete
    await cdp.evaluate(`document.querySelector('.issue-card[data-issue-id="1"] .delete-icon-btn').click()`);
    const modalOpen = await cdp.evaluate(`!document.getElementById('delete-modal').hidden`);
    assert.equal(modalOpen, true, 'Delete confirmation modal should open');

    const modalBodyText = await cdp.evaluate(`document.getElementById('ui-delete-modal-body').textContent`);
    assert.match(modalBodyText, /1 hour/i);

    await cdp.evaluate(`document.getElementById('confirm-delete-modal-btn').click()`);
    for (let i = 0; i < 40; i++) {
      const count = await cdp.evaluate(`document.querySelectorAll('.issue-card').length`);
      if (count === 0) break;
      await sleep(100);
    }
    assert.equal(
      await cdp.evaluate(`document.querySelectorAll('.issue-card').length`),
      0,
      'Deleted issue should disappear immediately'
    );

    // 5. Verify /privacy and /admin routes inherit persisted Dark theme cleanly
    await cdp.send('Page.navigate', { url: `${appUrl}/privacy` });
    await sleep(250);
    assert.equal(
      await cdp.evaluate(`document.documentElement.getAttribute('data-theme')`),
      'dark',
      '/privacy route must apply persisted theme immediately'
    );

    const privText = await cdp.evaluate(`document.getElementById('priv-content').innerText`);
    assert(privText.includes('Mohammad Waiz Mirza'), 'Privacy page must display data controller name');
    assert(privText.includes('Wisecrafts81@gmail.com'), 'Privacy page must display privacy contact email');

    await cdp.send('Page.navigate', { url: `${appUrl}/admin` });
    await sleep(250);
    assert.equal(
      await cdp.evaluate(`document.documentElement.getAttribute('data-theme')`),
      'dark',
      '/admin route must apply persisted theme immediately'
    );

    assert.equal(
      cdp.consoleErrors.length,
      0,
      `Expected zero browser console errors, got: ${cdp.consoleErrors.join('; ')}`
    );

    console.log('✓ Real headless Chrome E2E verification passed with 0 console/CSP errors!');
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill();
    await new Promise((r) => server.close(r));
    await db.closeDb();
    try {
      fs.rmSync(testDbFile, { force: true });
      fs.rmSync(`${testDbFile}-wal`, { force: true });
      fs.rmSync(`${testDbFile}-shm`, { force: true });
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

if (require.main === module) {
  runBrowserE2E().catch((err) => {
    console.error('Browser E2E failed:', err);
    process.exit(1);
  });
}

module.exports = { runBrowserE2E };
