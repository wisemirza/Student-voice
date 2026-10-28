(function () {
  const { DICTIONARY, detectInitialLanguage, setStoredLanguage, formatDate } = window.SV_I18N;

  const TRASH_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
    </svg>
  `;

  const state = {
    lang: detectInitialLanguage(),
    sort: 'popular',
    issues: [],
    loading: true,
    submitting: false,
    deleting: false,
    pendingDeleteIssueId: null,
    votingIds: new Set(),
    reportedIds: new Set()
  };

  const el = {
    langEnBtn: document.getElementById('lang-en-btn'),
    langZhBtn: document.getElementById('lang-zh-btn'),
    appTitle: document.getElementById('ui-app-title'),
    appSubtitle: document.getElementById('ui-app-subtitle'),
    statusBanner: document.getElementById('status-banner'),
    statusBannerText: document.getElementById('status-banner-text'),
    statusBannerClose: document.getElementById('status-banner-close'),
    issueForm: document.getElementById('issue-form'),
    titleInput: document.getElementById('issue-title'),
    descriptionInput: document.getElementById('issue-description'),
    websiteHoneypot: document.getElementById('issue-website-url'),
    composerMuted: document.getElementById('ui-composer-muted'),
    submitFormBtn: document.getElementById('submit-form-btn'),
    issuesCountLabel: document.getElementById('issues-count-label'),
    sortPopularBtn: document.getElementById('sort-popular-btn'),
    sortNewestBtn: document.getElementById('sort-newest-btn'),
    issuesList: document.getElementById('issues-list'),
    deleteModal: document.getElementById('delete-modal'),
    deleteModalTitle: document.getElementById('ui-delete-modal-title'),
    deleteModalBody: document.getElementById('ui-delete-modal-body'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteModalBtn: document.getElementById('confirm-delete-modal-btn'),
    reportModal: document.getElementById('report-modal'),
    reportModalTitle: document.getElementById('ui-report-modal-title'),
    reportForm: document.getElementById('report-form'),
    reportIssueId: document.getElementById('report-issue-id'),
    reportReasonLabel: document.getElementById('ui-report-reason-label'),
    reportReasonSelect: document.getElementById('report-reason'),
    reportDetailsLabel: document.getElementById('ui-report-details-label'),
    reportDetailsInput: document.getElementById('report-details'),
    cancelReportBtn: document.getElementById('cancel-report-btn'),
    submitReportBtn: document.getElementById('submit-report-btn'),
    footerAnon: document.getElementById('ui-footer-anon'),
    footerPrivacy: document.getElementById('ui-footer-privacy')
  };

  function t() {
    return DICTIONARY[state.lang] || DICTIONARY.en;
  }

  let bannerTimer = null;
  function showBanner(type, messageKeyOrRaw) {
    const dict = t();
    const msg = dict.messages[messageKeyOrRaw] || messageKeyOrRaw;
    el.statusBanner.className = `alert-banner alert-${type}`;
    el.statusBannerText.textContent = msg;
    el.statusBanner.classList.remove('hiding');
    el.statusBanner.hidden = false;
    if (bannerTimer) clearTimeout(bannerTimer);
    if (type === 'success') {
      bannerTimer = setTimeout(hideBanner, 3200);
    }
  }

  function hideBanner() {
    if (el.statusBanner.hidden) return;
    el.statusBanner.classList.add('hiding');
    setTimeout(() => {
      el.statusBanner.hidden = true;
      el.statusBanner.classList.remove('hiding');
    }, 340);
  }

  function applyStaticTranslations() {
    const dict = t();
    document.documentElement.lang = state.lang;

    el.langEnBtn.classList.toggle('active', state.lang === 'en');
    el.langEnBtn.setAttribute('aria-pressed', String(state.lang === 'en'));
    el.langZhBtn.classList.toggle('active', state.lang === 'zh-CN');
    el.langZhBtn.setAttribute('aria-pressed', String(state.lang === 'zh-CN'));

    el.appTitle.textContent = dict.appTitle;
    el.appSubtitle.textContent = dict.appSubtitle;
    el.titleInput.placeholder = dict.titlePlaceholder;
    el.descriptionInput.placeholder = dict.descriptionPlaceholder;
    el.composerMuted.textContent = dict.composerMutedNote;
    el.submitFormBtn.textContent = state.submitting ? dict.submittingBtn : dict.submitBtn;

    el.sortPopularBtn.textContent = dict.sortMostVoted;
    el.sortNewestBtn.textContent = dict.sortNewest;

    el.deleteModalTitle.textContent = dict.deleteModalTitle;
    el.deleteModalBody.textContent = dict.deleteModalBody;
    el.cancelDeleteBtn.textContent = dict.cancelBtn;
    el.confirmDeleteModalBtn.textContent = state.deleting ? dict.deletingBtn : dict.deleteConfirmBtn;

    el.reportModalTitle.textContent = dict.reportModalTitle;
    el.reportReasonLabel.textContent = dict.reportReasonLabel;
    el.reportDetailsLabel.textContent = dict.reportDetailsLabel;
    el.cancelReportBtn.textContent = dict.cancelBtn;
    el.submitReportBtn.textContent = dict.reportSubmitBtn;

    const currentReason = el.reportReasonSelect.value || 'personal_info';
    el.reportReasonSelect.innerHTML = '';
    Object.keys(dict.reportReasons).forEach((key) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = dict.reportReasons[key];
      if (key === currentReason) opt.selected = true;
      el.reportReasonSelect.appendChild(opt);
    });

    el.footerAnon.textContent = dict.footerAnonymous;
    el.footerPrivacy.textContent = dict.footerPrivacy;

    renderIssuesList();
  }

  function isWithinDeleteWindow(issue) {
    if (!issue.can_delete || !issue.delete_expires_at) return false;
    const msLeft = Date.parse(issue.delete_expires_at) - Date.now();
    return Number.isFinite(msLeft) && msLeft > 0;
  }

  function renderIssuesList() {
    const dict = t();
    el.issuesList.innerHTML = '';

    if (state.loading) {
      el.issuesCountLabel.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'empty-state';
      loadingDiv.textContent = dict.loadingIssues;
      el.issuesList.appendChild(loadingDiv);
      return;
    }

    el.issuesCountLabel.textContent = dict.issuesCount(state.issues.length);

    if (state.issues.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.textContent = dict.emptyState;
      el.issuesList.appendChild(emptyDiv);
      return;
    }

    state.issues.forEach((issue) => {
      const card = document.createElement('article');
      card.className = 'issue-card';
      card.dataset.issueId = String(issue.id);

      // Vote Button
      const voteBox = document.createElement('div');
      voteBox.className = 'vote-box';

      const voteBtn = document.createElement('button');
      voteBtn.type = 'button';
      const hasVoted = Boolean(issue.has_voted);
      const isVoting = state.votingIds.has(issue.id);
      voteBtn.className = `vote-btn${hasVoted ? ' voted' : ''}`;
      voteBtn.disabled = isVoting;
      voteBtn.setAttribute('aria-pressed', String(hasVoted));
      voteBtn.setAttribute(
        'aria-label',
        `${hasVoted ? dict.undoVoteAriaLabel : dict.voteAriaLabel} (${issue.vote_count})`
      );
      voteBtn.title = hasVoted ? dict.undoVoteTooltip : dict.voteAriaLabel;

      const voteIcon = document.createElement('span');
      voteIcon.className = 'vote-icon';
      voteIcon.setAttribute('aria-hidden', 'true');
      voteIcon.textContent = '▲';

      const voteCountSpan = document.createElement('span');
      voteCountSpan.className = 'vote-count';
      voteCountSpan.textContent = String(issue.vote_count);

      voteBtn.appendChild(voteIcon);
      voteBtn.appendChild(voteCountSpan);

      voteBtn.addEventListener('click', () => {
        const currentIssue = state.issues.find((i) => i.id === issue.id);
        const isVoted = currentIssue ? Boolean(currentIssue.has_voted) : voteBtn.classList.contains('voted');
        if (isVoted) {
          handleUnvote(issue.id);
        } else {
          handleVote(issue.id);
        }
      });

      voteBox.appendChild(voteBtn);
      card.appendChild(voteBox);

      // Body
      const body = document.createElement('div');
      body.className = 'issue-body';

      const hasTitle = Boolean(issue.title && issue.title.trim().length > 0);
      if (hasTitle) {
        const titleEl = document.createElement('h3');
        titleEl.className = 'issue-title';
        titleEl.textContent = issue.title;
        body.appendChild(titleEl);
      }

      const descEl = document.createElement('p');
      descEl.className = hasTitle ? 'issue-description' : 'issue-description plain-primary';
      descEl.textContent = issue.description;
      body.appendChild(descEl);

      const metaBottom = document.createElement('div');
      metaBottom.className = 'issue-meta-bottom';

      const dateSpan = document.createElement('time');
      dateSpan.className = 'issue-date';
      dateSpan.dateTime = issue.created_at;
      dateSpan.textContent = formatDate(issue.created_at, state.lang);
      metaBottom.appendChild(dateSpan);

      const actionsRight = document.createElement('div');
      actionsRight.className = 'issue-actions-right';

      // Clean Trash SVG Icon only (shown only to author within the 1-hour window)
      if (isWithinDeleteWindow(issue)) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete-icon-btn';
        delBtn.setAttribute('aria-label', dict.deleteAriaLabel);
        delBtn.title = dict.deleteAriaLabel;
        delBtn.innerHTML = TRASH_SVG;
        delBtn.addEventListener('click', () => openDeleteModal(issue.id));
        actionsRight.appendChild(delBtn);
      }

      const reportBtn = document.createElement('button');
      reportBtn.type = 'button';
      reportBtn.className = 'report-link-btn';
      const isReported = state.reportedIds.has(issue.id);
      reportBtn.disabled = isReported;
      reportBtn.textContent = isReported ? dict.reportedDone : dict.reportBtn;
      if (!isReported) {
        reportBtn.addEventListener('click', () => openReportModal(issue.id));
      }
      actionsRight.appendChild(reportBtn);

      metaBottom.appendChild(actionsRight);
      body.appendChild(metaBottom);
      card.appendChild(body);
      el.issuesList.appendChild(card);
    });
  }

  function openDeleteModal(issueId) {
    state.pendingDeleteIssueId = issueId;
    el.deleteModal.hidden = false;
    el.confirmDeleteModalBtn.focus();
  }

  function closeDeleteModal() {
    state.pendingDeleteIssueId = null;
    el.deleteModal.hidden = true;
  }

  async function handleConfirmDelete() {
    const issueId = state.pendingDeleteIssueId;
    if (!issueId || state.deleting) return;

    state.deleting = true;
    el.confirmDeleteModalBtn.disabled = true;
    el.confirmDeleteModalBtn.textContent = t().deletingBtn;

    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      const data = await res.json();
      closeDeleteModal();

      if (!res.ok) {
        if (data.error === 'DELETE_WINDOW_EXPIRED') {
          state.issues = state.issues.map((i) =>
            i.id === issueId ? { ...i, can_delete: false, delete_expires_at: null } : i
          );
        }
        showBanner('error', data.error || 'SERVER_ERROR');
        return;
      }

      const cardEl = document.querySelector(`.issue-card[data-issue-id="${issueId}"]`);
      if (cardEl) {
        cardEl.classList.add('card-deleting');
        await new Promise((r) => setTimeout(r, 320));
      }

      state.issues = state.issues.filter((i) => i.id !== issueId);
      showBanner('success', 'ISSUE_DELETED');
    } catch {
      closeDeleteModal();
      showBanner('error', 'SERVER_ERROR');
    } finally {
      state.deleting = false;
      el.confirmDeleteModalBtn.disabled = false;
      el.confirmDeleteModalBtn.textContent = t().deleteConfirmBtn;
      renderIssuesList();
    }
  }

  async function fetchIssues(retries = 2) {
    if (retries === 2) {
      state.loading = true;
      renderIssuesList();
    }
    try {
      const params = new URLSearchParams({
        sort: state.sort,
        lang: state.lang
      });
      const res = await fetch(`/api/issues?${params.toString()}`, {
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      state.issues = Array.isArray(data.issues) ? data.issues : [];
      state.loading = false;
      renderIssuesList();
    } catch {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 600));
        return fetchIssues(retries - 1);
      }
      state.loading = false;
      renderIssuesList();
      showBanner('error', 'SERVER_ERROR');
    }
  }

  async function handleIssueSubmit(event) {
    event.preventDefault();
    if (state.submitting) return;
    hideBanner();

    const title = el.titleInput.value.trim();
    const description = el.descriptionInput.value.trim();
    const website_url = el.websiteHoneypot.value;

    if (!description) {
      showBanner('error', 'DESCRIPTION_REQUIRED');
      el.descriptionInput.focus();
      return;
    }

    state.submitting = true;
    el.submitFormBtn.disabled = true;
    el.submitFormBtn.textContent = t().submittingBtn;

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ title, description, website_url })
      });

      const data = await res.json();
      if (!res.ok) {
        showBanner('error', data.error || 'SERVER_ERROR');
        return;
      }

      el.issueForm.reset();
      showBanner('success', 'ISSUE_SUBMITTED');
      await fetchIssues();
    } catch {
      showBanner('error', 'SERVER_ERROR');
    } finally {
      state.submitting = false;
      el.submitFormBtn.disabled = false;
      el.submitFormBtn.textContent = t().submitBtn;
    }
  }

  function updateIssueVoteDOM(issueId, newVoteCount, hasVoted) {
    const card = document.querySelector(`.issue-card[data-issue-id="${issueId}"]`);
    if (!card) return;
    const btn = card.querySelector('.vote-btn');
    const countSpan = card.querySelector('.vote-count');
    const dict = t();

    if (btn) {
      btn.classList.toggle('voted', hasVoted);
      btn.setAttribute('aria-pressed', String(hasVoted));
      btn.setAttribute(
        'aria-label',
        `${hasVoted ? dict.undoVoteAriaLabel : dict.voteAriaLabel} (${newVoteCount})`
      );
      btn.title = hasVoted ? dict.undoVoteTooltip : dict.voteAriaLabel;
      btn.disabled = false;
    }
    if (countSpan) {
      countSpan.textContent = String(newVoteCount);
    }
  }

  async function handleVote(issueId) {
    if (state.votingIds.has(issueId)) return;
    state.votingIds.add(issueId);

    const card = document.querySelector(`.issue-card[data-issue-id="${issueId}"]`);
    const btn = card ? card.querySelector('.vote-btn') : null;
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`/api/issues/${issueId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      const data = await res.json();
      if (!res.ok) {
        if (btn) btn.disabled = false;
        showBanner('error', data.error || 'SERVER_ERROR');
        return;
      }

      const newVoteCount = Number(data.vote_count);
      const hasVoted = Boolean(data.has_voted);

      state.issues = state.issues.map((item) =>
        item.id === issueId
          ? {
              ...item,
              vote_count: newVoteCount,
              has_voted: hasVoted
            }
          : item
      );

      updateIssueVoteDOM(issueId, newVoteCount, hasVoted);

      if (state.sort === 'popular') {
        const sorted = [...state.issues].sort((a, b) => {
          if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
          if (b.created_at !== a.created_at) return b.created_at.localeCompare(a.created_at);
          return b.id - a.id;
        });

        const orderChanged = sorted.some((item, idx) => item.id !== state.issues[idx].id);
        if (orderChanged) {
          state.issues = sorted;
          sorted.forEach((iss) => {
            const elCard = document.querySelector(`.issue-card[data-issue-id="${iss.id}"]`);
            if (elCard) el.issuesList.appendChild(elCard);
          });
        }
      }
    } catch {
      if (btn) btn.disabled = false;
      showBanner('error', 'SERVER_ERROR');
    } finally {
      state.votingIds.delete(issueId);
      if (btn) btn.disabled = false;
    }
  }

  async function handleUnvote(issueId) {
    if (state.votingIds.has(issueId)) return;
    state.votingIds.add(issueId);

    const card = document.querySelector(`.issue-card[data-issue-id="${issueId}"]`);
    const btn = card ? card.querySelector('.vote-btn') : null;
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`/api/issues/${issueId}/vote`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      const data = await res.json();
      if (!res.ok) {
        if (btn) btn.disabled = false;
        showBanner('error', data.error || 'SERVER_ERROR');
        return;
      }

      const newVoteCount = Number(data.vote_count);
      const hasVoted = false;

      state.issues = state.issues.map((item) =>
        item.id === issueId
          ? {
              ...item,
              vote_count: newVoteCount,
              has_voted: false
            }
          : item
      );

      updateIssueVoteDOM(issueId, newVoteCount, false);

      if (state.sort === 'popular') {
        const sorted = [...state.issues].sort((a, b) => {
          if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
          if (b.created_at !== a.created_at) return b.created_at.localeCompare(a.created_at);
          return b.id - a.id;
        });

        const orderChanged = sorted.some((item, idx) => item.id !== state.issues[idx].id);
        if (orderChanged) {
          state.issues = sorted;
          sorted.forEach((iss) => {
            const elCard = document.querySelector(`.issue-card[data-issue-id="${iss.id}"]`);
            if (elCard) el.issuesList.appendChild(elCard);
          });
        }
      }
    } catch {
      if (btn) btn.disabled = false;
      showBanner('error', 'SERVER_ERROR');
    } finally {
      state.votingIds.delete(issueId);
      if (btn) btn.disabled = false;
    }
  }

  function openReportModal(issueId) {
    el.reportIssueId.value = String(issueId);
    el.reportDetailsInput.value = '';
    el.reportModal.hidden = false;
    el.reportReasonSelect.focus();
  }

  function closeReportModal() {
    el.reportModal.hidden = true;
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    const issueId = Number(el.reportIssueId.value);
    const reason = el.reportReasonSelect.value;
    const details = el.reportDetailsInput.value.trim();

    try {
      const res = await fetch(`/api/issues/${issueId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reason, details })
      });

      if (res.ok) {
        state.reportedIds.add(issueId);
        closeReportModal();
        showBanner('success', 'REPORT_SUBMITTED');
        renderIssuesList();
      } else {
        const err = await res.json();
        showBanner('error', err.error || 'SERVER_ERROR');
      }
    } catch {
      showBanner('error', 'SERVER_ERROR');
    }
  }

  function switchLanguage(newLang) {
    if (state.lang === newLang) return;
    state.lang = setStoredLanguage(newLang);
    applyStaticTranslations();
    fetchIssues();
  }

  function bindEvents() {
    el.langEnBtn.addEventListener('click', () => switchLanguage('en'));
    el.langZhBtn.addEventListener('click', () => switchLanguage('zh-CN'));

    el.issueForm.addEventListener('submit', handleIssueSubmit);
    el.statusBannerClose.addEventListener('click', hideBanner);

    el.sortPopularBtn.addEventListener('click', () => {
      if (state.sort !== 'popular') {
        state.sort = 'popular';
        el.sortPopularBtn.classList.add('active');
        el.sortPopularBtn.setAttribute('aria-pressed', 'true');
        el.sortNewestBtn.classList.remove('active');
        el.sortNewestBtn.setAttribute('aria-pressed', 'false');
        fetchIssues();
      }
    });

    el.sortNewestBtn.addEventListener('click', () => {
      if (state.sort !== 'newest') {
        state.sort = 'newest';
        el.sortNewestBtn.classList.add('active');
        el.sortNewestBtn.setAttribute('aria-pressed', 'true');
        el.sortPopularBtn.classList.remove('active');
        el.sortPopularBtn.setAttribute('aria-pressed', 'false');
        fetchIssues();
      }
    });

    // Delete Modal Events
    el.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    el.confirmDeleteModalBtn.addEventListener('click', handleConfirmDelete);
    el.deleteModal.addEventListener('click', (e) => {
      if (e.target === el.deleteModal) closeDeleteModal();
    });

    // Report Modal Events
    el.cancelReportBtn.addEventListener('click', closeReportModal);
    el.reportForm.addEventListener('submit', handleReportSubmit);
    el.reportModal.addEventListener('click', (e) => {
      if (e.target === el.reportModal) closeReportModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDeleteModal();
        closeReportModal();
      }
    });

    // Periodically hide the trash icon automatically once the 1-hour window ends
    setInterval(() => {
      if (!state.loading && state.issues.some((i) => i.can_delete)) {
        renderIssuesList();
      }
    }, 30000);
  }

  function init() {
    setStoredLanguage(state.lang);
    bindEvents();
    applyStaticTranslations();
    fetchIssues();
  }

  init();
})();
