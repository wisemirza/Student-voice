(function () {
  let statusFilter = 'all';
  let issues = [];
  let shareUrl = window.location.origin;

  const loginSection = document.getElementById('admin-login-section');
  const dashboardSection = document.getElementById('admin-dashboard-section');
  const loginForm = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password-input');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const qrBtn = document.getElementById('admin-qr-btn');
  const qrModal = document.getElementById('admin-qr-modal');
  const qrImg = document.getElementById('admin-qr-img');
  const shareUrlInput = document.getElementById('admin-share-url');
  const copyUrlBtn = document.getElementById('admin-copy-url-btn');
  const closeQrBtn = document.getElementById('close-qr-modal-btn');
  const filterBar = document.getElementById('admin-filter-bar');
  const issuesList = document.getElementById('admin-issues-list');
  const banner = document.getElementById('admin-banner');
  const bannerText = document.getElementById('admin-banner-text');
  const bannerClose = document.getElementById('admin-banner-close');

  let adminBannerTimer = null;
  function showBanner(type, text) {
    banner.className = `alert-banner alert-${type}`;
    bannerText.textContent = text;
    banner.classList.remove('hiding');
    banner.hidden = false;
    if (adminBannerTimer) clearTimeout(adminBannerTimer);
    if (type === 'success') {
      adminBannerTimer = setTimeout(hideBanner, 3200);
    }
  }

  function hideBanner() {
    if (banner.hidden) return;
    banner.classList.add('hiding');
    setTimeout(() => {
      banner.hidden = true;
      banner.classList.remove('hiding');
    }, 340);
  }

  async function checkSession() {
    try {
      const res = await fetch('/api/admin/session', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.authenticated) {
        if (data.shareUrl) shareUrl = data.shareUrl;
        showDashboard();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  }

  function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    logoutBtn.hidden = true;
    qrBtn.hidden = true;
    qrModal.hidden = true;
    passwordInput.focus();
  }

  function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    logoutBtn.hidden = false;
    qrBtn.hidden = false;
    fetchAdminIssues();
  }

  async function fetchAdminIssues() {
    issuesList.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      const res = await fetch(`/api/admin/issues?status=${encodeURIComponent(statusFilter)}`, {
        credentials: 'same-origin'
      });
      if (res.status === 401) {
        showLogin();
        return;
      }
      const data = await res.json();
      issues = Array.isArray(data.issues) ? data.issues : [];
      renderAdminIssues();
    } catch {
      showBanner('error', 'Failed to load issues.');
    }
  }

  function renderAdminIssues() {
    issuesList.innerHTML = '';
    if (issues.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No issues in this view.';
      issuesList.appendChild(empty);
      return;
    }

    issues.forEach((issue) => {
      const card = document.createElement('article');
      card.className = 'issue-card';
      card.dataset.issueId = String(issue.id);

      const voteBox = document.createElement('div');
      voteBox.className = 'vote-box';
      const voteBadge = document.createElement('div');
      voteBadge.className = 'vote-btn';
      voteBadge.style.cursor = 'default';
      const countSpan = document.createElement('span');
      countSpan.className = 'vote-count';
      countSpan.textContent = String(issue.vote_count);
      voteBadge.appendChild(countSpan);
      voteBox.appendChild(voteBadge);
      card.appendChild(voteBox);

      const body = document.createElement('div');
      body.className = 'issue-body';

      const meta = document.createElement('div');
      meta.style.display = 'flex';
      meta.style.alignItems = 'center';
      meta.style.gap = '0.45rem';
      meta.style.flexWrap = 'wrap';
      meta.style.marginBottom = '0.35rem';

      const statusBadge = document.createElement('span');
      statusBadge.className = `admin-status-badge status-${issue.status}`;
      statusBadge.textContent = issue.status;
      meta.appendChild(statusBadge);

      const dateSpan = document.createElement('span');
      dateSpan.className = 'issue-date';
      dateSpan.textContent = `#${issue.id} · ${new Date(issue.created_at).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric'
      })}`;
      meta.appendChild(dateSpan);

      if (issue.open_report_count > 0) {
        const repBadge = document.createElement('span');
        repBadge.className = 'report-badge';
        repBadge.textContent = `${issue.open_report_count} Report(s)`;
        meta.appendChild(repBadge);
      }

      body.appendChild(meta);

      if (issue.title && issue.title.trim()) {
        const titleEl = document.createElement('h3');
        titleEl.className = 'issue-title';
        titleEl.textContent = issue.title;
        body.appendChild(titleEl);
      }

      const descEl = document.createElement('p');
      descEl.className = issue.title && issue.title.trim() ? 'issue-description' : 'issue-description plain-primary';
      descEl.textContent = issue.description;
      body.appendChild(descEl);

      if (Array.isArray(issue.reports) && issue.reports.length > 0) {
        const repBox = document.createElement('div');
        repBox.className = 'reports-box';
        const repHeading = document.createElement('strong');
        repHeading.textContent = `Reports (${issue.reports.length}):`;
        repBox.appendChild(repHeading);
        const ul = document.createElement('ul');
        issue.reports.forEach((r) => {
          const li = document.createElement('li');
          li.textContent = `[${r.status}] ${r.reason}${r.details ? ` (${r.details})` : ''}`;
          ul.appendChild(li);
        });
        repBox.appendChild(ul);
        body.appendChild(repBox);
      }

      const actions = document.createElement('div');
      actions.className = 'admin-actions';

      if (issue.status !== 'active') {
        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'btn btn-secondary btn-sm';
        restoreBtn.textContent = 'Restore';
        restoreBtn.addEventListener('click', () => updateStatus(issue.id, 'active'));
        actions.appendChild(restoreBtn);
      }

      if (issue.status !== 'hidden') {
        const hideBtn = document.createElement('button');
        hideBtn.type = 'button';
        hideBtn.className = 'btn btn-secondary btn-sm';
        hideBtn.textContent = 'Hide';
        hideBtn.addEventListener('click', () => updateStatus(issue.id, 'hidden'));
        actions.appendChild(hideBtn);
      }

      if (issue.status !== 'removed') {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-primary btn-sm';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => updateStatus(issue.id, 'removed'));
        actions.appendChild(removeBtn);
      }

      if (issue.open_report_count > 0) {
        const resolveBtn = document.createElement('button');
        resolveBtn.type = 'button';
        resolveBtn.className = 'btn btn-secondary btn-sm';
        resolveBtn.textContent = 'Dismiss Reports';
        resolveBtn.addEventListener('click', () => resolveReports(issue.id));
        actions.appendChild(resolveBtn);
      }

      body.appendChild(actions);
      card.appendChild(body);
      issuesList.appendChild(card);
    });
  }

  async function updateStatus(issueId, newStatus) {
    hideBanner();
    try {
      const res = await fetch(`/api/admin/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed');
      await fetchAdminIssues();
    } catch {
      showBanner('error', 'Could not update issue status.');
    }
  }

  async function resolveReports(issueId) {
    hideBanner();
    try {
      const res = await fetch(`/api/admin/issues/${issueId}/resolve-reports`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error('Failed');
      await fetchAdminIssues();
    } catch {
      showBanner('error', 'Could not dismiss reports.');
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBanner();
    const password = passwordInput.value;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        showBanner('error', 'Invalid password.');
        return;
      }
      const data = await res.json();
      if (data.shareUrl) shareUrl = data.shareUrl;
      passwordInput.value = '';
      showDashboard();
    } catch {
      showBanner('error', 'Login failed.');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    showLogin();
  });

  qrBtn.addEventListener('click', () => {
    qrImg.src = `/api/admin/qrcode?t=${Date.now()}`;
    shareUrlInput.value = shareUrl || window.location.origin;
    qrModal.hidden = false;
  });

  closeQrBtn.addEventListener('click', () => {
    qrModal.hidden = true;
  });

  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.hidden = true;
  });

  copyUrlBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrlInput.value);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      copyUrlBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyUrlBtn.textContent = 'Copy';
      }, 1800);
    } catch {
      shareUrlInput.select();
      if (typeof shareUrlInput.setSelectionRange === 'function') {
        shareUrlInput.setSelectionRange(0, 99999);
      }
      try {
        document.execCommand('copy');
        copyUrlBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyUrlBtn.textContent = 'Copy';
        }, 1800);
      } catch {
        // User can copy manually from selected input
      }
    }
  });

  filterBar.querySelectorAll('button[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      statusFilter = btn.dataset.filter;
      fetchAdminIssues();
    });
  });

  bannerClose.addEventListener('click', hideBanner);

  checkSession();
})();
