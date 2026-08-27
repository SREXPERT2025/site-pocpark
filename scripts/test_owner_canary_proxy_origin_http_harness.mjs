import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  issueOwnerCanarySession,
  OWNER_AI_CANARY_COOKIE,
} from '../app/lib/owner-ai-canary-core.ts';

const ROOT = process.cwd();
const PUBLIC_ORIGIN = 'https://www.xn--80aukedde.xn--p1ai';
const PUBLIC_HOST = 'www.xn--80aukedde.xn--p1ai';
const RUNTIME_SHA = '651738a5db1a748fa252d5df4f6df3e843ef1f92';
const CONTRACT_SHA = '4d75773d60f3453279cbfcee1453f54b15b66567';
const CREDENTIAL = 'owner-http-harness-credential-000000000001';
const COOKIE_KEY = 'owner-http-harness-cookie-key-000000000001';
const work = mkdtempSync(path.join(os.tmpdir(), 'owner-origin-http-'));
const dbPath = path.join(work, 'dialogs.sqlite');

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function request(port, input = {}) {
  const body = input.body === undefined
    ? null
    : JSON.stringify(input.body);
  const headers = {
    Host: PUBLIC_HOST,
    Origin: PUBLIC_ORIGIN,
    'X-Forwarded-Proto': 'https',
    ...input.headers,
  };
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || value === null) delete headers[name];
  }
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      method: input.method ?? 'GET',
      path: input.path,
      headers,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, raw, json });
      });
    });
    req.once('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

async function waitForSite(port) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await request(port, {
        path: '/api/ai-widget/status',
        headers: { Origin: undefined, 'X-Forwarded-Proto': undefined },
      });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('SITE_READINESS_TIMEOUT');
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 5_000).unref();
  });
}

function firstSetCookie(setCookie) {
  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.equal(typeof value, 'string');
  return value;
}

function cookiePair(setCookie) {
  return firstSetCookie(setCookie).split(';', 1)[0];
}

const port = await freePort();
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: PUBLIC_ORIGIN,
      AI_WIDGET_ALLOWED_ORIGINS: PUBLIC_ORIGIN,
      AI_WIDGET_LOGGING_ENABLED: 'true',
      AI_WIDGET_SERVER_EVENTS_ENABLED: 'true',
      AI_WIDGET_LOG_DB_PATH: dbPath,
      AI_CORE_PUBLIC_ENABLED: 'false',
      AI_CORE_OWNER_CANARY_ENABLED: 'true',
      AI_CORE_OWNER_CANARY_CREDENTIAL: CREDENTIAL,
      AI_CORE_OWNER_CANARY_COOKIE_KEY: COOKIE_KEY,
      AI_CORE_OWNER_CANARY_SESSION_VERSION: 'v1',
      OWNER_CANARY_PUBLIC_ORIGIN: PUBLIC_ORIGIN,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk; });
child.stderr.on('data', (chunk) => { logs += chunk; });

let assertions = 0;
function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}
function ok(value, message) {
  assertions += 1;
  assert.ok(value, message);
}

