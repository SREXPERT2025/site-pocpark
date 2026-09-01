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
import Database from 'better-sqlite3';
import {
  AGENT_PILOT_RUNTIME_SHA,
} from '../app/lib/agent-pilot-owner-canary.ts';
import { mapSiteIdentity } from '../app/lib/owner-ai-canary-core.ts';

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
  return new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections?.();
  });
}

let pilotMode = 'success';
let pilotDelayMs = 0;
const counts = { pilot: 0, legacy: 0 };
const pilotPayloads = [];
const pilot = https.createServer(tls, (request, response) => {
  assert.equal(request.headers.authorization, `Bearer ${PILOT_SECRET}`);
  counts.pilot += 1;
  let raw = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    const payload = JSON.parse(raw);
    pilotPayloads.push(payload);
    if (pilotMode === 'timeout') return;
    const reply = () => {
      if (response.destroyed) return;
      if (pilotMode === 'error') {
        response.writeHead(503, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ success: false, code: 'RUNTIME_UNAVAILABLE' }));
        return;
      }
      const traceId = `apt_${randomUUID().replaceAll('-', '')}`;
      const roleCalls = [{
        sequence: 1,
        role: 'orchestrator',
        latency_ms: pilotDelayMs,
        model: 'codex',
        reasoning_effort: 'medium',
        status: 'pass',
        used_downstream: true,
      }];
      const selectedEvidence = [{
        knowledge_id: 'approved-knowledge',
        source_id: 'approved-source',
        authority_class: 'official',
        approval_status: 'approved',
        customer_facing: true,
        evidence_role: 'factual',
        excerpt: 'Approved fixture excerpt.',
        used_in_final: true,
        authorization: 'pass',
      }];
      const runtimeSha = pilotMode === 'mismatch'
        ? '0'.repeat(40)
        : payload.expected_runtime_sha;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        success: true,
        fallback: false,
        answer: 'Agent Pilot owner answer.',
        runtime_sha: runtimeSha,
        latency_ms: pilotDelayMs,
        role_calls: roleCalls,
        critic_used: true,
        reconsideration_used: false,
        selected_evidence: selectedEvidence,
        trace_id: traceId,
        bridge_version: 'AGENT_PILOT_OWNER_CANARY_BRIDGE_V1',
        trace: {
          trace_id: traceId,
          turn_id: payload.turn_id,
          runtime_sha: runtimeSha,
          latency_ms: pilotDelayMs,
          bridge_wall_ms: pilotDelayMs,
          role_calls: roleCalls,
          selected_evidence: selectedEvidence,
          critic_used: true,
          reconsideration_used: false,
          codex_calls: 1,
          transport_calls_this_request: 1,
          duplicate_execution_prevented: false,
          durable_result_reused: false,
          object_card_before: { confirmed_facts: [], inferred_facts: [], open_questions: [] },
          object_card_after: { confirmed_facts: [], inferred_facts: [], open_questions: [] },
          critic_findings: { status: 'pass' },
          claim_plan: [],
          answer_obligations: [],
          safety_findings: [],
          metadata_defects: [],
        },
      }));
    };
    if (pilotDelayMs > 0) setTimeout(reply, pilotDelayMs);
    else reply();
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

function streamSiteRequest(port, input = {}, disconnectAfterFirstFrame = false) {
  const body = JSON.stringify(input.body);
  const headers = {
    Host: HOST,
    Origin: ORIGIN,
    'X-Forwarded-Proto': 'https',
    Accept: 'application/x-ndjson',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...input.headers,
  };
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port,
      method: 'POST', path: input.path, headers,
    }, (response) => {
      let raw = '';
      let firstFrameMs = null;
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        if (firstFrameMs === null) firstFrameMs = Date.now() - startedAt;
        raw += chunk;
        if (disconnectAfterFirstFrame) {
          response.destroy();
          resolve({
            disconnected: true,
            firstFrameMs,
            raw,
            status: response.statusCode,
            headers: response.headers,
          });
        }
      });
      response.on('end', () => resolve({
        disconnected: false,
        firstFrameMs,
        elapsedMs: Date.now() - startedAt,
        raw,
        status: response.statusCode,
        headers: response.headers,
      }));
      response.on('error', (error) => {
        if (!disconnectAfterFirstFrame) reject(error);
      });
    });
    request.once('error', (error) => {
      if (!disconnectAfterFirstFrame) reject(error);
    });
    request.write(body);
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
function chatBody(input = {}) {
  turn += 1;
  return {
    sessionId: input.sessionId ?? randomUUID(),
    turnId: input.turnId ?? randomUUID(),
    sourcePage: '/',
    messages: [{ role: 'user', content: input.message ?? `Тест ${turn}` }],
  };
}

