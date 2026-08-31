import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  AGENT_PILOT_RUNTIME_SHA,
} from '../app/lib/agent-pilot-owner-canary.ts';

const ROOT = process.cwd();
const ORIGIN = 'https://www.xn--80aukedde.xn--p1ai';
const HOST = 'www.xn--80aukedde.xn--p1ai';
const CREDENTIAL = 'agent-pilot-http-owner-credential-0000000001';
const COOKIE_KEY = 'agent-pilot-http-cookie-key-00000000000001';
const IDENTITY_KEY = 'agent-pilot-http-identity-key-000000000001';
const PILOT_SECRET = 'agent-pilot-http-service-secret-00000000001';
const LEGACY_SECRET = 'agent-pilot-http-legacy-secret-000000000001';
const LEGACY_ANSWER = 'Точный ответ существующего Legacy gateway.';
const work = mkdtempSync(path.join(os.tmpdir(), 'agent-pilot-owner-http-'));
const keyPath = path.join(work, 'key.pem');
const certPath = path.join(work, 'cert.pem');
const certificate = spawnSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', keyPath, '-out', certPath, '-days', '1',
  '-subj', '/CN=127.0.0.1',
], { encoding: 'utf8' });
assert.equal(certificate.status, 0, certificate.stderr);
const tls = { key: readFileSync(keyPath), cert: readFileSync(certPath) };

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

let pilotMode = 'success';
const counts = { pilot: 0, legacy: 0 };
const pilot = https.createServer(tls, (request, response) => {
  assert.equal(request.headers.authorization, `Bearer ${PILOT_SECRET}`);
  counts.pilot += 1;
  let raw = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    const payload = JSON.parse(raw);
    if (pilotMode === 'error') {
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ success: false, code: 'RUNTIME_UNAVAILABLE' }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      success: true,
      fallback: false,
      answer: 'Agent Pilot owner answer.',
      runtime_sha: pilotMode === 'mismatch'
        ? '0'.repeat(40)
        : payload.expected_runtime_sha,
      latency_ms: 1200,
      role_calls: [{ role: 'orchestrator', latency_ms: 1000 }],
      critic_used: true,
      reconsideration_used: false,
      selected_evidence: [{ source_id: 'approved-source' }],
      trace_id: `apt_${randomUUID().replaceAll('-', '')}`,
    }));
  });
});
const legacy = https.createServer(tls, (request, response) => {
  assert.equal(request.headers.authorization, `Bearer ${LEGACY_SECRET}`);
  counts.legacy += 1;
  request.resume();
  request.on('end', () => {
    response.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-AI-Widget-Route': 'legacy_qwen',
    });
    response.end(LEGACY_ANSWER);
  });
});

function siteRequest(port, input = {}) {
  const body = input.body === undefined ? null : JSON.stringify(input.body);
  const headers = {
    Host: HOST,
    Origin: ORIGIN,
    'X-Forwarded-Proto': 'https',
    ...input.headers,
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port,
      method: input.method ?? 'GET', path: input.path, headers,
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        raw,
      }));
    });
    request.once('error', reject);
    if (body !== null) request.write(body);
    request.end();
  });
}

async function waitForSite(port, childLogs) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const result = await siteRequest(port, { path: '/api/ai-widget/status' });
      if (result.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`SITE_READINESS_TIMEOUT\n${childLogs()}`);
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

let turn = 0;
async function chat(port, cookie) {
  turn += 1;
  return siteRequest(port, {
    method: 'POST',
    path: '/api/ai-widget/chat',
    headers: cookie ? { Cookie: cookie } : {},
    body: {
      sessionId: randomUUID(),
      turnId: randomUUID(),
      sourcePage: '/',
      messages: [{ role: 'user', content: `Тест ${turn}` }],
    },
  });
}

