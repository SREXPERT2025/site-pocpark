import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

const ROOT = process.cwd();
const RUNTIME_SHA = 'd3a7d5dbe4af71a3ced2f03589a15cc9e7285f17';
const CONTRACT_SHA = '6cd71a5596346925ecdd2ffeb9d45262d881ee93';
const CANONICALIZATION_VERSION = 'CANONICAL_JSON_HASH_V1';
const GATEWAY_SHA = 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9';
const SECRET = 'deterministic-gateway-secret-at-least-32-bytes';
const ORIGIN = 'https://www.xn--80aukedde.xn--p1ai';
const buildMetadata = JSON.parse(readFileSync(
  path.join(ROOT, '.next', 'required-server-files.json'),
  'utf8',
));
const SITE_SHA = String(
  buildMetadata?.config?.env?.ROSPARK_DEPLOYED_SITE_SHA ?? '',
);
assert.match(SITE_SHA, /^[a-f0-9]{40}$/);
assert.equal(
  spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).stdout.trim(),
  SITE_SHA,
);
const work = mkdtempSync(path.join(os.tmpdir(), 'public-ai-core-http-'));
const nextCli = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const deploymentEnvFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
];

function createRuntimeRoot(name, options = {}) {
  const runtimeRoot = path.join(work, name);
  mkdirSync(runtimeRoot, { recursive: true });
  symlinkSync(path.join(ROOT, '.next'), path.join(runtimeRoot, '.next'), 'dir');
  symlinkSync(
    path.join(ROOT, 'node_modules'),
    path.join(runtimeRoot, 'node_modules'),
    'dir',
  );
  if (existsSync(path.join(ROOT, 'public'))) {
    symlinkSync(path.join(ROOT, 'public'), path.join(runtimeRoot, 'public'), 'dir');
  }
  if (options.envProduction !== undefined) {
    writeFileSync(
      path.join(runtimeRoot, '.env.production'),
      options.envProduction,
      { encoding: 'utf8', mode: 0o600 },
    );
  }
  return runtimeRoot;
}

function assertIsolatedRuntimeRoot(runtimeRoot) {
  for (const name of deploymentEnvFiles) {
    assert.equal(
      existsSync(path.join(runtimeRoot, name)),
      false,
      `ISOLATED_RUNTIME_ENV_FILE_VISIBLE:${name}`,
    );
  }
}

