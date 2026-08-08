import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

const ROOT = process.cwd();
const RUNTIME_SHA = '5713258de76d4aa689baf30eae016df54cd8d579';
const CONTRACT_SHA = '8834367e7412656b5a83d0c01b05dbffae6d3dee';
const SITE_SHA = 'a'.repeat(40);
const GATEWAY_SHA = 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9';
const SECRET = 'deterministic-gateway-secret-at-least-32-bytes';
const ORIGIN = 'https://www.xn--80aukedde.xn--p1ai';
const work = mkdtempSync(path.join(os.tmpdir(), 'public-ai-core-http-'));
const keyPath = path.join(work, 'key.pem');
const certPath = path.join(work, 'cert.pem');
const certificate = spawnSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', keyPath, '-out', certPath, '-days', '1',
  '-subj', '/CN=127.0.0.1',
], { encoding: 'utf8' });
assert.equal(certificate.status, 0, certificate.stderr);

let coreMode = 'success';
const counts = { core: 0, ack: 0, legacy: 0 };
const gateway = https.createServer({
  key: readFileSync(keyPath), cert: readFileSync(certPath),
}, (request, response) => {
  let raw = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    assert.equal(request.headers.authorization, `Bearer ${SECRET}`);
    if (request.url === '/v1/chat') {
      counts.legacy += 1;
      response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-AI-Widget-Route': 'legacy_qwen',
      });
      response.end('Детерминированный legacy ответ.');
      return;
    }
    if (request.url === '/v1/owner-ai-core/ack') {
      counts.ack += 1;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        accepted: true, runtime_sha: RUNTIME_SHA, contract_sha: CONTRACT_SHA,
      }));
      return;
    }
    if (request.url === '/v1/owner-ai-core') {
      counts.core += 1;
      if (coreMode === 'unavailable') {
        response.writeHead(503, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
          success: false, code: 'RUNTIME_UNAVAILABLE',
        }));
        return;
      }
      const probe = spawnSync(
        'python3', ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
        { cwd: ROOT, input: raw, encoding: 'utf8' },
      );
      assert.equal(probe.status, 0, probe.stderr);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(probe.stdout);
      return;
    }
    response.writeHead(404).end();
  });
});

await new Promise((resolve) => gateway.listen(9443, '127.0.0.1', resolve));

async function waitForSite(port) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/ai-widget/status`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('SITE_READINESS_TIMEOUT');
}

async function stop(process) {
  if (process.exitCode !== null) return;
  process.kill('SIGTERM');
  await new Promise((resolve) => {
    process.once('exit', resolve);
    setTimeout(() => {
      if (process.exitCode === null) process.kill('SIGKILL');
      resolve();
    }, 5_000).unref();
  });
}

let runIndex = 0;
async function withSite(publicEnabled, task) {
  runIndex += 1;
  const port = 3300 + runIndex;
  const dbPath = path.join(work, `dialog-${runIndex}.sqlite`);
  const child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-p', String(port)],
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
        AI_WIDGET_GATEWAY_URL: 'https://127.0.0.1:9443',
        AI_WIDGET_GATEWAY_SECRET: SECRET,
        AI_CORE_OWNER_CANARY_ENABLED: 'false',
        AI_CORE_PUBLIC_ENABLED: publicEnabled ? 'true' : 'false',
        AI_CORE_PUBLIC_URL: 'https://127.0.0.1:9443',
        AI_CORE_PUBLIC_SECRET: SECRET,
        AI_CORE_PUBLIC_RUNTIME_SHA: RUNTIME_SHA,
        AI_CORE_PUBLIC_CONTRACT_SHA: CONTRACT_SHA,
        AI_CORE_PUBLIC_SITE_SHA: SITE_SHA,
        AI_CORE_PUBLIC_GATEWAY_SHA: GATEWAY_SHA,
        AI_CORE_IDENTITY_HMAC_KEY:
          'deterministic-identity-key-at-least-32-bytes',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  try {
    await waitForSite(port);
    await task({ port, dbPath });
  } finally {
    assert.equal(child.exitCode, null, logs);
    await stop(child);
  }
  assert.equal(
    child.exitCode === 0
      || child.exitCode === 143
      || child.signalCode === 'SIGTERM'
      || child.signalCode === 'SIGKILL',
    true,
    `${logs}\nexitCode=${child.exitCode} signalCode=${child.signalCode}`,
  );
}

let turnSequence = 0;
async function chat(port, sessionId, content = 'Сколько будет 2+2?') {
  turnSequence += 1;
  const turnId = `${String(turnSequence).padStart(8, '0')}-2222-4222-8222-222222222222`;
  const response = await fetch(`http://127.0.0.1:${port}/api/ai-widget/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({
      sessionId, turnId, sourcePage: '/',
      messages: [{ role: 'user', content }],
    }),
  });
  return { response, answer: await response.text(), turnId };
}

// OFF: an ordinary visitor remains on the exact legacy route.
await withSite(false, async ({ port }) => {
  const before = { ...counts };
  const result = await chat(port, '11111111-1111-4111-8111-111111111111');
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('x-ai-widget-route'), 'legacy_qwen');
  assert.equal(result.answer, 'Детерминированный legacy ответ.');
  assert.equal(counts.core, before.core);
  assert.equal(counts.legacy, before.legacy + 1);
});

