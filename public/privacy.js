(function () {
  const { detectInitialLanguage, setStoredLanguage } = window.SV_I18N;
  let lang = detectInitialLanguage();

  const COPY = {
    en: {
      title: 'Privacy Policy',
      back: '← Back',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      sections: [
        {
          h: 'What is stored',
          p: 'Only the feedback text you submit, its creation timestamp, and its vote count are stored to help the UWE Bristol Data Science & AI Student Representative share course-level feedback with staff. No names, emails, student IDs, or personal profiles are collected.'
        },
        {
          h: 'How anonymous voting works',
          p: 'Your browser receives a random, signed HTTP-only security cookie. Only a cryptographic hash of that token is checked on the server so each browser can vote once per issue. Browser-based anonymous voting prevents accidental repeat votes and casual abuse, though it cannot guarantee one vote per individual if someone switches devices or clears cookies.'
        },
        {
          h: 'Retention & moderation',
          p: 'Submissions are retained for up to one academic year (365 days) and moderated solely to remove spam or accidental personal details. No third-party tracking or behavioural analytics are used.'
        }
      ]
    },
    'zh-CN': {
      title: '隐私政策',
      back: '← 返回',
      themeLight: '浅色',
      themeDark: '深色',
      themeSystem: '系统',
      sections: [
        {
          h: '存储的信息',
          p: '系统仅保存您提交的反馈文本、提交时间和赞同票数，用于帮助 UWE Bristol 数据科学与人工智能专业学生代表向学院反馈课程问题。我们不收集姓名、邮箱、学号或任何个人身份信息。'
        },
        {
          h: '匿名防刷票机制',
          p: '服务器会为浏览器发放一个随机加密签名的安全 Cookie，并在服务端仅校验其单向哈希值，使每个浏览器对同一问题限投一票。基于浏览器的匿名机制可防止误触重复投票与日常滥用，但若更换设备或清除浏览器数据，技术上无法绝对保证每人仅投一票。'
        },
        {
          h: '数据保留与审核',
          p: '反馈默认保留一学年（365 天），管理员仅在内容包含垃圾信息或意外泄露个人隐私时进行隐藏或移除。本站不加载任何第三方追踪分析脚本。'
        }
      ]
    }
  };

  const titleEl = document.getElementById('priv-title');
  const backEl = document.getElementById('priv-back-btn');
  const contentEl = document.getElementById('priv-content');
  const enBtn = document.getElementById('priv-en-btn');
  const zhBtn = document.getElementById('priv-zh-btn');

  function render() {
    const c = COPY[lang] || COPY.en;
    enBtn.classList.toggle('active', lang === 'en');
    zhBtn.classList.toggle('active', lang === 'zh-CN');
    titleEl.textContent = c.title;
    backEl.textContent = c.back;
    contentEl.innerHTML = '';

    c.sections.forEach((sec, idx) => {
      const h = document.createElement('h2');
      h.style.fontSize = '1rem';
      h.style.margin = idx === 0 ? '0 0 0.35rem' : '1.15rem 0 0.35rem';
      h.textContent = sec.h;

      const p = document.createElement('p');
      p.style.margin = '0';
      p.style.fontSize = '0.92rem';
      p.style.color = 'var(--text-secondary)';
      p.textContent = sec.p;

      contentEl.appendChild(h);
      contentEl.appendChild(p);
    });
  }

  enBtn.addEventListener('click', () => {
    lang = setStoredLanguage('en');
    render();
  });
  zhBtn.addEventListener('click', () => {
    lang = setStoredLanguage('zh-CN');
    render();
  });

  render();
})();