const isolatedRuntimeRoot = createRuntimeRoot('isolated-runtime');
assertIsolatedRuntimeRoot(isolatedRuntimeRoot);
const historicalEnvRuntimeRoot = createRuntimeRoot('historical-env-runtime', {
  envProduction: `AI_CORE_PUBLIC_SITE_SHA=${SITE_SHA}\n`,
});
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
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}
function sha256(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
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
        canonicalization_version: CANONICALIZATION_VERSION,
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
      if (coreMode !== 'blocked') {
        response.end(probe.stdout);
        return;
      }
      const envelope = JSON.parse(probe.stdout);
      const runtimeResponse = envelope.response;
      const repairCodes = ['operator_role_missing', 'required_content_missing'];
      runtimeResponse.repair_result.reason_codes = [...repairCodes].sort();
      runtimeResponse.evaluation_result.status = 'fail';
      runtimeResponse.evaluation_result.reason_codes = ['required_content_missing'];
      runtimeResponse.telemetry.evaluation.raw_status = 'review_required';
      runtimeResponse.telemetry.evaluation.final_status = 'fail';
      runtimeResponse.telemetry.publication.candidate_status = 'blocked';
      const mutationSummary = runtimeResponse.state_mutations.map((item) => ({
        target: item.target,
        operation: item.operation,
        field: item.field,
        value_kind: Array.isArray(item.value) ? 'array'
          : Number.isInteger(item.value) ? 'integer'
            : item.value === null ? 'null' : typeof item.value,
        expected_state_version: item.expected_state_version,
        proposed_state_version: item.proposed_state_version,
        mutation_id: item.mutation_id,
      }));
      const restrictedWithoutHash = {
        schema_version: 'OWNER_CANARY_BLOCKED_FORENSIC_V1',
        ai_core_request_id: runtimeResponse.request_id,
        runtime: {
          sha: RUNTIME_SHA,
          version: '1.2.3',
          contract_sha: CONTRACT_SHA,
          canonicalization_version: CANONICALIZATION_VERSION,
        },
        resolved: {
          intent: 'engineering_solution',
          action: 'recommend_architecture',
          current_turn_facts_summary: [{
            field: 'daily_traffic', value_summary: 800,
            source: 'current_turn_extraction',
          }],
        },
        controller: {
          action: 'answer_with_recommendation',
          answer_required: true,
          question_required: false,
        },
        lab: {
          decision_package_summary: { decision_type: 'engineering_recommendation' },
          decision_package_sha: runtimeResponse.decision_package_hash,
        },
        projection: { sha: sha256({ projection: 'public-blocked' }) },
        semantic_coverage: {
          raw: { status: 'partial', reason_codes: ['required_content_missing'] },
          final: { status: 'partial', reason_codes: ['required_content_missing'] },
        },
        executor: {
          name: 'qwen', raw_answer: runtimeResponse.answer, request_count: 1,
        },
        repair: {
          applied: runtimeResponse.repair_result.applied,
          method: runtimeResponse.repair_result.method,
          repaired_answer: runtimeResponse.answer,
          reason_codes: [...repairCodes].reverse(),
        },
        evaluation: {
          raw: {
            status: 'review_required', reason_codes: ['required_content_missing'],
          },
          final: { status: 'fail', reason_codes: ['required_content_missing'] },
        },
        mutation: {
          proposed: mutationSummary.length > 0,
          summary: mutationSummary,
        },
        publication: {
          candidate_status: 'blocked',
          blocking_predicate: 'final_evaluation_status_must_equal_pass',
        },
      };
      envelope.restricted_forensic = {
        ...restrictedWithoutHash,
        evidence_sha256: sha256(restrictedWithoutHash),
      };
      response.end(JSON.stringify(envelope));
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
async function withSite(publicEnabled, task, options = {}) {
  runIndex += 1;
  const port = 3300 + runIndex;
  const dbPath = path.join(work, `dialog-${runIndex}.sqlite`);
  const forensicDbPath = path.join(work, `public-forensic-${runIndex}.sqlite`);
  const inheritedEnv = { ...process.env };
  for (const key of Object.keys(inheritedEnv)) {
    if (key.startsWith('AI_CORE_')
      || key.startsWith('AI_WIDGET_')
      || key === 'ROSPARK_DEPLOYED_SITE_SHA') {
      delete inheritedEnv[key];
    }
  }
  const runtimeRoot = options.runtimeRoot ?? isolatedRuntimeRoot;
  if (runtimeRoot === isolatedRuntimeRoot) {
    assertIsolatedRuntimeRoot(runtimeRoot);
  }
  const childEnv = {
    ...inheritedEnv,
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
    PUBLIC_BLOCKED_SAFE_FORENSIC_DB_PATH: forensicDbPath,
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
    ...options.env,
  };
  delete childEnv.ROSPARK_DEPLOYED_SITE_SHA;
  if (options.runtimeDeployedSiteSha !== undefined) {
    childEnv.ROSPARK_DEPLOYED_SITE_SHA = options.runtimeDeployedSiteSha;
  }
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) delete childEnv[key];
  }
  if (Object.hasOwn(options.env ?? {}, 'AI_CORE_PUBLIC_SITE_SHA')
    && options.env.AI_CORE_PUBLIC_SITE_SHA === undefined) {
    assert.equal(
      Object.hasOwn(childEnv, 'AI_CORE_PUBLIC_SITE_SHA'),
      false,
      'CHILD_ENV_PUBLIC_SITE_PIN_MUST_BE_ABSENT',
    );
  }
  const child = spawn(
    process.execPath,
    [nextCli, 'start', '-p', String(port)],
    {
      cwd: runtimeRoot,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  try {
    await waitForSite(port);
    await task({
      port,
      dbPath,
      forensicDbPath,
      readSiteLogs: () => logs,
    });
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

async function assertCompiledReleasePinFailure(options, expectedReasonCode) {
  await withSite(true, async ({ port, dbPath }) => {
    const before = { ...counts };
    const result = await chat(port, randomUUID());
    assert.equal(result.response.status, 503);
    assert.equal(JSON.parse(result.answer).code, 'PUBLIC_AI_CORE_ERROR');
    assert.equal(counts.core, before.core);
    assert.equal(counts.legacy, before.legacy);
    const db = new Database(dbPath, { readonly: true });
    const terminal = db.prepare(`
      SELECT route, error_code, runtime_telemetry_ref
      FROM ai_widget_server_events
      WHERE turn_id = ? AND event_name = 'answer_error'
    `).get(result.turnId);
    assert.deepEqual(terminal, {
      route: 'public_ai_core',
      error_code: expectedReasonCode,
      runtime_telemetry_ref: null,
    });
    db.close();
  }, options);
}

// OFF: an ordinary visitor remains on the exact legacy route.
await withSite(false, async ({ port, readSiteLogs }) => {
  const before = { ...counts };
  const result = await chat(port, '11111111-1111-4111-8111-111111111111');
  assert.equal(result.response.status, 200, `${result.answer}\n${readSiteLogs()}`);
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

// The compiled handler uses the immutable build identity when the runtime
// process has no ROSPARK_DEPLOYED_SITE_SHA. The successful scenario above is
// intentionally executed with that variable absent.

// A false runtime ROSPARK_DEPLOYED_SITE_SHA cannot replace build provenance.
coreMode = 'success';
await withSite(true, async ({ port }) => {
  const before = { ...counts };
  const result = await chat(port, randomUUID());
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('x-ai-widget-route'), 'public_ai_core');
  assert.equal(result.answer, '2+2 = 4.');
  assert.equal(counts.core, before.core + 1);
}, { runtimeDeployedSiteSha: 'f'.repeat(40) });

// Precise safe diagnostics stay in terminal telemetry and are not exposed in
// the public JSON response.
await assertCompiledReleasePinFailure({
  env: { AI_CORE_PUBLIC_SITE_SHA: 'c'.repeat(40) },
}, 'AI_CORE_PUBLIC_SITE_PIN_MISMATCH');
await assertCompiledReleasePinFailure({
  env: { AI_CORE_PUBLIC_GATEWAY_SHA: 'c'.repeat(40) },
}, 'AI_CORE_PUBLIC_GATEWAY_PIN_MISMATCH');
await assertCompiledReleasePinFailure({
  env: { AI_CORE_PUBLIC_RUNTIME_SHA: 'c'.repeat(40) },
}, 'AI_CORE_PUBLIC_RUNTIME_PIN_MISMATCH');
await assertCompiledReleasePinFailure({
  env: { AI_CORE_PUBLIC_CONTRACT_SHA: 'c'.repeat(40) },
}, 'AI_CORE_PUBLIC_CONTRACT_PIN_MISMATCH');

// Historical incident evidence: deleting the child-process pin was not enough
// while a visible .env.production supplied the valid value. Next.js loaded it
// and the compiled production handler returned the false HTTP 200 observed in
// the failed maintenance acceptance.
await withSite(true, async ({ port }) => {
  const before = { ...counts };
  const result = await chat(port, randomUUID());
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('x-ai-widget-route'), 'public_ai_core');
  assert.equal(counts.core, before.core + 1);
}, {
  runtimeRoot: historicalEnvRuntimeRoot,
  env: { AI_CORE_PUBLIC_SITE_SHA: undefined },
});

// The isolated runtime has no deployment env files. The exact same compiled
// production handler now observes the genuinely missing pin and fails closed.
await assertCompiledReleasePinFailure({
  env: { AI_CORE_PUBLIC_SITE_SHA: undefined },
}, 'AI_CORE_PUBLIC_SITE_PIN_MISMATCH');

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
coreMode = 'blocked';
await withSite(true, async ({
  port,
  dbPath,
  forensicDbPath,
  readSiteLogs,
}) => {
  const before = { ...counts };
  const userText = 'Инженерная проверка: 800 автомобилей, два въезда.';
  const result = await chat(
    port,
    '66666666-6666-4666-8666-666666666666',
    userText,
  );
  assert.equal(result.response.status, 503);
  assert.equal(counts.core, before.core + 1);
  assert.equal(counts.legacy, before.legacy);
  const dialogDb = new Database(dbPath, { readonly: true });
  const terminal = dialogDb.prepare(`
    SELECT route, error_code, ai_core_request_id, runtime_telemetry_ref
    FROM ai_widget_server_events
    WHERE turn_id = ? AND event_name = 'answer_error'
  `).get(result.turnId);
  assert.equal(terminal.route, 'public_ai_core');
  assert.equal(
    terminal.error_code,
    'AI_CORE_FINAL_GATE_BLOCKED',
    readSiteLogs(),
  );
  assert.match(terminal.runtime_telemetry_ref, /^public-blocked:/);
  dialogDb.close();
  const forensicDb = new Database(forensicDbPath, { readonly: true });
  const forensic = forensicDb.prepare(`
    SELECT route, evidence_json FROM public_blocked_safe_forensics
    WHERE ai_core_request_id = ?
  `).get(terminal.ai_core_request_id);
  assert.equal(forensic.route, 'public_ai_core');
  const stored = JSON.parse(forensic.evidence_json);
  assert.equal(stored.executor_request_count, 1);
  assert.equal(stored.retries, 0);
  assert.equal(stored.fallbacks, 0);
  assert.equal(stored.projection_sha, sha256({ projection: 'public-blocked' }));
  assert.doesNotMatch(forensic.evidence_json, new RegExp(userText));
  assert.equal(Object.hasOwn(stored, 'raw_answer'), false);
  assert.equal(Object.hasOwn(stored, 'repaired_answer'), false);
  forensicDb.close();
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

await new Promise((resolve, reject) => {
  gateway.close((error) => (error ? reject(error) : resolve()));
});
console.log(JSON.stringify({
  schema: 'rospark-public-ai-core-http-harness-v1',
  off_legacy_route: 'pass',
  on_public_ai_core_route: 'pass',
  duplicate_answer_count: 0,
  duplicate_mutation_count: 0,
  transport_fallback_to_legacy: 'pass',
  fallback_trace: 'pass',
  public_blocked_safe_forensic: 'pass',
  terminal_public_route: 'pass',
  compiled_handler_release_pin_gate: 'pass',
  isolated_runtime_env_files_visible: false,
  correct_public_site_pin: 'pass',
  missing_public_site_pin: 'http_503_exact_reason',
  wrong_public_site_pin: 'http_503_exact_reason',
  runtime_deployed_site_sha_absent: 'pass',
  runtime_deployed_site_sha_wrong_ignored: 'pass',
  historical_env_file_false_200: 'pass',
  precise_release_pin_reason_codes: 'pass',
  rollback_off: 'pass',
  site_b_lifecycle: 'pass',
  owner_canary_enabled: false,
  model_requests: 0,
  counts,
}));
rmSync(work, { recursive: true, force: true });
