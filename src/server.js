require('dotenv').config();
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');

const db = require('./db');
const {
  VOTER_COOKIE_NAME,
  ADMIN_COOKIE_NAME,
  hashToken,
  getOrCreateVoterToken,
  verifyAdminPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  requireAdmin,
  validateIssueInput,
  validateReportInput,
  assertProductionSecurityConfig
} = require('./security');
const {
  isTranslationConfigured,
  detectSourceLanguage,
  translateIssue,
  localizeIssuesList
} = require('./translate');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Normalize Netlify function path prefix if routed directly or through redirects
  app.use((req, res, next) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace(/^\/\.netlify\/functions\/api/, '');
      if (!req.url.startsWith('/api')) {
        req.url = '/api' + req.url;
      }
    }
    next();
  });

  // Ensure security configuration and database are initialized before handling requests
  app.use(async (req, res, next) => {
    try {
      assertProductionSecurityConfig();
      await db.initDb();
      next();
    } catch (err) {
      console.error('Initialization error:', err.message);
      res.status(500).json({
        error: 'SERVER_CONFIGURATION_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'Server configuration error. Please ensure required environment variables are set.'
            : err.message
      });
    }
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ['https://challenges.cloudflare.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  const cookieSecret =
    process.env.COOKIE_SECRET || 'dev-fallback-secret-change-in-production-uwe-dsai-2026';
  app.use(cookieParser(cookieSecret));

  const isTest = process.env.NODE_ENV === 'test';

  // Key on voter token (with IP fallback) so students sharing university/NAT Wi-Fi
  // do not exhaust each other's rate limits
  const getStudentRateLimitKey = (req) => {
    const raw = req.signedCookies && req.signedCookies[VOTER_COOKIE_NAME];
    return raw ? hashToken(raw) : req.ip;
  };

  const issueSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 200 : 15,
    keyGenerator: getStudentRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message: 'Too many submissions. Please wait a few minutes and try again.'
    }
  });

  const voteLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: isTest ? 500 : 120,
    keyGenerator: getStudentRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.'
    }
  });

  const reportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 200 : 20,
    keyGenerator: getStudentRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message: 'Too many report requests. Please try again later.'
    }
  });

  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 100 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message: 'Too many login attempts. Please wait 15 minutes.'
    }
  });

  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir, { index: false }));

  app.get('/', (req, res) => {
    getOrCreateVoterToken(req, res);
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.get('/privacy', (req, res) => {
    res.sendFile(path.join(publicDir, 'privacy.html'));
  });

  app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'admin.html'));
  });

  app.get('/api/config', (req, res) => {
    getOrCreateVoterToken(req, res);
    res.json({
      translationConfigured: isTranslationConfigured(),
      dbEngine: db.getEngineName(),
      deleteWindowMinutes: Math.round(db.getDeleteWindowMs() / 60000)
    });
  });

  // List active issues, automatically localized into `lang` ('en' or 'zh-CN') when requested
  app.get('/api/issues', async (req, res) => {
    try {
      const rawToken = getOrCreateVoterToken(req, res);
      const voterTokenHash = hashToken(rawToken);
      const sort = req.query.sort === 'newest' ? 'newest' : 'popular';
      const lang =
        req.query.lang === 'zh-CN' ? 'zh-CN' : req.query.lang === 'en' ? 'en' : null;

      let issues = await db.listPublicIssues({
        sort,
        voterTokenHash
      });

      if (lang) {
        issues = await localizeIssuesList(issues, lang);
      }

      res.json({ issues, sort, lang });
    } catch (err) {
      console.error('Error fetching issues:', err.message);
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Failed to load issues.'
      });
    }
  });

  // Submit a new issue anonymously (title optional, plain description required)
  app.post('/api/issues', issueSubmitLimiter, async (req, res) => {
    try {
      const rawToken = getOrCreateVoterToken(req, res);
      const creatorTokenHash = hashToken(rawToken);

      const validation = validateIssueInput(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.code,
          piiType: validation.piiType || null,
          message: validation.message
        });
      }

      const issue = await db.createIssue({
        title: validation.data.title,
        description: validation.data.description,
        creatorTokenHash
      });

      // Pre-warm counterpart translation asynchronously in the background
      if (isTranslationConfigured()) {
        const srcLang = detectSourceLanguage(`${issue.title} ${issue.description}`);
        const counterpartLang = srcLang === 'zh-CN' ? 'en' : 'zh-CN';
        translateIssue(issue, counterpartLang).catch(() => {});
      }

      res.status(201).json({ issue });
    } catch (err) {
      if (err.code === 'DUPLICATE_SUBMISSION') {
        return res.status(409).json({
          error: 'DUPLICATE_SUBMISSION',
          message: 'This issue was just submitted.'
        });
      }
      console.error('Error creating issue:', err.message);
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Could not save your issue. Please try again.'
      });
    }
  });

  // Allow the original author to delete their own issue within the limited time window (default 1 hour)
  app.delete('/api/issues/:id', voteLimiter, async (req, res) => {
    try {
      const rawToken = getOrCreateVoterToken(req, res);
      const voterTokenHash = hashToken(rawToken);
      const issueId = Number(req.params.id);

      const result = await db.deleteOwnIssue({
        issueId,
        voterTokenHash
      });

      res.status(200).json(result);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Issue not found.' });
      }
      if (err.code === 'FORBIDDEN_NOT_AUTHOR' || err.code === 'DELETE_WINDOW_EXPIRED') {
        return res.status(403).json({ error: err.code, message: err.message });
      }
      console.error('Error deleting issue:', err.message);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not delete issue.' });
    }
  });

  // Vote on an issue anonymously (or retract if action is unvote/undo)
  app.post('/api/issues/:id/vote', voteLimiter, async (req, res) => {
    try {
      const rawToken = getOrCreateVoterToken(req, res);
      const voterTokenHash = hashToken(rawToken);
      const issueId = Number(req.params.id);
      const action = req.body && req.body.action;

      if (action === 'unvote' || action === 'undo') {
        const unvoteResult = await db.retractVote({
          issueId,
          voterTokenHash
        });
        return res.status(200).json({
          issue_id: unvoteResult.issueId,
          vote_count: unvoteResult.voteCount,
          has_voted: false
        });
      }

      const voteResult = await db.castVote({
        issueId,
        voterTokenHash
      });

      res.status(200).json({
        issue_id: voteResult.issueId,
        vote_count: voteResult.voteCount,
        has_voted: voteResult.hasVoted,
        already_voted: voteResult.alreadyVoted
      });
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Issue not found.'
        });
      }
      console.error('Error casting vote:', err.message);
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Could not record vote.'
      });
    }
  });

  // Undo / retract a vote anonymously
  app.delete('/api/issues/:id/vote', voteLimiter, async (req, res) => {
    try {
      const rawToken = getOrCreateVoterToken(req, res);
      const voterTokenHash = hashToken(rawToken);
      const issueId = Number(req.params.id);

      const unvoteResult = await db.retractVote({
        issueId,
        voterTokenHash
      });

      res.status(200).json({
        issue_id: unvoteResult.issueId,
        vote_count: unvoteResult.voteCount,
        has_voted: false
      });
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Issue not found.'
        });
      }
      console.error('Error retracting vote:', err.message);
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Could not undo vote.'
      });
    }
  });

  // Report an inappropriate or spam issue
  app.post('/api/issues/:id/report', reportLimiter, async (req, res) => {
    try {
      const rawToken = getOrCreateVoterToken(req, res);
      const reporterTokenHash = hashToken(rawToken);
      const issueId = Number(req.params.id);

      const validation = validateReportInput(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.code,
          message: validation.message
        });
      }

      await db.createReport({
        issueId,
        reporterTokenHash,
        reason: validation.data.reason,
        details: validation.data.details
      });

      res.status(200).json({ reported: true });
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Issue not found.'
        });
      }
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Could not submit report.'
      });
    }
  });

  // Direct translation endpoint
  app.post('/api/issues/:id/translate', voteLimiter, async (req, res) => {
    try {
      const issueId = Number(req.params.id);
      const targetLang = req.body && req.body.targetLang === 'zh-CN' ? 'zh-CN' : 'en';

      const issue = await db.getIssueById(issueId, '');
      if (!issue || issue.status !== 'active') {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }

      const translation = await translateIssue(issue, targetLang);
      res.status(200).json({ translation });
    } catch (err) {
      if (err.code === 'TRANSLATION_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'TRANSLATION_NOT_CONFIGURED' });
      }
      res.status(502).json({ error: 'TRANSLATION_FAILED' });
    }
  });

  // ==========================================================================
  // Moderation & Admin-Only Share/QR Endpoints
  // ==========================================================================

  app.get('/api/admin/session', (req, res) => {
    const token = req.signedCookies && req.signedCookies[ADMIN_COOKIE_NAME];
    const authenticated = verifyAdminSessionToken(token);
    const shareUrl =
      (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.trim()) ||
      `${req.protocol}://${req.get('host')}`;
    res.json({
      authenticated,
      ...(authenticated ? { shareUrl } : {})
    });
  });

  app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
    const password = req.body && req.body.password;
    if (!verifyAdminPassword(password)) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid moderator credentials.'
      });
    }

    const sessionToken = createAdminSessionToken();
    res.cookie(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      signed: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });

    const shareUrl =
      (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.trim()) ||
      `${req.protocol}://${req.get('host')}`;

    res.json({ authenticated: true, shareUrl });
  });

  app.post('/api/admin/logout', (req, res) => {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
    res.json({ authenticated: false });
  });

  app.get('/api/admin/qrcode', requireAdmin, async (req, res) => {
    try {
      const targetUrl =
        (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.trim()) ||
        `${req.protocol}://${req.get('host')}`;
      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 1,
        width: 240,
        color: {
          dark: '#14171A',
          light: '#FFFFFF'
        }
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(svg);
    } catch {
      res.status(500).json({ error: 'QR_GENERATION_FAILED' });
    }
  });

  app.get('/api/admin/issues', requireAdmin, async (req, res) => {
    try {
      const statusFilter = req.query.status || 'all';
      const issues = await db.listAdminIssues({ statusFilter });
      res.json({ issues });
    } catch (err) {
      console.error('Admin list error:', err.message);
      res.status(500).json({ error: 'SERVER_ERROR' });
    }
  });

  app.patch('/api/admin/issues/:id/status', requireAdmin, async (req, res) => {
    try {
      const issueId = Number(req.params.id);
      const status = req.body && req.body.status;
      const updated = await db.updateIssueStatus({ issueId, status });
      res.json({ updated });
    } catch (err) {
      if (err.code === 'INVALID_STATUS') {
        return res.status(400).json({ error: 'INVALID_STATUS' });
      }
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }
      res.status(500).json({ error: 'SERVER_ERROR' });
    }
  });

  app.post('/api/admin/issues/:id/resolve-reports', requireAdmin, async (req, res) => {
    try {
      const issueId = Number(req.params.id);
      await db.resolveReportsForIssue(issueId);
      res.json({ resolved: true });
    } catch {
      res.status(500).json({ error: 'SERVER_ERROR' });
    }
  });

  return app;
}

async function startServer(port = process.env.PORT || 3000) {
  const dbInfo = await db.initDb();
  const app = createApp();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const actualPort = server.address().port;
      console.log(
        `UWE Bristol Student Voice (${dbInfo.engine}) running at http://localhost:${actualPort}`
      );
      resolve({ app, server, port: actualPort });
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { createApp, startServer };