// ON: an ordinary visitor uses the exact AI Core; retry is cache-only.
coreMode = 'success';
await withSite(true, async ({ port, dbPath }) => {
  const before = { ...counts };
  const rememberedFact = [
    'Запомни: въезд стоит 200 рублей,',
    'шлагбаум открывается только после подтверждения оплаты.',
  ].join(' ');
  const first = await chat(
    port,
    '33333333-3333-4333-8333-333333333333',
    rememberedFact,
  );
  assert.equal(first.response.status, 200);
  assert.equal(first.response.headers.get('x-ai-widget-route'), 'public_ai_core');
  assert.equal(first.response.headers.get('x-ai-core-actual-route'), 'ai_core');
  assert.equal(
    first.answer,
    'Зафиксировал: стоимость въезда — 200 рублей; '
      + 'шлагбаум открывается только после подтверждения оплаты.',
  );
  assert.equal(counts.core, before.core + 1);
  assert.equal(counts.ack, before.ack + 1);
  const duplicate = await fetch(`http://127.0.0.1:${port}/api/ai-widget/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({
      sessionId: '33333333-3333-4333-8333-333333333333',
      turnId: first.turnId, sourcePage: '/',
      messages: [{ role: 'user', content: rememberedFact }],
    }),
  });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.headers.get('x-ai-widget-route'), 'public_ai_core_cached');
  assert.equal(await duplicate.text(), first.answer);
  assert.equal(counts.core, before.core + 1);
  assert.equal(counts.ack, before.ack + 1);
  const db = new Database(dbPath, { readonly: true });
  const telemetry = db.prepare(`
    SELECT planned_route, actual_route, fallback_reason,
      mutation_started, runtime_sha, contract_sha
    FROM ai_core_public_route_telemetry WHERE turn_id = ?
  `).get(first.turnId);
  assert.deepEqual(telemetry, {
    planned_route: 'ai_core', actual_route: 'ai_core',
    fallback_reason: null, mutation_started: 1,
    runtime_sha: RUNTIME_SHA, contract_sha: CONTRACT_SHA,
  });
  const events = db.prepare(`
    SELECT event_name FROM ai_widget_server_events
    WHERE turn_id = ? ORDER BY created_at_ms, id
  `).all(first.turnId).map((row) => row.event_name);
  assert.deepEqual(events, ['turn_accepted', 'answer_completed']);
  db.close();
});

// Hard transport failure before mutation falls back once and is traced.
coreMode = 'unavailable';
await withSite(true, async ({ port, dbPath }) => {
  const before = { ...counts };
  const result = await chat(port, '44444444-4444-4444-8444-444444444444');
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('x-ai-widget-route'), 'legacy_qwen');
  assert.equal(result.response.headers.get('x-ai-core-planned-route'), 'ai_core');
  assert.equal(result.response.headers.get('x-ai-core-actual-route'), 'legacy');
  assert.equal(result.response.headers.get('x-ai-core-fallback-reason'),
    'AI_CORE_UPSTREAM_503');
  assert.equal(counts.core, before.core + 1);
  assert.equal(counts.legacy, before.legacy + 1);
  assert.equal(counts.ack, before.ack);
  const db = new Database(dbPath, { readonly: true });
  const telemetry = db.prepare(`
    SELECT planned_route, actual_route, fallback_reason, mutation_started
    FROM ai_core_public_route_telemetry WHERE turn_id = ?
  `).get(result.turnId);
  assert.deepEqual(telemetry, {
    planned_route: 'ai_core', actual_route: 'legacy',
    fallback_reason: 'AI_CORE_UPSTREAM_503', mutation_started: 0,
  });
  const terminalCount = db.prepare(`
    SELECT COUNT(*) AS count FROM ai_widget_server_events
    WHERE turn_id = ? AND event_name IN ('answer_completed', 'answer_error')
  `).get(result.turnId).count;
  assert.equal(terminalCount, 1);
  db.close();
});

// Rollback action OFF returns the next ordinary visitor to legacy.
coreMode = 'success';
await withSite(false, async ({ port }) => {
  const before = { ...counts };
  const result = await chat(port, '55555555-5555-4555-8555-555555555555');
  assert.equal(result.response.headers.get('x-ai-widget-route'), 'legacy_qwen');
  assert.equal(counts.core, before.core);
  assert.equal(counts.legacy, before.legacy + 1);
});

gateway.close();
console.log(JSON.stringify({
  schema: 'rospark-public-ai-core-http-harness-v1',
  off_legacy_route: 'pass',
  on_public_ai_core_route: 'pass',
  duplicate_answer_count: 0,
  duplicate_mutation_count: 0,
  transport_fallback_to_legacy: 'pass',
  fallback_trace: 'pass',
  rollback_off: 'pass',
  site_b_lifecycle: 'pass',
  owner_canary_enabled: false,
  model_requests: 0,
  counts,
}));