async function withSite(enabled, callback) {
  const port = await freePort();
  const dbPath = path.join(work, `dialogs-${enabled}-${port}.sqlite`);
  const child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        NEXT_PUBLIC_SITE_URL: ORIGIN,
        AI_WIDGET_ALLOWED_ORIGINS: ORIGIN,
        AI_WIDGET_ENABLED: 'true',
        AI_WIDGET_RUNTIME_MODE: 'production',
        AI_WIDGET_HANDOFF_MODE: 'live',
        AI_WIDGET_LOGGING_ENABLED: 'true',
        AI_WIDGET_SERVER_EVENTS_ENABLED: 'true',
        AI_WIDGET_LOG_DB_PATH: dbPath,
        LEAD_REGISTRY_ENABLED: 'true',
        LEAD_REGISTRY_DB_PATH: path.join(work, `leads-${enabled}-${port}.sqlite`),
        AI_WIDGET_GATEWAY_URL: `https://127.0.0.1:${legacy.address().port}`,
        AI_WIDGET_GATEWAY_SECRET: LEGACY_SECRET,
        AI_CORE_PUBLIC_ENABLED: 'false',
        AI_CORE_OWNER_CANARY_ENABLED: 'false',
        AI_CORE_OWNER_CANARY_CREDENTIAL: CREDENTIAL,
        AI_CORE_OWNER_CANARY_COOKIE_KEY: COOKIE_KEY,
        AI_CORE_OWNER_CANARY_SESSION_VERSION: 'v1',
        AI_CORE_IDENTITY_HMAC_KEY: IDENTITY_KEY,
        OWNER_CANARY_PUBLIC_ORIGIN: ORIGIN,
        AGENT_PILOT_OWNER_CANARY_ENABLED: enabled ? 'true' : 'false',
        AGENT_PILOT_OWNER_CANARY_URL:
          `https://127.0.0.1:${pilot.address().port}/agent-pilot/`,
        AGENT_PILOT_OWNER_CANARY_SECRET: PILOT_SECRET,
        AGENT_PILOT_OWNER_CANARY_RUNTIME_SHA: AGENT_PILOT_RUNTIME_SHA,
        AGENT_PILOT_OWNER_CANARY_TIMEOUT_MS: '5000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  try {
    await waitForSite(port, () => logs);
    await callback(port);
  } finally {
    await stop(child);
  }
}

const pilotPort = await listen(pilot);
const legacyPort = await listen(legacy);
assert.ok(pilotPort > 0 && legacyPort > 0);
try {
  await withSite(true, async (port) => {
    const visitorBefore = { ...counts };
    const visitor = await chat(port, null);
    assert.equal(visitor.status, 200);
    assert.equal(visitor.raw, LEGACY_ANSWER);
    assert.equal(visitor.headers['x-ai-widget-route'], 'legacy_qwen');
    assert.equal(counts.pilot, visitorBefore.pilot, 'public never reaches Pilot');
    assert.equal(counts.legacy, visitorBefore.legacy + 1);

    const login = await siteRequest(port, {
      method: 'POST', path: '/api/ai-widget/owner-canary/login',
      body: { credential: CREDENTIAL },
    });
    assert.equal(login.status, 200);
    const cookie = login.headers['set-cookie'][0].split(';', 1)[0];
    const status = await siteRequest(port, {
      path: '/api/ai-widget/owner-canary/status', headers: { Cookie: cookie },
    });
    const statusBody = JSON.parse(status.raw);
    assert.equal(statusBody.route, 'agent_pilot');
    assert.equal(statusBody.runtimeSha, AGENT_PILOT_RUNTIME_SHA);

    pilotMode = 'success';
    const owner = await chat(port, cookie);
    assert.equal(owner.status, 200);
    assert.equal(owner.raw, 'Agent Pilot owner answer.');
    assert.equal(owner.headers['x-ai-widget-route'], 'owner_agent_pilot');
    assert.equal(owner.headers['x-agent-pilot-runtime-sha'], AGENT_PILOT_RUNTIME_SHA);

    for (const mode of ['error', 'mismatch']) {
      pilotMode = mode;
      const before = { ...counts };
      const result = await chat(port, cookie);
      assert.equal(result.status, 200);
      assert.equal(result.raw, LEGACY_ANSWER, `${mode} uses exact Legacy answer`);
      assert.equal(result.headers['x-ai-widget-route'], 'legacy_qwen');
      assert.equal(result.headers['x-agent-pilot-fallback'], 'true');
      assert.equal(result.headers['x-agent-pilot-actual-route'], 'legacy');
      assert.equal(counts.pilot, before.pilot + 1);
      assert.equal(counts.legacy, before.legacy + 1);
    }
  });

  await withSite(false, async (port) => {
    const before = { ...counts };
    const result = await chat(port, null);
    assert.equal(result.status, 200);
    assert.equal(result.raw, LEGACY_ANSWER);
    assert.equal(counts.pilot, before.pilot, 'disabled flag never calls Pilot');
    assert.equal(counts.legacy, before.legacy + 1);
  });
  console.log('Agent Pilot owner canary HTTP integration: PASS');
} finally {
  await close(pilot);
  await close(legacy);
  rmSync(work, { recursive: true, force: true });
}
