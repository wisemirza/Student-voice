(function () {
  const DICTIONARY = {
    en: {
      appTitle: 'Student Voice',
      appSubtitle: 'UWE Data Science & AI · Students Share What Needs Improving',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      titlePlaceholder: 'Title (optional)',
      descriptionPlaceholder: 'Write your issue or suggestion plainly...',
      composerMutedNote: 'Anonymous · No login required · Avoid names or IDs',
      submitBtn: 'Submit',
      submittingBtn: 'Posting...',
      sortMostVoted: 'Top',
      sortNewest: 'New',
      issuesCount: (n) => `${n} ${n === 1 ? 'issue' : 'issues'}`,
      voteAriaLabel: 'Upvote this issue',
      votedAriaLabel: 'Voted',
      undoVoteAriaLabel: 'Undo upvote',
      undoVoteTooltip: 'Click to undo upvote',
      deleteAriaLabel: 'Delete post',
      deleteModalTitle: 'Delete this post?',
      deleteModalBody:
        'Are you sure you want to delete this post? Deleting cannot be undone. You only have 1 hour after posting to delete a post. After 1 hour, you will no longer be able to remove it.',
      deleteConfirmBtn: 'Delete',
      deletingBtn: 'Deleting...',
      reportBtn: 'Report',
      reportedDone: 'Reported',
      emptyState: 'No issues yet. Write one above to get started.',
      loadingIssues: 'Loading...',
      reportModalTitle: 'Report Issue',
      cancelBtn: 'Cancel',
      reportReasonLabel: 'Reason',
      reportReasons: {
        personal_info: 'Contains personal information (names / IDs)',
        spam: 'Spam',
        harassment: 'Offensive or abusive',
        off_topic: 'Off-topic',
        other: 'Other'
      },
      reportDetailsLabel: 'Note (optional)',
      reportSubmitBtn: 'Report',
      footerAnonymous: 'Anonymous feedback',
      footerPrivacy: 'Privacy Policy',
      messages: {
        ISSUE_SUBMITTED: 'Posted successfully.',
        ISSUE_DELETED: 'Post deleted.',
        DELETE_WINDOW_EXPIRED: 'The 1-hour delete window has ended.',
        FORBIDDEN_NOT_AUTHOR: 'Only the browser that posted this issue can delete it within 1 hour.',
        ALREADY_VOTED: 'Already voted from this browser.',
        REPORT_SUBMITTED: 'Reported to moderator.',
        TITLE_TOO_LONG: 'Title must be under 140 characters.',
        DESCRIPTION_REQUIRED: 'Please write your issue first.',
        DESCRIPTION_TOO_SHORT: 'Please write a few more words.',
        DESCRIPTION_TOO_LONG: 'Issue must be under 2000 characters.',
        PII_DETECTED: 'Please remove emails, phone numbers, or student IDs.',
        DUPLICATE_SUBMISSION: 'Already submitted.',
        RATE_LIMITED: 'Too many requests. Try again shortly.',
        SERVER_ERROR: 'Could not reach server. Please try again.'
      }
    },
    'zh-CN': {
      appTitle: '学生之声',
      appSubtitle: 'UWE 数据科学与人工智能 · 学生分享需要改进的地方',
      themeLight: '浅色',
      themeDark: '深色',
      themeSystem: '系统',
      titlePlaceholder: '标题（选填）',
      descriptionPlaceholder: '请直接写下您遇到的问题或建议...',
      composerMutedNote: '匿名参与 · 无需登录 · 请勿包含姓名或学号',
      submitBtn: '提交',
      submittingBtn: '提交中...',
      sortMostVoted: '最热',
      sortNewest: '最新',
      issuesCount: (n) => `共 ${n} 条`,
      voteAriaLabel: '赞同此问题',
      votedAriaLabel: '已赞同',
      undoVoteAriaLabel: '取消赞同',
      undoVoteTooltip: '点击取消赞同',
      deleteAriaLabel: '删除',
      deleteModalTitle: '确定要删除这条内容吗？',
      deleteModalBody:
        '确定要永久删除这条内容吗？删除后无法恢复。请注意：您仅在发布后的 1 小时内可以删除该内容，超过 1 小时后将无法移除。',
      deleteConfirmBtn: '确认删除',
      deletingBtn: '删除中...',
      reportBtn: '举报',
      reportedDone: '已举报',
      emptyState: '暂无反馈，欢迎在上方直接写下第一条建议。',
      loadingIssues: '加载中...',
      reportModalTitle: '举报不当内容',
      cancelBtn: '取消',
      reportReasonLabel: '原因',
      reportReasons: {
        personal_info: '包含个人隐私信息（姓名/学号）',
        spam: '垃圾广告',
        harassment: '不当言论',
        off_topic: '无关内容',
        other: '其他'
      },
      reportDetailsLabel: '补充说明（选填）',
      reportSubmitBtn: '提交举报',
      footerAnonymous: '匿名反馈',
      footerPrivacy: '隐私政策',
      messages: {
        ISSUE_SUBMITTED: '发布成功。',
        ISSUE_DELETED: '已删除。',
        DELETE_WINDOW_EXPIRED: '已超过 1 小时可删除时间。',
        FORBIDDEN_NOT_AUTHOR: '仅原提交浏览器可在 1 小时内删除。',
        ALREADY_VOTED: '当前浏览器已投过票。',
        REPORT_SUBMITTED: '已提交给管理员。',
        TITLE_TOO_LONG: '标题不能超过 140 个字符。',
        DESCRIPTION_REQUIRED: '请先输入您的问题或建议。',
        DESCRIPTION_TOO_SHORT: '请稍微多写几个字。',
        DESCRIPTION_TOO_LONG: '内容不能超过 2000 个字符。',
        PII_DETECTED: '请移除邮箱、电话号码或学号后再提交。',
        DUPLICATE_SUBMISSION: '刚刚已提交过相同内容。',
        RATE_LIMITED: '请求过于频繁，请稍后再试。',
        SERVER_ERROR: '连接失败，请重试。'
      }
    }
  };

  const STORAGE_KEY = 'sv_lang';

  function detectInitialLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'zh-CN') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }

    const navLangs =
      Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language || 'en'];

    const primary = String(navLangs[0] || '').toLowerCase();
    if (primary.startsWith('zh')) {
      return 'zh-CN';
    }
    return 'en';
  }

  function setStoredLanguage(lang) {
    const normalized = lang === 'zh-CN' ? 'zh-CN' : 'en';
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
    document.documentElement.lang = normalized;
    return normalized;
  }

  function formatDate(isoString, lang) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return isoString;
      const locale = lang === 'zh-CN' ? 'zh-CN' : 'en-GB';
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return isoString;
    }
  }

  window.SV_I18N = {
    DICTIONARY,
    detectInitialLanguage,
    setStoredLanguage,
    formatDate
  };
})();
