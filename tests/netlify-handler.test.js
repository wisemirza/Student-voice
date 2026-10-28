const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Netlify Function Handler - local simulation and routing tests', async (t) => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.SQLITE_DB_PATH = ':memory:';
  process.env.COOKIE_SECRET = 'test-secret-at-least-32-chars-for-netlify-testing-2026';
  process.env.ADMIN_PASSWORD = 'test-admin-password-2026';

  const { handler } = require('../netlify/functions/api');

  await t.test('GET /api/config returns 200 with JSON configuration', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/api/config',
      headers: { host: 'localhost' },
      requestContext: {}
    };
    const response = await handler(event, {});
    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(typeof body.translationConfigured, 'boolean');
    assert.equal(body.dbEngine, 'sqlite');
    assert.equal(body.deleteWindowMinutes, 60);
  });

  await t.test('GET /.netlify/functions/api/config normalizes rewritten Netlify path to /api/config', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/.netlify/functions/api/config',
      headers: { host: 'localhost' },
      requestContext: {}
    };
    const response = await handler(event, {});
    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.dbEngine, 'sqlite');
  });

  await t.test('GET /api/issues returns 200 with empty initial issues array', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/api/issues',
      headers: { host: 'localhost' },
      requestContext: {}
    };
    const response = await handler(event, {});
    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert(Array.isArray(body.issues));
  });

  await t.test('POST /api/issues creates an issue anonymously and issues voter cookie', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/issues',
      headers: {
        host: 'localhost',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Netlify Function Verification Test',
        description: 'Testing serverless-http Express adapter end-to-end on Netlify.'
      }),
      requestContext: {}
    };
    const response = await handler(event, {});
    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.equal(body.issue.title, 'Netlify Function Verification Test');
    assert.equal(body.issue.vote_count, 0);

    // Verify Set-Cookie header exists
    const setCookie = response.headers['set-cookie'] || (response.multiValueHeaders && response.multiValueHeaders['set-cookie']);
    assert(setCookie, 'Expected Set-Cookie header for voter token');
  });
});

test('Production Safety - missing Firestore credentials must fail safely without SQLite fallback', async (t) => {
  // Spawn a child process with NODE_ENV=production but empty Firestore credentials
  const { execSync } = require('node:child_process');
  const code = `
    process.env.FIREBASE_PROJECT_ID = '';
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '';
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = '';
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECRET = 'strong-cookie-secret-production-test-uwe-bristol-2026';
    process.env.ADMIN_PASSWORD = 'strong-admin-password-production-2026';

    const { handler } = require('./netlify/functions/api');
    handler({
      httpMethod: 'GET',
      path: '/api/config',
      headers: { host: 'localhost' },
      requestContext: {}
    }, {}).then(res => {
      console.log('STATUS:' + res.statusCode);
      console.log('BODY:' + res.body);
    }).catch(err => {
      console.log('ERROR:' + err.message);
    });
  `;

  const output = execSync(`node -e "${code.replace(/\n/g, ' ')}"`, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });

  assert(output.includes('STATUS:500'), 'Expected HTTP 500 when production DB credentials missing');
  assert(output.includes('SERVER_CONFIGURATION_ERROR'), 'Expected SERVER_CONFIGURATION_ERROR code');
  assert(!output.includes('sqlite'), 'Must NOT fall back to SQLite in production');
});
