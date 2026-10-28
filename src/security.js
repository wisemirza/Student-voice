const crypto = require('node:crypto');

const ALLOWED_REPORT_REASONS = [
  'personal_info',
  'spam',
  'harassment',
  'off_topic',
  'other'
];

const VOTER_COOKIE_NAME = 'sv_voter_token';
const ADMIN_COOKIE_NAME = 'sv_admin_session';

function getCookieSecret() {
  return process.env.COOKIE_SECRET || 'dev-fallback-secret-change-in-production-uwe-dsai-2026';
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'uwe-rep-admin-2026';
}

function assertProductionSecurityConfig() {
  if (process.env.NODE_ENV === 'production') {
    const cookieSecret = process.env.COOKIE_SECRET;
    if (
      !cookieSecret ||
      cookieSecret === 'dev-fallback-secret-change-in-production-uwe-dsai-2026' ||
      cookieSecret.trim().length < 16
    ) {
      throw new Error(
        'Production configuration error: COOKIE_SECRET must be configured with a strong secret in production.'
      );
    }
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (
      !adminPassword ||
      adminPassword === 'uwe-rep-admin-2026' ||
      adminPassword.trim().length < 8
    ) {
      throw new Error(
        'Production configuration error: ADMIN_PASSWORD must be configured with a strong password in production.'
      );
    }
  }
}

/**
 * Hash a raw token using HMAC-SHA256 with a server-side secret so raw cookie tokens
 * are never stored in the database.
 */
function hashToken(rawToken) {
  return crypto
    .createHmac('sha256', getCookieSecret())
    .update(String(rawToken))
    .digest('hex');
}

/**
 * Retrieve existing signed voter token from HttpOnly cookie, or issue a new one.
 */
function getOrCreateVoterToken(req, res) {
  let token = req.signedCookies && req.signedCookies[VOTER_COOKIE_NAME];
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(VOTER_COOKIE_NAME, token, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/'
    });
  }
  return token;
}

/**
 * Constant-time comparison of moderator password.
 */
function verifyAdminPassword(candidatePassword) {
  if (!candidatePassword || typeof candidatePassword !== 'string') {
    return false;
  }
  const expected = getAdminPassword();
  const a = crypto.createHash('sha256').update(candidatePassword).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Create a signed, time-limited admin session token.
 */
function createAdminSessionToken() {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 8 * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${issuedAt}.${expiresAt}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', getCookieSecret())
    .update(`admin:${payload}:${getAdminPassword()}`)
    .digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verify a signed admin session token.
 */
function verifyAdminSessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [issuedAtStr, expiresAtStr, nonce, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }
  const payload = `${issuedAtStr}.${expiresAtStr}.${nonce}`;
  const expectedSig = crypto
    .createHmac('sha256', getCookieSecret())
    .update(`admin:${payload}:${getAdminPassword()}`)
    .digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Express middleware to enforce administrator authentication.
 */
function requireAdmin(req, res, next) {
  const sessionToken = req.signedCookies && req.signedCookies[ADMIN_COOKIE_NAME];
  if (!verifyAdminSessionToken(sessionToken)) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Moderator authentication required.'
    });
  }
  next();
}

/**
 * Strip control characters and normalize whitespace.
 */
function cleanText(input, allowNewlines = false) {
  if (typeof input !== 'string') return '';
  let cleaned = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (allowNewlines) {
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  } else {
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');
  }
  return cleaned.trim();
}

/**
 * Detect accidental inclusion of email addresses, phone numbers, or 8-digit UWE student numbers.
 */
function containsPotentialPII(text) {
  if (!text) return false;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) return 'email';

  const phoneRegex = /(?:\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}\b/;
  if (phoneRegex.test(text)) return 'phone';

  const studentIdRegex = /\b(?:1[89]|2[0-9])\d{6}\b/;
  if (studentIdRegex.test(text)) return 'student_id';

  return false;
}

/**
 * Validate and sanitize issue submission input.
 * Title is optional; plain description is required.
 */
function validateIssueInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, code: 'INVALID_PAYLOAD', message: 'Invalid request payload.' };
  }

  // Honeypot anti-spam field: must be empty
  if (body.website_url && String(body.website_url).trim().length > 0) {
    return { valid: false, code: 'SPAM_DETECTED', message: 'Automated submission rejected.' };
  }

  const title = cleanText(body.title || '', false);
  const description = cleanText(body.description || '', true);

  if (title.length > 140) {
    return { valid: false, code: 'TITLE_TOO_LONG', message: 'Title must be 140 characters or fewer.' };
  }

  if (!description) {
    return { valid: false, code: 'DESCRIPTION_REQUIRED', message: 'Please enter your issue.' };
  }
  if (description.length < 4) {
    return { valid: false, code: 'DESCRIPTION_TOO_SHORT', message: 'Please write a little more detail.' };
  }
  if (description.length > 2000) {
    return { valid: false, code: 'DESCRIPTION_TOO_LONG', message: 'Issue must be 2000 characters or fewer.' };
  }

  const piiType = containsPotentialPII(`${title} ${description}`);
  if (piiType) {
    return {
      valid: false,
      code: 'PII_DETECTED',
      piiType,
      message: 'Please remove personal details (emails, phone numbers, or student IDs) before submitting.'
    };
  }

  return {
    valid: true,
    data: {
      title,
      description
    }
  };
}

/**
 * Validate and sanitize issue report input.
 */
function validateReportInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, code: 'INVALID_PAYLOAD', message: 'Invalid report payload.' };
  }
  const reason = cleanText(body.reason, false);
  const details = cleanText(body.details || '', true).slice(0, 500);

  if (!ALLOWED_REPORT_REASONS.includes(reason)) {
    return { valid: false, code: 'INVALID_REASON', message: 'Please select a valid report reason.' };
  }

  return {
    valid: true,
    data: {
      reason,
      details
    }
  };
}

module.exports = {
  ALLOWED_REPORT_REASONS,
  VOTER_COOKIE_NAME,
  ADMIN_COOKIE_NAME,
  hashToken,
  getOrCreateVoterToken,
  verifyAdminPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  requireAdmin,
  cleanText,
  containsPotentialPII,
  validateIssueInput,
  validateReportInput,
  assertProductionSecurityConfig
};
