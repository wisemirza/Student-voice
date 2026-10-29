(function () {
  const { detectInitialLanguage, setStoredLanguage } = window.SV_I18N;
  let lang = detectInitialLanguage();

  const COPY = {
    en: {
      title: 'Privacy Notice',
      back: '← Back',
      lastUpdated: 'Last updated: 29 October 2026',
      intro: 'Student Voice is a student-led feedback tool for students on the UWE Bristol Data Science and Artificial Intelligence programme. This notice explains what information the website processes, why it is used, which service providers may receive it, how long it is kept and what choices and rights you have.',
      analyticsLabel: 'Allow anonymous usage analytics (Umami Cloud)',
      analyticsDesc: 'You can object to optional website analytics at any time. When disabled, the tracking script stops collecting anonymous page views on this device.',
      analyticsStatusEnabled: 'Status: Analytics Active',
      analyticsStatusDisabled: 'Status: Analytics Opted-Out',
      sections: [
        {
          num: '1',
          title: 'Who operates Student Voice?',
          html: `<p>Student Voice is a bilingual feedback website intended to help students on the UWE Bristol Data Science and Artificial Intelligence programme raise course-level concerns, suggest improvements and vote on issues they agree with.</p>
<p><strong>Data controller:</strong> Mohammad Waiz Mirza</p>
<p><strong>Contact:</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>Student Voice is a student-led feedback tool. It must not be presented as an officially operated or endorsed UWE Bristol service unless this has been confirmed by the University or The Students' Union at UWE.</p>
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
<p>The website issues a random, signed, HTTP-only browser cookie called <code>sv_voter_token</code>. The server uses a cryptographic hash of this token to associate votes with a browser and, for a limited period (1 hour), allow the original submitter to delete their own issue.</p>
<p>The raw voter token is not intentionally stored in the database. The associated hashes are pseudonymous identifiers, however, and may still constitute personal data under data protection law. This system identifies a browser token, not a verified individual, and cannot guarantee one vote per person across different devices or after browser data is cleared.</p>
<p>A separate administrator session cookie is used to protect moderation functions. It is intended for authorised moderators, not ordinary students.</p>
<p><strong>Technical and preference information</strong></p>
<p>The hosting and server infrastructure may process technical request information, including IP addresses, browser information, timestamps and security-related logs. The website may use browser storage to remember your language preference. The operating system's theme preference may also be used to display the site correctly.</p>
<p>We do not ask visitors to supply personal profiles, nationality, demographic information or contact details.</p>`
        },
        {
          num: '3',
          title: 'Please do not include personal or confidential information',
          html: `<p>Student Voice is intended for course-level feedback, not individual casework or confidential complaints.</p>
<p>Do not include your name, student number, email address, phone number, passwords, or information that identifies another student or member of staff. Avoid including sensitive personal information about yourself or other people, including health details or other private circumstances.</p>
<p>The website has checks intended to detect certain common forms of personal information, such as email addresses, phone numbers and student IDs. These checks are not perfect and cannot guarantee that all identifying information will be detected.</p>
<p>Submitted issues are normally visible to other visitors. Anyone who can access the website may be able to read the text and view its vote count. Please write your feedback on the assumption that it may be read by classmates and relevant course staff.</p>`
        },
        {
          num: '4',
          title: 'Why do we use this information?',
          html: `<p>We use the information to:</p>
<ul>
  <li>Display student concerns and suggestions.</li>
  <li>Count and rank votes so recurring concerns can be prioritised.</li>
  <li>Help the student representative understand course-level feedback and, where appropriate, communicate issues or summaries to relevant university staff.</li>
  <li>Provide English and Simplified Chinese translations.</li>
  <li>Prevent spam, duplicate submissions, abuse and unauthorised access.</li>
  <li>Review reports, hide inappropriate content and moderate the feedback board.</li>
  <li>Operate, maintain and improve the reliability and usability of the website.</li>
</ul>
<p>We do not sell feedback, use it for advertising, or intentionally build profiles of individual students. Voting totals are used to rank issues; they are not used to make automated decisions with legal or similarly significant effects on individuals.</p>
<h3>Our lawful basis</h3>
<p>The basis for operating an independently controlled feedback service is legitimate interests under Article 6(1)(f) of the UK GDPR: providing a useful feedback channel, identifying recurring course-level concerns, maintaining service security and preventing abuse.</p>
<p>If UWE Bristol or The Students' Union at UWE determines the purposes and means of this processing, the appropriate controller and lawful basis will instead be confirmed with the relevant institution.</p>
<p>For personal data processed through analytics, the lawful basis is legitimate interests under Article 6(1)(f) and satisfies applicable requirements under the Privacy and Electronic Communications Regulations (PECR).</p>`
        },
        {
          num: '5',
          title: 'Machine translation and external services',
          html: `<h3>Machine translation</h3>
<p>The website supports English and Simplified Chinese. When a translation is needed and no cached translation is available, the server sends the relevant issue title and description to the <strong>MyMemory translation API</strong> at <code>api.mymemory.translated.net</code> to obtain a machine translation.</p>
<p>The translation is returned to the server and may be cached in the application's Firestore database. The original submission is retained separately.</p>
<p>This means that issue text is not processed exclusively within Student Voice's own database. MyMemory receives the text and associated technical request information and processes the request under its own terms and privacy practices: <a href="https://mymemory.translated.net/terms-and-conditions" target="_blank" rel="noopener">https://mymemory.translated.net/terms-and-conditions</a></p>
<p>Do not submit confidential or identifying details on the assumption that text will never leave Student Voice. Machine translations may also contain errors.</p>
<h3>Hosting and storage</h3>
<p>The website is hosted using Netlify, including its serverless API functions. Feedback, votes, reports and cached translations are stored through Google Firebase Cloud Firestore. The configured Firestore database region is <code>europe-west2</code> (London, UK).</p>
<p>These providers may process information necessary to host the site, execute its API, store its records, maintain security and diagnose technical problems. Their applicable data-processing terms and safeguards govern those services.</p>
<h3>Website analytics</h3>
<p>Student Voice uses <strong>Umami Cloud</strong> for aggregate website analytics. The current integration is intended to measure website usage, rather than record individual sessions.</p>
<p>The analytics may include page views, referring URLs, browser and operating-system categories, device type and country of origin. Umami states that its standard tracking script does not use cookies or track visitors across websites.</p>
<p>We do not intentionally send the contents of feedback submissions, voter-token hashes or report details to Umami as analytics events. No session-replay functionality is configured.</p>
<p>Umami's documentation: <a href="https://docs.umami.is/docs/faq" target="_blank" rel="noopener">https://docs.umami.is/docs/faq</a></p>
<div id="analytics-ui-slot"></div>
<p>The use of aggregate analytics complies with relevant UK data protection and PECR requirements.</p>
<h3>Fonts and browser requests</h3>
<p>The website currently loads interface fonts from Google Fonts. As a result, a request for font files may be sent to Google, which may receive the technical information normally associated with that request. This external resource is used to display the website consistently.</p>
<p>The website may also generate routine technical logs through its hosting and infrastructure providers.</p>`
        },
        {
          num: '6',
          title: 'Cookies and browser storage',
          html: `<p>Student Voice uses the following browser storage for service functionality:</p>
<ul>
  <li><strong><code>sv_voter_token</code>:</strong> a random, signed, HTTP-only cookie used to maintain the browser's anonymous voting token. The current configuration sets an expiry of up to 365 days.</li>
  <li><strong><code>sv_admin_session</code>:</strong> a secure, HTTP-only session cookie for the administrator console, with an expiry of up to eight hours.</li>
  <li><strong>Language preference:</strong> browser storage may remember your selected language so that it persists between visits.</li>
</ul>
<p>These mechanisms are used for voting, security, moderation or user preferences. They are not intended for advertising or cross-site tracking.</p>
<p>Umami's standard tracking script does not use cookies, according to its documentation. Nevertheless, its analytics processing is described above, and visitors can easily object to tracking using the Analytics preferences control above.</p>`
        },
        {
          num: '7',
          title: 'Who can see or receive the information?',
          html: `<p>Information may be processed by:</p>
<ul>
  <li>The Student Voice operator and authorised moderators, for the purpose of running the feedback service.</li>
  <li>Other website visitors, who can view active public issues and their vote counts.</li>
  <li>Relevant university staff, where the student representative shares feedback or summaries to raise course-level concerns.</li>
  <li>Netlify, for hosting, server execution and associated technical operations.</li>
  <li>Google Firebase / Google Cloud, for database storage and related infrastructure.</li>
  <li>MyMemory, when a translation is requested by the application's translation logic.</li>
  <li>Umami Cloud, for website analytics.</li>
  <li>Google, for delivery of the externally hosted fonts currently used by the website.</li>
</ul>
<p>We do not intentionally share identifiable voter records with teaching staff. Where feedback is shared with staff, the purpose is to communicate course-level concerns, preferably in a form that does not identify the submitter.</p>
<p>The configured Firestore database region does not mean all processing takes place in the UK. Other providers may process information in other locations under appropriate contractual and international safeguards.</p>`
        },
        {
          num: '8',
          title: 'How long is information retained?',
          html: `<p>The intended retention policy is:</p>
<ul>
  <li><strong>Issues and their associated votes, reports and cached translations:</strong> no longer than 365 days from the original issue's creation, unless an earlier deletion is appropriate or a specific legal requirement justifies a longer period.</li>
  <li><strong>Creator-token hashes:</strong> used only for the limited author self-deletion period (1 hour) and then cleared by the application logic.</li>
  <li><strong>Voter-token hashes and associated browser cookies:</strong> retained only for as long as necessary to operate voting security and meet the stated retention policy.</li>
  <li><strong>Administrator session cookie:</strong> up to eight hours.</li>
  <li><strong>Technical and provider logs:</strong> retained under the relevant provider's applicable retention arrangements.</li>
</ul>
<p>An issue may be hidden or removed by a moderator before the normal retention period if it contains spam, inappropriate content or personal information.</p>
<p>We may retain limited records for longer where required by law or where necessary to establish, exercise or defend legal claims.</p>`
        },
        {
          num: '9',
          title: 'How we protect the information',
          html: `<p>The application uses server-side validation, security cookies, hashed voter tokens, rate limits and protected moderation functions. Database access is restricted to the server-side application, and administrative actions require authentication.</p>
<p>These measures are intended to reduce unauthorised access and abuse. No website or internet transmission can be guaranteed completely secure.</p>
<p>If an issue is removed from public view, this does not necessarily mean that all copies in backups or provider systems are immediately erased.</p>`
        },
        {
          num: '10',
          title: 'Your data protection rights',
          html: `<p>Where the UK GDPR applies, you may have the right to:</p>
<ul>
  <li>Request access to your personal data.</li>
  <li>Request correction of inaccurate personal data.</li>
  <li>Request deletion of personal data in circumstances where the right applies.</li>
  <li>Request restriction of certain processing.</li>
  <li>Object to processing based on legitimate interests or, where applicable, public task.</li>
  <li>Exercise the right to data portability where it applies.</li>
  <li>Complain to the Information Commissioner's Office (ICO).</li>
</ul>
<p>These rights are subject to the conditions and exceptions set out in data protection law.</p>
<p>Because Student Voice does not use user accounts, you may need to provide enough information for the operator to locate the relevant record. Do not send passwords, voter tokens or unnecessary personal information with a request.</p>
<p>To exercise your rights or ask questions about privacy, contact:</p>
<p><strong>Privacy contact:</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>The controller will respond within the time required by applicable law. Requests will be handled securely and only the information reasonably needed to locate and assess the request will be sought.</p>
<p>You may also complain to the UK Information Commissioner's Office: <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">https://ico.org.uk/make-a-complaint/</a></p>`
        },
        {
          num: '11',
          title: 'Changes to this notice',
          html: `<p>This privacy notice may be updated when the website's features, service providers or data-processing practices change.</p>
<p>The date at the top of this notice identifies the latest revision. If a change materially affects how personal data is used, the controller will provide appropriate information about the change.</p>`
        },
        {
          num: '12',
          title: 'Contact',
          html: `<p>For privacy questions, access requests, deletion requests or complaints about this service, contact:</p>
<p><strong>Controller:</strong> Mohammad Waiz Mirza</p>
<p><strong>Email:</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>`
        }
      ]
    },
    'zh-CN': {
      title: '隐私声明',
      back: '← 返回',
      lastUpdated: '最后更新日期： 2026年10月29日',
      intro: '“学生之声”（Student Voice）是一个由学生主导的双语反馈工具，面向 UWE Bristol 数据科学与人工智能专业的学生。本声明说明网站处理哪些信息、处理目的、可能接收信息的服务提供商、数据保留期限，以及用户可以行使的权利。',
      analyticsLabel: '允许匿名使用分析（Umami Cloud）',
      analyticsDesc: '您可以随时反对可选的网站统计分析。禁用后，本设备上的跟踪脚本将停止收集匿名页面浏览信息。',
      analyticsStatusEnabled: '当前状态： 分析已启用',
      analyticsStatusDisabled: '当前状态： 分析已禁用（已退出）',
      sections: [
        {
          num: '1',
          title: '谁负责运营学生之声？',
          html: `<p>“学生之声”（Student Voice）是一个双语反馈网站，旨在帮助 UWE Bristol 数据科学与人工智能专业的学生提交课程相关意见、建议改进事项，并对自己认同的问题投票。</p>
<p><strong>数据控制者：</strong> Mohammad Waiz Mirza</p>
<p><strong>联系方式：</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>学生之声是一个以学生为主导的反馈工具。除非已获得大学或学生会的正式确认，否则不应将其描述为由 UWE Bristol 官方运营或认可的服务。</p>
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
<p>系统会向浏览器发放一个随机、带签名且仅限 HTTP 访问的安全 Cookie，名称为 <code>sv_voter_token</code>。服务器使用该令牌的加密哈希值关联投票，并在有限时间内（1小时）允许原提交者删除自己发布的问题。</p>
<p>原始投票令牌不会被有意存入数据库。但这些哈希值仍可能属于数据保护法律所指的假名化标识信息。该机制识别的是浏览器令牌，而非经过验证的个人；如果用户更换设备或清除浏览器数据，系统无法保证每个人只能投票一次。</p>
<p>管理员使用独立的会话 Cookie 保护审核功能，该 Cookie 仅供获授权的管理员使用。</p>
<p><strong>技术信息与偏好</strong></p>
<p>托管及服务器基础设施可能处理 IP 地址、浏览器信息、时间戳及安全日志等技术请求信息。网站也可能使用浏览器存储来记住您选择的语言，并根据操作系统主题偏好调整显示效果。</p>
<p>我们不会要求用户创建个人资料，也不会主动要求提供国籍、人口统计信息或联系方式。</p>`
        },
        {
          num: '3',
          title: '请勿提交个人或机密信息',
          html: `<p>学生之声旨在收集课程层面的反馈，而不是处理个人个案或机密投诉。</p>
<p>请勿提交您的姓名、学号、邮箱、电话号码、密码，或任何可以识别其他学生或教职员工的信息。请避免提交自己或他人的敏感个人信息，包括健康信息或其他私人情况。</p>
<p>网站设有检查机制，尝试识别部分常见个人信息，例如邮箱地址、电话号码和学号。但这些检查并不完美，不能保证发现所有身份识别信息。</p>
<p>提交的问题通常会公开显示。任何能够访问网站的人都可能阅读问题内容并查看投票数。请在提交前考虑，您的反馈可能会被同学及相关课程教职员工阅读。</p>`
        },
        {
          num: '4',
          title: '我们为什么使用这些信息？',
          html: `<p>我们使用相关信息来：</p>
<ul>
  <li>展示学生的问题和建议。</li>
  <li>统计及排列投票，以识别和优先处理反复出现的问题。</li>
  <li>帮助学生代表了解课程层面的反馈，并在适当情况下向相关大学教职员工传达问题或汇总意见。</li>
  <li>提供英文和简体中文翻译。</li>
  <li>防止垃圾信息、重复提交、滥用及未经授权的访问。</li>
  <li>审核举报、隐藏不当内容并管理反馈板。</li>
  <li>运营、维护并改善网站的可靠性和易用性。</li>
</ul>
<p>我们不会出售反馈内容，不会将其用于广告，也不会有意建立个别学生的行为档案。投票总数用于排列问题，并不会用于对个人作出具有法律或类似重大影响的自动化决定。</p>
<h3>合法处理依据</h3>
<p>本网站由个人独立控制，运营反馈服务的依据是 UK GDPR 第6(1)(f)条规定的合法利益，包括提供反馈渠道、识别课程层面反复出现的问题、维护服务安全和防止滥用。</p>
<p>如果 UWE Bristol 或 The Students' Union at UWE 决定了相关处理的目的和方式，则必须与相关机构确认正确的数据控制者及合法处理依据。</p>
<p>对于通过分析工具处理的任何个人数据，控制者依赖合法利益依据，并满足适用的《隐私与电子通信条例》（PECR）要求。</p>`
        },
        {
          num: '5',
          title: '机器翻译与外部服务',
          html: `<h3>机器翻译</h3>
<p>本网站支持英文和简体中文。当需要翻译且数据库中没有可用的缓存译文时，服务器会将相应问题的标题和正文发送至 <strong>MyMemory 翻译 API</strong>（<code>api.mymemory.translated.net</code>），以获取机器翻译结果。</p>
<p>译文会返回服务器，并可能缓存在应用的 Firestore 数据库中。原始提交内容会单独保留。</p>
<p>这意味着问题文本并非只在学生之声自身的数据库内处理。MyMemory 会接收文本及相关技术请求信息，并根据其自身条款和隐私惯例处理请求：<a href="https://mymemory.translated.net/terms-and-conditions" target="_blank" rel="noopener">https://mymemory.translated.net/terms-and-conditions</a></p>
<p>请勿在假设文本永远不会离开学生之声的情况下提交机密或可识别身份的信息。机器翻译也可能存在错误。</p>
<h3>托管与存储</h3>
<p>网站使用 Netlify 托管，包括其无服务器 API 函数。反馈、投票、举报和缓存译文通过 Google Firebase Cloud Firestore 存储。当前配置的 Firestore 数据库位于 <code>europe-west2</code>（英国伦敦）区域。</p>
<p>上述服务提供商可能为了托管网站、执行 API、存储记录、保障安全及排查技术问题而处理相关信息。其适用的数据处理条款及保障措施约束相应服务。</p>
<h3>网站分析</h3>
<p>学生之声使用 <strong>Umami Cloud</strong> 进行汇总式网站分析。当前集成旨在衡量网站使用情况，而不是录制个人访问会话。</p>
<p>分析信息可能包括页面浏览量、来源网址、浏览器和操作系统类别、设备类型及访问来源国家。Umami 表示，其标准跟踪脚本不使用 Cookie，也不会跨网站跟踪访客。</p>
<p>我们不会有意将反馈正文、投票令牌哈希值或举报详情作为分析事件发送给 Umami。本网站未配置会话回放功能。</p>
<p>Umami 文档：<a href="https://docs.umami.is/docs/faq" target="_blank" rel="noopener">https://docs.umami.is/docs/faq</a></p>
<div id="analytics-ui-slot"></div>
<p>汇总分析的使用符合相应的英国数据保护及 PECR 要求。</p>
<h3>字体与浏览器请求</h3>
<p>本网站目前使用 Google Fonts 加载界面字体。因此，浏览器请求字体文件时可能向 Google 发送请求，Google 可能接收与该请求相关的技术信息。该外部资源用于确保网站显示一致。</p>
<p>网站托管及基础设施提供商也可能生成常规技术日志。</p>`
        },
        {
          num: '6',
          title: 'Cookie 与浏览器存储',
          html: `<p>学生之声使用以下浏览器存储机制提供服务功能：</p>
<ul>
  <li><strong><code>sv_voter_token</code>：</strong> 随机、带签名且仅限 HTTP 访问的 Cookie，用于维持浏览器的匿名投票令牌。当前配置的有效期最长为365天。</li>
  <li><strong><code>sv_admin_session</code>：</strong> 管理员控制台使用的安全会话 Cookie，有效期最长为八小时。</li>
  <li><strong>语言偏好：</strong> 浏览器存储可能记住您选择的语言，以便下次访问时继续使用。</li>
</ul>
<p>这些机制用于投票、安全、管理或用户偏好，不用于广告或跨网站跟踪。</p>
<p>根据 Umami 的文档，其标准跟踪脚本不使用 Cookie。不过，本网站仍须说明相关分析处理；用户可通过上方的分析偏好设置控件随时退出该处理。</p>`
        },
        {
          num: '7',
          title: '谁可以查看或接收这些信息？',
          html: `<p>信息可能由以下对象处理：</p>
<ul>
  <li>学生之声运营者及获授权的管理员，用于运营反馈服务。</li>
  <li>其他网站访客，他们可以查看公开问题及其投票数。</li>
  <li>相关大学教职员工，在学生代表分享反馈或汇总意见、提出课程层面问题时接收相关信息。</li>
  <li>Netlify，用于网站托管、服务器运行及相关技术操作。</li>
  <li>Google Firebase / Google Cloud，用于数据库存储及相关基础设施。</li>
  <li>MyMemory，在应用翻译逻辑需要翻译时接收问题文本。</li>
  <li>Umami Cloud，用于网站分析。</li>
  <li>Google，用于提供当前使用的外部字体。</li>
</ul>
<p>我们不会有意向教学人员分享可识别投票者身份的记录。向教职员工分享反馈时，目的是传达课程层面的问题，并尽可能避免识别提交者。</p>
<p>Firestore 配置区域并不意味着所有处理都发生在英国。其他服务提供商可能在其他地区依适当保障措施处理信息。</p>`
        },
        {
          num: '8',
          title: '信息保留多久？',
          html: `<p>拟定的数据保留政策如下：</p>
<ul>
  <li><strong>问题及关联投票、举报和缓存译文：</strong> 自问题创建之日起最长保留365天，之后删除；如有提前删除的适当理由或特定法律要求需要延长保留期限，则按实际情况处理。</li>
  <li><strong>创建者令牌哈希值：</strong> 仅在有限的作者自助删除期限内使用（1小时），之后由当前应用逻辑清除。</li>
  <li><strong>投票令牌哈希值及相关浏览器 Cookie：</strong> 仅在运营投票安全及满足规定保留期限所需的时间内保留。</li>
  <li><strong>管理员会话 Cookie：</strong> 最长八小时。</li>
  <li><strong>技术日志和服务提供商日志：</strong> 按相关提供商适用的保留安排处理。</li>
</ul>
<p>如果问题包含垃圾信息、不当内容或个人信息，管理员可以在正常保留期限前将其隐藏或删除。</p>
<p>在法律要求或为确立、行使或抗辩法律主张所必需时，我们可能保留少量相关记录。任何延长保留均须有合理依据，并限于所需目的。</p>`
        },
        {
          num: '9',
          title: '我们如何保护信息？',
          html: `<p>应用使用服务器端验证、安全 Cookie、哈希化投票令牌、速率限制及受保护的管理功能，以减少未经授权的访问和滥用。</p>
<p>这些措施旨在降低风险，但不能保证网站或互联网传输绝对安全。</p>
<p>从公开页面移除某个问题，并不一定意味着备份或服务提供商系统中的所有副本会立即删除。</p>`
        },
        {
          num: '10',
          title: '您的数据保护权利',
          html: `<p>在 UK GDPR 适用的情况下，您可能有权：</p>
<ul>
  <li>请求访问您的个人数据。</li>
  <li>请求更正不准确的个人数据。</li>
  <li>在法律规定适用的情况下请求删除个人数据。</li>
  <li>请求限制某些处理活动。</li>
  <li>在处理依据为合法利益或适用的公共任务时提出反对。</li>
  <li>在适用情况下行使数据可携权。</li>
  <li>向英国信息专员办公室（ICO）投诉。</li>
</ul>
<p>这些权利须遵循数据保护法律中的条件及例外。</p>
<p>由于学生之声不使用用户账户，运营者可能需要您提供足够的信息来定位相关记录。提交请求时请勿发送密码、投票令牌或不必要的个人信息。</p>
<p>如需行使权利或咨询隐私问题，请联系：</p>
<p><strong>隐私联系人：</strong> <a href="mailto:Mohammad2.Mirza@live.uwe.ac.uk">Mohammad2.Mirza@live.uwe.ac.uk</a></p>
<p>控制者将按照适用法律规定的期限回复。请求将得到安全处理，运营者只会要求合理定位和评估请求所需的信息。</p>
<p>您也可以向英国信息专员办公室投诉：<a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">https://ico.org.uk/make-a-complaint/</a></p>`
        },
        {
          num: '11',
          title: '本声明的变更',
          html: `<p>当网站功能、服务提供商或数据处理方式发生变化时，本隐私声明可能会更新。</p>
<p>本声明顶部的日期表示最近一次修订日期。如果重大变更影响个人数据的使用，控制者将提供适当的信息说明相关变化。</p>`
        },
        {
          num: '12',
          title: '联系方式',
          html: `<p>如有隐私问题、访问请求、删除请求或对本服务的投诉，请联系：</p>
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

  function buildAnalyticsControl(c) {
    const isOptedOut = localStorage.getItem('umami.disabled') === '1';

    const box = document.createElement('div');
    box.className = 'analytics-control-box';

    const label = document.createElement('label');
    label.className = 'analytics-control-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'analytics-toggle-input';
    checkbox.checked = !isOptedOut;

    const span = document.createElement('span');
    span.textContent = c.analyticsLabel;

    label.appendChild(checkbox);
    label.appendChild(span);

    const desc = document.createElement('p');
    desc.className = 'analytics-control-desc';
    desc.textContent = c.analyticsDesc;

    const statusPill = document.createElement('div');
    statusPill.style.margin = '0.55rem 0 0 1.85rem';
    statusPill.style.fontSize = '0.78rem';
    statusPill.style.fontWeight = '600';
    statusPill.style.color = !isOptedOut ? 'var(--brand-accent)' : 'var(--text-secondary)';
    statusPill.textContent = !isOptedOut ? c.analyticsStatusEnabled : c.analyticsStatusDisabled;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        localStorage.removeItem('umami.disabled');
        statusPill.style.color = 'var(--brand-accent)';
        statusPill.textContent = c.analyticsStatusEnabled;
      } else {
        localStorage.setItem('umami.disabled', '1');
        statusPill.style.color = 'var(--text-secondary)';
        statusPill.textContent = c.analyticsStatusDisabled;
      }
    });

    box.appendChild(label);
    box.appendChild(desc);
    box.appendChild(statusPill);
    return box;
  }

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

      const slot = sectionDiv.querySelector('#analytics-ui-slot');
      if (slot) {
        slot.replaceWith(buildAnalyticsControl(c));
      }
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
