'use strict';

/**
 * Frontal OpenAPI JavaScript examples (Node.js 18+)
 * Endpoints used from generated public spec:
 * - GET  /health
 * - POST /v1/auth/signup
 * - POST /v1/auth/login
 */

const API_BASE_URL = process.env.FRONTAL_API_BASE_URL || 'https://api.frontal.dev';
const EMAIL = process.env.FRONTAL_TEST_EMAIL || 'user@example.com';
const PASSWORD = process.env.FRONTAL_TEST_PASSWORD || 'ChangeMe123!';

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

async function healthCheck() {
  return request('/health', { method: 'GET' });
}

async function signup(email, password) {
  return request('/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name: 'Example User',
    }),
  });
}

async function login(email, password) {
  return request('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function run() {
  console.log(`Base URL: ${API_BASE_URL}`);

  const health = await healthCheck();
  console.log('\n[health]', health.status, health.body);

  const created = await signup(EMAIL, PASSWORD);
  console.log('\n[signup]', created.status, created.body);

  const session = await login(EMAIL, PASSWORD);
  console.log('\n[login]', session.status, session.body);
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Example failed:', err);
    process.exit(1);
  });
}

module.exports = {
  healthCheck,
  signup,
  login,
};
