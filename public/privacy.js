(function () {
  const { detectInitialLanguage, setStoredLanguage } = window.SV_I18N;
  let lang = detectInitialLanguage();

  const COPY = {
    en: {
      title: 'Privacy Notice',
      back: '← Back',
      lastUpdated: 'Last updated: 29 October 2026',
      intro: 'Student Voice is a student-led feedback tool for students on the UWE Bristol Data Science and Artificial Intelligence programme. This notice explains what information the website processes, why it is used, which service providers may receive it, how long it is kept and what choices and rights you have.',
      sections: [
        {
          num: '1',
          title: 'Who operates Student Voice?',
          html: `<p>Student Voice is a bilingual feedback website intended to help students on the UWE Bristol Data Science and Artificial Intelligence programme raise course-level concerns, suggest improvements and vote on issues they agree with.</p>
<p><strong>Data controller:</strong> Mohammad Waiz Mirza</p>
<p><strong>Contact:</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>Student Voice is a student-led feedback tool. It is not an officially operated or endorsed UWE Bristol service unless confirmed in writing by the University or The Students' Union at UWE.</p>
<p>This notice explains what information the website processes, why it is used, which service providers may receive it, how long it is kept and what choices and rights you have.</p>`
        },
        {
          num: '2',
          title: 'What information do we collect?',
          html: `<p>You do not need to register, create an account or provide your name, email address or student number to use Student Voice.</p>
<p>Depending on how you use the website, the following information may be processed:</p>
<p><strong>Feedback and voting</strong></p>
<ul>
  <li>The optional title and description of an issue you submit.</li>
  <li>The date and time the issue was submitted.</li>
  <li>Vote counts and records used to prevent the same browser token voting repeatedly on an issue.</li>
  <li>Reports submitted about inappropriate content, including the selected reason and any optional explanatory text.</li>
  <li>Machine-translated versions of issue titles and descriptions, which are cached to make the bilingual interface work efficiently.</li>
</ul>
<p><strong>Anonymous voting and security</strong></p>
<p>The website issues a random, signed, HTTP-only browser cookie called <code>sv_voter_token</code>. The server uses a cryptographic HMAC-SHA256 hash of this token to associate votes with a browser and, for a limited 1-hour window, allow the original submitter to delete their own issue.</p>
<p>The raw voter token is never stored in the database. The associated hashes are pseudonymous identifiers. This system identifies a browser token, not a verified individual, and cannot guarantee one vote per person across different devices or if browser cookies are cleared.</p>
<p>A separate administrator session cookie (<code>sv_admin_session</code>) is used to protect moderation functions. It is restricted to authorised moderators.</p>
<p><strong>Technical and preference information</strong></p>
<p>The hosting and server infrastructure may process technical request information, including IP addresses, browser information, timestamps and security-related logs. The website uses browser local storage to remember your language preference (<code>sv_lang</code>) and theme preference (<code>sv_theme</code>).</p>
<p>We do not ask visitors to supply personal profiles, nationality, demographic information or contact details.</p>`
        },
        {
          num: '3',
          title: 'Please do not include personal or confidential information',
          html: `<p>Student Voice is intended for course-level feedback, not individual casework or confidential complaints.</p>
<p>Do not include your name, student number, email address, phone number, passwords, or information that identifies another student or member of staff. Avoid including sensitive personal information about yourself or other people, including health details or other private circumstances.</p>
<p>The website includes automated checks intended to detect common forms of personal data, including email addresses, UK phone numbers, and UWE student IDs. These checks reject submissions containing detected personal details, but automated filters cannot guarantee that every form of identifying text will be caught.</p>
<p>Submitted issues are publicly visible to other visitors. Anyone who can access the website may read the text and view its vote count. Please write your feedback on the assumption that it may be read by classmates and course staff.</p>`
        },
        {
          num: '4',
          title: 'Why do we use this information?',
          html: `<p>We use the information to:</p>
<ul>
  <li>Display student concerns and suggestions publicly.</li>
  <li>Count and rank votes so recurring concerns can be prioritised.</li>
  <li>Help the student representative understand course-level feedback and communicate summaries to relevant university staff.</li>
  <li>Provide English and Simplified Chinese translations.</li>
  <li>Prevent spam, duplicate submissions, abuse and unauthorised access.</li>
  <li>Review reports, hide inappropriate content and moderate the feedback board.</li>
  <li>Operate, maintain and improve the reliability and usability of the website.</li>
</ul>
<p>We do not sell feedback, use it for advertising, or build profiles of individual students. Voting totals are used to rank issues; they are not used to make automated decisions with legal or significant effects on individuals.</p>
<h3>Our lawful basis</h3>
<p>The lawful basis for processing under Article 6(1)(f) of the UK GDPR is legitimate interests: providing an effective student feedback channel, identifying recurring course-level concerns, maintaining service security and preventing abuse.</p>`
        },
        {
          num: '5',
          title: 'Machine translation and external services',
          html: `<h3>Machine translation</h3>
<p>The website supports English and Simplified Chinese. When a translation is needed and no cached translation is available, the server sends the relevant issue title and description to the <strong>MyMemory translation API</strong> at <code>api.mymemory.translated.net</code> to obtain a machine translation.</p>
<p>The translation is returned to the server and cached in the application's Firestore database. The original submission is retained separately.</p>
<p>This means that issue text is sent to MyMemory and processed under its terms and privacy practices: <a href="https://mymemory.translated.net/terms-and-conditions" target="_blank" rel="noopener">https://mymemory.translated.net/terms-and-conditions</a>. Do not submit confidential details. Machine translations may also contain errors.</p>
<h3>Hosting and storage</h3>
<p>The website is hosted using Netlify, including its serverless API functions. Feedback, votes, reports and cached translations are stored securely in Google Firebase Cloud Firestore. The configured Firestore database region is <code>europe-west2</code> (London, UK).</p>
<h3>Website analytics</h3>
<p>Student Voice uses <strong>Umami Cloud</strong> for aggregate, privacy-focused website analytics. Umami's tracking script <strong>does not use cookies</strong>, does not collect personal identifiers, does not track visitors across websites, and does not record individual visitor sessions.</p>
<p>It measures only aggregate traffic metrics, such as page view counts, referrer sources, device categories, and country of origin. We do not transmit feedback content, voter tokens, or report details to Umami. If your browser sends a "Do Not Track" (DNT) header, the script respects it and stops collecting data.</p>
<p>Umami's privacy documentation: <a href="https://docs.umami.is/docs/faq" target="_blank" rel="noopener">https://docs.umami.is/docs/faq</a></p>
<h3>Fonts and browser requests</h3>
<p>The website loads interface fonts from Google Fonts. As a result, your browser requests font files from Google servers to display the interface typography consistently.</p>`
        },
        {
          num: '6',
          title: 'Cookies and browser storage',
          html: `<p>Student Voice uses the following browser storage for core service functionality:</p>
<ul>
  <li><strong><code>sv_voter_token</code>:</strong> A random, cryptographically signed, HTTP-only cookie used to maintain your browser's anonymous voting token and prevent duplicate votes. It has an expiry of up to 365 days.</li>
  <li><strong><code>sv_admin_session</code>:</strong> A secure, HTTP-only session cookie used exclusively for the administrator moderation console, with an expiry of up to eight hours.</li>
  <li><strong><code>sv_lang</code> &amp; <code>sv_theme</code>:</strong> Browser local storage keys used to remember your selected language (English or Chinese) and visual theme (light or dark) between visits.</li>
</ul>
<p>These mechanisms are used solely for voting integrity, security, moderation, and user preferences. They are never used for advertising or cross-site tracking. Umami analytics does not use cookies.</p>`
        },
        {
          num: '7',
          title: 'Who can see or receive the information?',
          html: `<p>Information may be processed by or shared with:</p>
<ul>
  <li>The Student Voice operator and authorised student moderators, for running and moderating the feedback board.</li>
  <li>Other website visitors, who can view active public issues and their vote counts.</li>
  <li>Relevant university staff, where the student representative shares feedback summaries to address course-level concerns. Identifiable voter tokens are never shared with teaching staff.</li>
  <li>Netlify, for web hosting, serverless API execution, and infrastructure logs.</li>
  <li>Google Firebase / Google Cloud, for database storage (London region).</li>
  <li>MyMemory, when a new machine translation is requested.</li>
  <li>Umami Cloud, for aggregate, cookie-free usage statistics.</li>
  <li>Google, for delivering interface fonts.</li>
</ul>`
        },
        {
          num: '8',
          title: 'How long is information retained?',
          html: `<p>The retention practices are:</p>
<ul>
  <li><strong>Feedback issues and vote counts:</strong> Retained on the feedback board for the active academic cohort, unless deleted by the author during the 1-hour self-deletion window or removed earlier by a course moderator.</li>
  <li><strong>Author creator hashes:</strong> Used solely during the 1-hour self-deletion window. Once the 1-hour window expires, the author association is automatically cleared from the server record.</li>
  <li><strong>Anonymous voter cookies:</strong> The browser's <code>sv_voter_token</code> cookie expires after up to 365 days.</li>
  <li><strong>Administrator session cookie:</strong> Expires after eight hours.</li>
  <li><strong>Technical hosting logs:</strong> Maintained temporarily by hosting providers (Netlify and Google Cloud) for routine security, performance, and diagnostics.</li>
</ul>`
        },
        {
          num: '9',
          title: 'How we protect the information',
          html: `<p>The application implements server-side validation, HTTP-only signed cookies, HMAC-SHA256 hashed voter identifiers, rate limiting, and authenticated moderation endpoints. Direct browser access to the database is disabled, and all transactions run through trusted server logic.</p>
<p>These safeguards are designed to prevent unauthorised access and spam. However, no internet transmission can be guaranteed completely secure.</p>`
        },
        {
          num: '10',
          title: 'Your data protection rights',
          html: `<p>Under the UK GDPR, you have rights regarding your personal data where applicable:</p>
<ul>
  <li>The right to request access to personal data held about you.</li>
  <li>The right to request correction of inaccurate data.</li>
  <li>The right to request deletion of your data where applicable.</li>
  <li>The right to object to processing based on legitimate interests.</li>
  <li>The right to complain to the Information Commissioner's Office (ICO).</li>
</ul>
<p>Because Student Voice does not use user accounts, you may need to provide sufficient context for the operator to locate the relevant submission. Do not send passwords or sensitive personal details in your request.</p>
<p>To exercise your rights or make privacy enquiries:</p>
<p><strong>Privacy contact:</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>You may also contact the UK Information Commissioner's Office: <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">https://ico.org.uk/make-a-complaint/</a></p>`
        },
        {
          num: '11',
          title: 'Changes to this notice',
          html: `<p>This privacy notice may be updated if features, service providers, or data practices change. The date at the top indicates the latest revision.</p>`
        },
        {
          num: '12',
          title: 'Contact',
          html: `<p>For privacy questions, access requests, or feedback regarding this service, contact:</p>
<p><strong>Data Controller:</strong> Mohammad Waiz Mirza</p>
<p><strong>Email:</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>`
        }
      ]
    },
    'zh-CN': {
      title: '隐私声明',
      back: '← 返回',
      lastUpdated: '最后更新日期： 2026年10月29日',
      intro: '“学生之声”（Student Voice）是一个由学生主导的双语反馈工具，面向 UWE Bristol 数据科学与人工智能专业的学生。本声明说明网站处理哪些信息、处理目的、可能接收信息的服务提供商、数据保留期限，以及用户可以行使的权利。',
      sections: [
        {
          num: '1',
          title: '谁负责运营学生之声？',
          html: `<p>“学生之声”（Student Voice）是一个双语反馈网站，旨在帮助 UWE Bristol 数据科学与人工智能专业的学生提交课程相关意见、建议改进事项，并对自己认同的问题投票。</p>
<p><strong>数据控制者：</strong> Mohammad Waiz Mirza</p>
<p><strong>联系方式：</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>学生之声是一个以学生为主导的反馈工具。除非获得大学或学生会的正式书面确认，否则不应将其视为由 UWE Bristol 官方运营或认可的服务。</p>
<p>本声明说明网站处理哪些信息、处理目的、可能接收信息的服务提供商、数据保留期限，以及用户可以行使的权利。</p>`
        },
        {
          num: '2',
          title: '我们会收集哪些信息？',
          html: `<p>您无需注册账户、创建个人资料，也无需提供姓名、邮箱或学号即可使用本网站。</p>
<p>根据您的使用方式，系统可能处理以下信息：</p>
<p><strong>反馈与投票</strong></p>
<ul>
  <li>您提交的可选标题和反馈正文。</li>
  <li>提交日期与时间。</li>
  <li>投票数量，以及用于防止同一浏览器令牌对同一问题重复投票的记录。</li>
  <li>对不当内容的举报，包括举报原因及可选说明。</li>
  <li>为实现中英文双语界面而缓存的机器翻译标题和正文。</li>
</ul>
<p><strong>匿名投票与安全信息</strong></p>
<p>系统会向浏览器发放一个随机、带签名且仅限 HTTP 访问的安全 Cookie，名称为 <code>sv_voter_token</code>。服务器使用该令牌的 HMAC-SHA256 加密哈希值关联投票，并在有限的1小时内允许原提交者删除自己发布的问题。</p>
<p>原始投票令牌绝不会存入数据库。关联的哈希值属于假名化标识符。该机制识别的是浏览器令牌，而非已验证身份的个人；如果更换设备或清除浏览器 Cookie，系统无法保证每人仅投一票。</p>
<p>管理员使用独立的会话 Cookie（<code>sv_admin_session</code>）保护审核功能，仅供获授权的管理员使用。</p>
<p><strong>技术信息与偏好</strong></p>
<p>托管及服务器基础设施可能处理 IP 地址、浏览器信息、时间戳及安全日志等技术请求信息。网站使用浏览器本地存储记住您的语言偏好（<code>sv_lang</code>）和主题偏好（<code>sv_theme</code>）。</p>
<p>我们不会要求用户创建个人资料，也不会主动要求提供国籍、人口统计信息或联系方式。</p>`
        },
        {
          num: '3',
          title: '请勿提交个人或机密信息',
          html: `<p>学生之声旨在收集课程层面的反馈，而不是处理个人个案或机密投诉。</p>
<p>请勿提交您的姓名、学号、邮箱、电话号码、密码，或任何可以识别其他学生或教职员工的信息。请避免提交自己或他人的敏感个人信息，包括健康信息或其他私人情况。</p>
<p>网站设有自动检查机制，识别常见的个人信息（包括邮箱地址、英国电话号码及 UWE 学号），并拦截包含上述信息的提交。但自动化检查无法保证发现所有形式的身份识别信息。</p>
<p>提交的问题会公开显示。任何能够访问网站的人都可能阅读内容并查看投票数。请在提交前考虑，您的反馈可能会被同学及相关课程教职员工阅读。</p>`
        },
        {
          num: '4',
          title: '我们为什么使用这些信息？',
          html: `<p>我们使用相关信息来：</p>
<ul>
  <li>公开展现学生的问题和建议。</li>
  <li>统计及排列投票，以识别和优先处理反复出现的问题。</li>
  <li>帮助学生代表了解课程层面的反馈，并在适当情况下向相关大学教职员工传达问题或汇总意见。</li>
  <li>提供英文和简体中文翻译。</li>
  <li>防止垃圾信息、重复提交、滥用及未经授权的访问。</li>
  <li>审核举报、隐藏不当内容并管理反馈板。</li>
  <li>运营、维护并改善网站的可靠性和易用性。</li>
</ul>
<p>我们不会出售反馈内容，不会将其用于广告，也不会有意建立个别学生的行为档案。投票总数用于排列问题，并不会用于对个人作出具有法律或类似重大影响的自动化决定。</p>
<h3>合法处理依据</h3>
<p>根据 UK GDPR 第6(1)(f)条，数据处理的合法依据为合法利益：提供有效的学生反馈渠道、识别课程层面反复出现的问题、维护服务安全并防止滥用。</p>`
        },
        {
          num: '5',
          title: '机器翻译与外部服务',
          html: `<h3>机器翻译</h3>
<p>本网站支持英文和简体中文。当需要翻译且数据库中没有可用的缓存译文时，服务器会将相应问题的标题和正文发送至 <strong>MyMemory 翻译 API</strong>（<code>api.mymemory.translated.net</code>），以获取机器翻译结果。</p>
<p>译文会返回服务器并缓存在 Firestore 数据库中。原始提交内容单独保留。</p>
<p>这意味着问题文本会发送至 MyMemory，并根据其条款和隐私惯例处理请求：<a href="https://mymemory.translated.net/terms-and-conditions" target="_blank" rel="noopener">https://mymemory.translated.net/terms-and-conditions</a>。请勿提交机密或可识别身份的信息。机器翻译也可能存在错误。</p>
<h3>托管与存储</h3>
<p>网站使用 Netlify 托管，包括其无服务器 API 函数。反馈、投票、举报和缓存译文安全存储在 Google Firebase Cloud Firestore 中。当前配置的数据库位于 <code>europe-west2</code>（英国伦敦）区域。</p>
<h3>网站分析</h3>
<p>学生之声使用 <strong>Umami Cloud</strong> 进行注重隐私的汇总式网站分析。Umami 跟踪脚本<strong>不使用 Cookie</strong>，不收集个人身份标识符，不跨网站跟踪访客，也不录制个人访问会话。</p>
<p>它仅衡量总体的访问指标（如页面浏览量、来源网址、设备类型及访问国家）。我们不会将反馈正文、投票令牌或举报详情发送至分析服务。如果您的浏览器启用了“Do Not Track”（DNT）不跟踪信号，该脚本会严格遵守并停止采集数据。</p>
<p>Umami 隐私文档：<a href="https://docs.umami.is/docs/faq" target="_blank" rel="noopener">https://docs.umami.is/docs/faq</a></p>
<h3>字体与浏览器请求</h3>
<p>本网站使用 Google Fonts 加载界面字体。因此，浏览器会向 Google 服务器请求字体文件，以保证文字排版显示一致。</p>`
        },
        {
          num: '6',
          title: 'Cookie 与浏览器存储',
          html: `<p>学生之声使用以下浏览器存储机制提供核心服务功能：</p>
<ul>
  <li><strong><code>sv_voter_token</code>：</strong> 随机、加密签名且仅限 HTTP 访问的安全 Cookie，用于维持浏览器的匿名投票令牌并防止重复投票。有效期最长为365天。</li>
  <li><strong><code>sv_admin_session</code>：</strong> 管理员控制台使用的安全会话 Cookie，有效期最长为八小时。</li>
  <li><strong><code>sv_lang</code> 与 <code>sv_theme</code>：</strong> 浏览器本地存储，用于在访问之间记住您选择的语言（英文或中文）及视觉主题（浅色或深色）。</li>
</ul>
<p>上述机制仅用于投票完整性、安全防刷、内容审核及用户偏好，绝不用于广告或跨网站跟踪。Umami 分析服务不使用 Cookie。</p>`
        },
        {
          num: '7',
          title: '谁可以查看或接收这些信息？',
          html: `<p>信息可能由以下对象处理或接收：</p>
<ul>
  <li>学生之声运营者及获授权的学生管理员，用于运营和审核反馈板。</li>
  <li>其他网站访客，可查看公开问题及其投票数。</li>
  <li>相关大学教职员工，在学生代表传达课程反馈摘要时接收相关信息。可识别的投票者令牌绝不会与教职员工分享。</li>
  <li>Netlify，用于网站托管、无服务器 API 运行及技术日志。</li>
  <li>Google Firebase / Google Cloud，用于数据库存储（英国伦敦区域）。</li>
  <li>MyMemory，在请求新机器翻译时接收文本。</li>
  <li>Umami Cloud，用于汇总式无 Cookie 访问统计。</li>
  <li>Google，用于提供界面字体。</li>
</ul>`
        },
        {
          num: '8',
          title: '信息保留多久？',
          html: `<p>实际的数据保留安排如下：</p>
<ul>
  <li><strong>反馈问题与投票计数：</strong> 在相关学年教学周期内保留在反馈板上，除非提交者在1小时内自主删除，或由管理员提前移除。</li>
  <li><strong>作者创建者哈希值：</strong> 仅在1小时作者自助删除期内使用。一旦超过1小时，服务器记录中的作者关联信息会自动清除。</li>
  <li><strong>匿名投票 Cookie：</strong> 浏览器中的 <code>sv_voter_token</code> Cookie 最长在365天后过期。</li>
  <li><strong>管理员会话 Cookie：</strong> 最长八小时后过期。</li>
  <li><strong>技术托管日志：</strong> 由托管服务商（Netlify 与 Google Cloud）依据常规安全和系统诊断安排临时保存。</li>
</ul>`
        },
        {
          num: '9',
          title: '我们如何保护信息？',
          html: `<p>应用实施服务器端输入验证、仅限 HTTP 签名的安全 Cookie、HMAC-SHA256 哈希化投票标识、请求速率限制以及经过身份验证的管理接口。浏览器无法直接访问数据库，所有数据写入均通过可信的服务器事务完成。</p>
<p>这些措施旨在防范未经授权的访问与滥用。但任何互联网传输均无法保证绝对安全。</p>`
        },
        {
          num: '10',
          title: '您的数据保护权利',
          html: `<p>在 UK GDPR 适用的情况下，您享有以下权利：</p>
<ul>
  <li>请求访问关于您的个人数据。</li>
  <li>请求更正不准确的数据。</li>
  <li>在适用情况下请求删除您的数据。</li>
  <li>在以合法利益为依据时提出反对。</li>
  <li>向英国信息专员办公室（ICO）提出投诉。</li>
</ul>
<p>由于学生之声不设用户账户，运营者可能需要您提供足够的信息以定位相关记录。提交请求时请勿发送密码或敏感个人信息。</p>
<p>如需行使权利或咨询隐私问题，请联系：</p>
<p><strong>隐私联系人：</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>您也可以向英国信息专员办公室投诉：<a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">https://ico.org.uk/make-a-complaint/</a></p>`
        },
        {
          num: '11',
          title: '本声明的变更',
          html: `<p>当网站功能、服务提供商或数据处理方式发生变化时，本隐私声明可能会相应更新。声明顶部的日期表示最近一次修订日期。</p>`
        },
        {
          num: '12',
          title: '联系方式',
          html: `<p>如有隐私问题、访问请求或对本服务的反馈，请联系：</p>
<p><strong>数据控制者：</strong> Mohammad Waiz Mirza</p>
<p><strong>邮箱：</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>`
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

    const headerEl = document.createElement('h1');
    headerEl.textContent = c.title;
    contentEl.appendChild(headerEl);

    const metaEl = document.createElement('div');
    metaEl.className = 'privacy-meta';
    metaEl.textContent = c.lastUpdated;
    contentEl.appendChild(metaEl);

    const introP = document.createElement('p');
    introP.style.fontSize = '0.96rem';
    introP.style.color = 'var(--text-primary)';
    introP.style.marginBottom = '1.2rem';
    introP.textContent = c.intro;
    contentEl.appendChild(introP);

    c.sections.forEach((sec) => {
      const h2 = document.createElement('h2');
      h2.textContent = sec.num + '. ' + sec.title;
      contentEl.appendChild(h2);

      const sectionDiv = document.createElement('div');
      sectionDiv.innerHTML = sec.html;
      contentEl.appendChild(sectionDiv);
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