async function chat(port, cookie, body = chatBody()) {
  return siteRequest(port, {
    method: 'POST',
    path: '/api/ai-widget/chat',
    headers: cookie ? { Cookie: cookie } : {},
    body,
  });
}

async function ownerTurn(port, cookie, body) {
  return siteRequest(port, {
    method: 'POST',
    path: '/api/ai-widget/owner-canary/turn',
    headers: { Cookie: cookie },
    body: { sessionId: body.sessionId, turnId: body.turnId },
  });
}

async function waitForOwnerTurn(port, cookie, body) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await ownerTurn(port, cookie, body);
    if (result.status === 200) {
      const parsed = JSON.parse(result.raw);
      if (parsed.status !== 'pending') return { result, parsed };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('OWNER_TURN_RECOVERY_TIMEOUT');
}

async function withSite(enabled, callback) {
  const port = await freePort();
  console.log(`HARNESS site start enabled=${enabled} port=${port}`);
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
        AI_WIDGET_RESPONSE_HEARTBEAT_MS: '1000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk;
    process.stdout.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk;
    process.stderr.write(chunk);
  });
  try {
    await waitForSite(port, () => logs);
    console.log(`HARNESS site ready enabled=${enabled}`);
    await callback(port, dbPath);
  } finally {
    await stop(child);
  }
}

