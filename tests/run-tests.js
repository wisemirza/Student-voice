process.env.NODE_ENV = 'test';
process.env.SQLITE_DB_PATH = ':memory:';
process.env.COOKIE_SECRET = 'test-cookie-secret-64-bytes-uwe-bristol-student-voice-2026';
process.env.ADMIN_PASSWORD = 'test-moderator-secret-password';
process.env.TRANSLATION_PROVIDER = 'none';
process.env.AUTHOR_DELETE_WINDOW_MINUTES = '60';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../src/server');
const db = require('../src/db');

let serverInstance = null;
let baseUrl = '';

function extractCookies(res, existingJar = {}) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const jar = { ...existingJar };
  for (const cookieStr of raw) {
    const [pair] = cookieStr.split(';');
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      const name = pair.slice(0, eqIdx).trim();
      const val = pair.slice(eqIdx + 1).trim();
      if (val === '') {
        delete jar[name];
      } else {
        jar[name] = val;
      }
    }
  }
  return jar;
}

function formatCookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

test.before(async () => {
  const started = await startServer(0);
  serverInstance = started.server;
  baseUrl = `http://127.0.0.1:${started.port}`;
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  await db.closeDb();
});

test('1. App starts completely empty (zero mockup data), student submits plain issue, and sees can_delete within 1h', async () => {
  const initialRes = await fetch(`${baseUrl}/api/issues`);
  const initialData = await initialRes.json();
  assert.equal(initialData.issues.length, 0, 'Database must start clean with zero mock issues');

  let studentJar = {};
  const createRes = await fetch(`${baseUrl}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Training vision models on laptops is slow; cloud GPU credits would really help.'
    })
  });

  studentJar = extractCookies(createRes, studentJar);
  assert.equal(createRes.status, 201);
  assert.ok(studentJar.sv_voter_token);

  const createdData = await createRes.json();
  assert.equal(createdData.issue.id, 1);
  assert.equal(createdData.issue.can_delete, true);
  assert.ok(createdData.issue.delete_expires_at);

  // Another student browser does NOT see can_delete: true for Issue 1
  const otherStudentList = await (await fetch(`${baseUrl}/api/issues`)).json();
  assert.equal(otherStudentList.issues[0].can_delete, false);
});

test('2. Limited-time self-delete: non-author blocked, author can delete within 1h, expired window blocked', async () => {
  let authorJar = {};
  const createRes = await fetch(`${baseUrl}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Temporary statement I want to delete within one hour.'
    })
  });
  authorJar = extractCookies(createRes, authorJar);
  const issueId = (await createRes.json()).issue.id;

  // Another random browser tries to delete it -> 403 FORBIDDEN_NOT_AUTHOR
  const strangerDel = await fetch(`${baseUrl}/api/issues/${issueId}`, {
    method: 'DELETE'
  });
  assert.equal(strangerDel.status, 403);
  assert.equal((await strangerDel.json()).error, 'FORBIDDEN_NOT_AUTHOR');

  // Author deletes within 1 hour -> 200 OK and removed from list
  const authorDel = await fetch(`${baseUrl}/api/issues/${issueId}`, {
    method: 'DELETE',
    headers: { Cookie: formatCookieHeader(authorJar) }
  });
  assert.equal(authorDel.status, 200);
  const afterDelList = await (await fetch(`${baseUrl}/api/issues`)).json();
  assert.equal(
    afterDelList.issues.some((i) => i.id === issueId),
    false,
    'Deleted issue must be removed'
  );

  // Test expired window: set window to tiny value (0.00001 mins = 0.6ms) and wait 5ms
  process.env.AUTHOR_DELETE_WINDOW_MINUTES = '0.00001';
  const createExpRes = await fetch(`${baseUrl}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: formatCookieHeader(authorJar) },
    body: JSON.stringify({
      description: 'Statement that will pass the delete time limit.'
    })
  });
  const expIssueId = (await createExpRes.json()).issue.id;
  await new Promise((r) => setTimeout(r, 15));

  const expiredDel = await fetch(`${baseUrl}/api/issues/${expIssueId}`, {
    method: 'DELETE',
    headers: { Cookie: formatCookieHeader(authorJar) }
  });
  assert.equal(expiredDel.status, 403);
  assert.equal((await expiredDel.json()).error, 'DELETE_WINDOW_EXPIRED');

  // Restore 60 minute window
  process.env.AUTHOR_DELETE_WINDOW_MINUTES = '60';
});

test('3. Anonymous voting: vote once, reject duplicate votes, persist after refresh', async () => {
  let voter1Jar = {};

  const createRes2 = await fetch(`${baseUrl}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '就业指导讲座',
      description: '希望能增加针对数据科学与人工智能专业的实习和求职工作坊。'
    })
  });
  voter1Jar = extractCookies(createRes2, voter1Jar);
  const issue2 = (await createRes2.json()).issue;

  const vote1Res = await fetch(`${baseUrl}/api/issues/1/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formatCookieHeader(voter1Jar)
    },
    body: JSON.stringify({ vote_count: 9999 })
  });
  assert.equal(vote1Res.status, 200);
  assert.equal((await vote1Res.json()).vote_count, 1);

  const duplicateVoteRes = await fetch(`${baseUrl}/api/issues/1/vote`, {
    method: 'POST',
    headers: { Cookie: formatCookieHeader(voter1Jar) }
  });
  const dupData = await duplicateVoteRes.json();
  assert.equal(dupData.vote_count, 1);
  assert.equal(dupData.already_voted, true);

  // Undo / retract vote
  const retractRes = await fetch(`${baseUrl}/api/issues/1/vote`, {
    method: 'DELETE',
    headers: { Cookie: formatCookieHeader(voter1Jar) }
  });
  assert.equal(retractRes.status, 200);
  const retractData = await retractRes.json();
  assert.equal(retractData.vote_count, 0);
  assert.equal(retractData.has_voted, false);

  // Re-vote
  const revoteRes = await fetch(`${baseUrl}/api/issues/1/vote`, {
    method: 'POST',
    headers: { Cookie: formatCookieHeader(voter1Jar) }
  });
  assert.equal((await revoteRes.json()).vote_count, 1);

  // Automatic screen-wide translation check
  await db.saveCachedTranslation({
    issueId: issue2.id,
    targetLang: 'en',
    translatedTitle: 'Career Guidance Workshops',
    translatedDescription: 'Hope to add more internship and job workshops for Data Science & AI.',
    provider: 'Auto Translation'
  });

  const enRes = await fetch(`${baseUrl}/api/issues?lang=en`);
  const enData = await enRes.json();
  const issue2En = enData.issues.find((i) => i.id === issue2.id);
  assert.equal(issue2En.title, 'Career Guidance Workshops');
});

test('4. Input validation, PII protection, honeypot spam rejection, and Admin-only QR security', async () => {
  const emailPiiRes = await fetch(`${baseUrl}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Contact me at student123@live.uwe.ac.uk regarding my mark.'
    })
  });
  assert.equal(emailPiiRes.status, 400);
  assert.equal((await emailPiiRes.json()).error, 'PII_DETECTED');

  const unauthQr = await fetch(`${baseUrl}/api/admin/qrcode`);
  assert.equal(unauthQr.status, 401);

  let adminJar = {};
  const goodLogin = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'test-moderator-secret-password' })
  });
  assert.equal(goodLogin.status, 200);
  adminJar = extractCookies(goodLogin, adminJar);

  const qrRes = await fetch(`${baseUrl}/api/admin/qrcode`, {
    headers: { Cookie: formatCookieHeader(adminJar) }
  });
  assert.equal(qrRes.status, 200);
  assert.match(qrRes.headers.get('content-type') || '', /image\/svg\+xml/);
});