try {
  await waitForSite(port);

  const login = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/login',
    body: { credential: CREDENTIAL },
  });
  equal(login.status, 200, 'canonical proxy request authenticates');
  equal(login.json?.success, true, 'legitimate credential accepted');
  const setCookie = firstSetCookie(login.headers['set-cookie']);
  ok(setCookie?.includes('HttpOnly'), 'cookie is HttpOnly');
  ok(setCookie?.includes('Secure'), 'cookie is Secure');
  ok(setCookie?.includes('SameSite=Strict'), 'cookie remains SameSite Strict');
  ok(!setCookie?.includes(CREDENTIAL), 'credential absent from cookie');
  const ownerCookie = cookiePair(setCookie);

  const ownerStatus = await request(port, {
    path: '/api/ai-widget/owner-canary/status',
    headers: { Cookie: ownerCookie },
  });
  equal(ownerStatus.status, 200, 'owner status succeeds through proxy headers');
  equal(ownerStatus.json?.audience, 'owner_canary', 'valid owner audience');
  equal(ownerStatus.json?.route, 'ai_core', 'valid owner route');
  equal(ownerStatus.json?.runtimeSha, RUNTIME_SHA, 'exact Runtime pin');
  equal(ownerStatus.json?.contractSha, CONTRACT_SHA, 'exact Contract pin');

  const visitorStatus = await request(port, {
    path: '/api/ai-widget/owner-canary/status',
  });
  equal(visitorStatus.status, 200, 'normal visitor status succeeds');
  equal(visitorStatus.json?.route, 'legacy', 'normal visitor remains legacy');

  const forged = await request(port, {
    path: '/api/ai-widget/owner-canary/status',
    headers: { Cookie: `${OWNER_AI_CANARY_COOKIE}=forged.token` },
  });
  equal(forged.status, 401, 'forged cookie rejected');
  equal(forged.json?.route, 'legacy', 'forged cookie cannot select AI Core');

  const expired = issueOwnerCanarySession({
    credential: CREDENTIAL,
    env: {
      AI_CORE_OWNER_CANARY_CREDENTIAL: CREDENTIAL,
      AI_CORE_OWNER_CANARY_COOKIE_KEY: COOKIE_KEY,
      AI_CORE_OWNER_CANARY_SESSION_VERSION: 'v1',
    },
    nowMs: Date.now() - 120_000,
    ttlSeconds: 60,
    idFactory: () => 'owner-http-expired-session-0001',
  });
  const expiredStatus = await request(port, {
    path: '/api/ai-widget/owner-canary/status',
    headers: { Cookie: `${OWNER_AI_CANARY_COOKIE}=${expired.token}` },
  });
  equal(expiredStatus.status, 401, 'expired cookie rejected');
  equal(expiredStatus.json?.route, 'legacy', 'expired cookie cannot select AI Core');

  const originDenied = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/login',
    headers: { Origin: 'https://evil.example' },
    body: { credential: CREDENTIAL },
  });
  equal(originDenied.status, 403, 'foreign Origin rejected');
  equal(originDenied.json?.code, 'OWNER_ORIGIN_MISMATCH', 'foreign Origin reason');

  const hostDenied = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/login',
    headers: { Host: 'evil.example' },
    body: { credential: CREDENTIAL },
  });
  equal(hostDenied.status, 403, 'forged Host rejected');
  equal(hostDenied.json?.code, 'OWNER_HOST_MISMATCH', 'forged Host reason');

  const forwardedHostDenied = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/login',
    headers: { 'X-Forwarded-Host': 'evil.example' },
    body: { credential: CREDENTIAL },
  });
  equal(forwardedHostDenied.status, 403, 'forged forwarded Host rejected');
  equal(
    forwardedHostDenied.json?.code,
    'OWNER_FORWARDED_HOST_MISMATCH',
    'forged forwarded Host reason',
  );

  const forwardedProtoDenied = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/login',
    headers: { 'X-Forwarded-Proto': 'http' },
    body: { credential: CREDENTIAL },
  });
  equal(forwardedProtoDenied.status, 403, 'forged forwarded Proto rejected');
  equal(
    forwardedProtoDenied.json?.code,
    'OWNER_FORWARDED_PROTO_MISMATCH',
    'forged forwarded Proto reason',
  );

  const missingOrigin = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/login',
    headers: { Origin: undefined },
    body: { credential: CREDENTIAL },
  });
  equal(missingOrigin.status, 403, 'missing Origin rejected');
  equal(missingOrigin.json?.code, 'OWNER_ORIGIN_MISSING', 'missing Origin reason');

  const nullOrigin = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/login',
    headers: { Origin: 'null' },
    body: { credential: CREDENTIAL },
  });
  equal(nullOrigin.status, 403, 'null Origin rejected');
  equal(nullOrigin.json?.code, 'OWNER_ORIGIN_NULL', 'null Origin reason');

  const logout = await request(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/logout',
    headers: { Cookie: ownerCookie },
  });
  equal(logout.status, 200, 'owner logout succeeds');
  equal(logout.json?.success, true, 'owner session revoked');
  ok(
    firstSetCookie(logout.headers['set-cookie']).includes('Max-Age=0'),
    'logout clears cookie',
  );

  const revoked = await request(port, {
    path: '/api/ai-widget/owner-canary/status',
    headers: { Cookie: ownerCookie },
  });
  equal(revoked.status, 401, 'revoked cookie rejected');
  equal(revoked.json?.route, 'legacy', 'revoked cookie cannot select AI Core');
  ok(!logs.includes(CREDENTIAL), 'owner credential absent from application logs');
} finally {
  await stop(child);
}

ok(
  child.exitCode === 0
    || child.exitCode === 143
    || child.signalCode === 'SIGTERM'
    || child.signalCode === 'SIGKILL',
  `${logs}\nexitCode=${child.exitCode} signalCode=${child.signalCode}`,
);

console.log(JSON.stringify({
  schema: 'rospark-owner-canary-proxy-origin-http-harness-v1',
  assertions,
  canonical_public_origin: PUBLIC_ORIGIN,
  nginx_proxy_header_path: 'pass',
  legitimate_owner_auth: 'pass',
  signed_cookie_security: 'pass',
  forged_cookie: 'rejected',
  expired_cookie: 'rejected',
  logout_revocation: 'pass',
  forged_forwarded_headers: 'rejected',
  owner_route: 'ai_core',
  normal_visitor_route: 'legacy',
  public_ai_core_enabled: false,
  model_requests: 0,
}));