const pilotPort = await listen(pilot);
const legacyPort = await listen(legacy);
assert.ok(pilotPort > 0 && legacyPort > 0);
console.log(`HARNESS upstreams ready pilot=${pilotPort} legacy=${legacyPort}`);
try {
  await withSite(true, async (port, dbPath) => {
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
    pilotDelayMs = 0;
    const ownerBody = chatBody({ message: 'Owner stable turn' });
    const ownerIdentity = mapSiteIdentity({
      sessionId: ownerBody.sessionId,
      turnId: ownerBody.turnId,
      env: { AI_CORE_IDENTITY_HMAC_KEY: IDENTITY_KEY },
    });
    const ownerPayloadCount = pilotPayloads.length;
    const owner = await chat(port, cookie, ownerBody);
    assert.equal(owner.status, 200);
    assert.equal(owner.raw, 'Agent Pilot owner answer.');
    assert.equal(owner.headers['x-ai-widget-route'], 'owner_agent_pilot');
    assert.equal(owner.headers['x-agent-pilot-runtime-sha'], AGENT_PILOT_RUNTIME_SHA);
    assert.equal(pilotPayloads.length, ownerPayloadCount + 1);
    assert.equal(
      pilotPayloads.at(-1).turn_id,
      ownerIdentity.messageId,
      'Site forwards the deterministic identity derived from the original browser turn',
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const traceDb = new Database(dbPath, { readonly: true });
    const persistedTrace = traceDb.prepare(`
      SELECT metadata.trace_id, metadata.runtime_sha, payload.trace_json
      FROM agent_pilot_turn_trace_metadata AS metadata
      JOIN agent_pilot_turn_trace_payloads AS payload USING (turn_id)
      WHERE metadata.turn_id = ?
    `).get(ownerBody.turnId);
    traceDb.close();
    assert.ok(persistedTrace, 'Agent Pilot trace is persisted in the existing widget DB');
    const parsedTrace = JSON.parse(persistedTrace.trace_json);
    assert.equal(parsedTrace.identity.runtime_sha, AGENT_PILOT_RUNTIME_SHA);
    assert.equal(parsedTrace.knowledge[0].authorization, 'pass');
    assert.equal(parsedTrace.diagnostics.secrets_captured, false);
    console.log('PASS owner Agent Pilot route');

    pilotMode = 'success';
    pilotDelayMs = 1_500;
    const delayedBody = chatBody({ message: 'Долгий штатный ответ' });
    const delayed = await streamSiteRequest(port, {
      path: '/api/ai-widget/chat',
      headers: { Cookie: cookie },
      body: delayedBody,
    });
    assert.equal(delayed.status, 200);
    assert.ok(delayed.firstFrameMs < 750, 'processing frame is immediate');
    assert.ok(delayed.elapsedMs >= 1_400, 'stream remains open for Pilot');
    assert.equal(
      delayed.headers['x-accel-buffering'],
      'no',
      'reverse proxy buffering is disabled for progress frames',
    );
    assert.ok(
      delayed.raw.match(/"type":"processing"/g)?.length >= 2,
      'heartbeat arrives while Pilot is still processing',
    );
    assert.match(delayed.raw, /"type":"answer"/);
    assert.match(delayed.raw, /Agent Pilot owner answer\./);
    console.log('PASS progress heartbeat stream');

    const duplicateBody = chatBody({ message: 'Один pending turn' });
    const duplicateIdentity = mapSiteIdentity({
      sessionId: duplicateBody.sessionId,
      turnId: duplicateBody.turnId,
      env: { AI_CORE_IDENTITY_HMAC_KEY: IDENTITY_KEY },
    });
    const beforeDuplicate = { ...counts };
    const duplicatePayloadCount = pilotPayloads.length;
    const primary = streamSiteRequest(port, {
      path: '/api/ai-widget/chat',
      headers: { Cookie: cookie },
      body: duplicateBody,
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const duplicate = await chat(port, cookie, duplicateBody);
    assert.equal(duplicate.status, 202);
    assert.equal(JSON.parse(duplicate.raw).status, 'pending');
    const primaryResult = await primary;
    assert.match(primaryResult.raw, /"type":"answer"/);
    assert.equal(
      counts.pilot,
      beforeDuplicate.pilot + 1,
      'one pending turn invokes Pilot exactly once',
    );
    assert.equal(pilotPayloads.length, duplicatePayloadCount + 1);
    assert.equal(
      pilotPayloads[duplicatePayloadCount].turn_id,
      duplicateIdentity.messageId,
      'retry keeps the same Site-to-Bridge-to-Runtime turn_id',
    );
    const duplicateRecovered = await waitForOwnerTurn(
      port,
      cookie,
      duplicateBody,
    );
    assert.equal(duplicateRecovered.parsed.status, 'answered');
    assert.equal(duplicateRecovered.parsed.answer, 'Agent Pilot owner answer.');
    console.log('PASS duplicate pending protection');

    const disconnectBody = chatBody({ message: 'Обрыв клиента' });
    const disconnectIdentity = mapSiteIdentity({
      sessionId: disconnectBody.sessionId,
      turnId: disconnectBody.turnId,
      env: { AI_CORE_IDENTITY_HMAC_KEY: IDENTITY_KEY },
    });
    const beforeDisconnect = { ...counts };
    const disconnectPayloadCount = pilotPayloads.length;
    const disconnected = await streamSiteRequest(port, {
      path: '/api/ai-widget/chat',
      headers: { Cookie: cookie },
      body: disconnectBody,
    }, true);
    assert.equal(disconnected.disconnected, true);
    assert.match(disconnected.raw, /"type":"processing"/);
    const recoveredAfterDisconnect = await waitForOwnerTurn(
      port,
      cookie,
      disconnectBody,
    );
    assert.equal(recoveredAfterDisconnect.parsed.status, 'answered');
    assert.equal(
      counts.pilot,
      beforeDisconnect.pilot + 1,
      'client disconnect does not duplicate Pilot execution',
    );
    assert.equal(pilotPayloads.length, disconnectPayloadCount + 1);
    assert.equal(
      pilotPayloads[disconnectPayloadCount].turn_id,
      disconnectIdentity.messageId,
      'reconnect recovery preserves the original Runtime turn_id',
    );
    console.log('PASS client disconnect durable recovery');

    pilotMode = 'timeout';
    pilotDelayMs = 0;
    const timeoutBody = chatBody({ message: 'Pilot timeout fallback' });
    const timeout = await streamSiteRequest(port, {
      path: '/api/ai-widget/chat',
      headers: { Cookie: cookie },
      body: timeoutBody,
    });
    assert.equal(timeout.status, 200);
    assert.ok(timeout.elapsedMs >= 4_900);
    assert.match(timeout.raw, /"type":"processing"/);
    assert.match(timeout.raw, /"type":"answer"/);
    assert.match(timeout.raw, new RegExp(LEGACY_ANSWER));
    assert.match(timeout.raw, /"fallback":true/);
    const timeoutRecovered = await waitForOwnerTurn(
      port,
      cookie,
      timeoutBody,
    );
    assert.equal(timeoutRecovered.parsed.status, 'answered');
    assert.equal(timeoutRecovered.parsed.route, 'legacy_qwen');
    console.log('PASS timeout exact Legacy fallback');

    for (const mode of ['error', 'mismatch']) {
      pilotMode = mode;
      pilotDelayMs = 0;
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
