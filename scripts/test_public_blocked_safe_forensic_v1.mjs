import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  AI_CORE_RUNTIME_VERSION,
  CANONICALIZATION_VERSION,
  PUBLIC_BLOCKED_SAFE_FORENSIC_VERSION,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  PUBLIC_BLOCKED_SAFE_FORENSIC_RETENTION_MS,
  cleanupExpiredPublicBlockedSafeForensics,
  getPublicBlockedSafeForensicByRequestId,
  recordPublicBlockedSafeForensic,
  runPublicBlockedSafeForensicMigrations,
} from '../app/lib/public-blocked-safe-forensic-core.ts';
import {
  beginAiWidgetTurn,
  failAiWidgetTurn,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';
import {
  listAiWidgetServerEvents,
  recordAiWidgetServerEvent,
} from '../app/lib/ai-widget-server-events-core.ts';

const nowMs = Date.UTC(2026, 7, 11, 6, 21, 2);
const ids = {
  turn: 'turn:public-blocked-00000001',
  session: 'session:public-blocked-0001',
  request: 'site-request:public-blocked-01',
  aiCore: 'aicore:public-blocked-000001',
};
const fullUserText = 'Полный публичный инженерный вопрос с PII не сохранять.';
const rawAnswer = 'Полный сырой ответ Qwen не сохранять.';
const repairedAnswer = 'Полный исправленный ответ не сохранять.';
const evidence = {
  schema_version: PUBLIC_BLOCKED_SAFE_FORENSIC_VERSION,
  ai_core_request_id: ids.aiCore,
  route: 'public_ai_core',
  site_sha: 'f71522233be7bf131747e10491c8782c4548ff95',
  runtime_sha: AI_CORE_RUNTIME_SHA,
  runtime_version: AI_CORE_RUNTIME_VERSION,
  contract_sha: AI_CORE_CONTRACT_SHA,
  canonicalization_version: CANONICALIZATION_VERSION,
  resolved_intent: 'engineering_solution',
  resolved_action: 'recommend_architecture',
  extracted_facts: [
    { field: 'daily_traffic', value_kind: 'integer' },
    { field: 'object_type', value_kind: 'string' },
  ],
  decision_package_sha:
    'd6f6f3505a689790916c262cb1618670b05777a4084c4fa7cb45c625759a08cd',
  projection_sha:
    '19f24a53536513169d97e14e0dc15e54adbe676b1c0aa12a0a980568eb55cfd2',
  semantic_coverage: {
    raw_status: 'partial',
    raw_reason_codes: ['fallback_missing'],
    final_status: 'complete',
    final_reason_codes: [],
  },
  executor: 'qwen',
  executor_request_count: 1,
  retries: 0,
  fallbacks: 0,
  raw_evaluation_status: 'review_required',
  raw_evaluation_reason_codes: ['fallback_missing'],
  repair_applied: true,
  repair_reason_codes: ['fallback_missing', 'operator_role_missing'],
  final_evaluation_status: 'fail',
  final_evaluation_reason_codes: ['operator_role_missing'],
  runtime_publication_status: 'blocked',
  site_blocking_predicate: 'AI_CORE_FINAL_GATE_BLOCKED',
  proposed_mutation: {
    proposed: true,
    summary: [{
      target: 'thread_state', operation: 'set_confirmed_fact',
      field: 'daily_traffic', value_kind: 'integer',
      expected_state_version: 0, proposed_state_version: 1,
    }],
  },
  durable_commit_count: 0,
  duplicate_execution_count: 0,
  duplicate_mutation_count: 0,
  latency_stages: { total_ms: 5031, executor_ms: 4900 },
};

const forensicDb = new Database(':memory:');
runPublicBlockedSafeForensicMigrations(forensicDb);
runPublicBlockedSafeForensicMigrations(forensicDb);
const written = recordPublicBlockedSafeForensic(forensicDb, {
  turnId: ids.turn,
  aiCoreRequestId: ids.aiCore,
  evidence,
  nowMs,
});
assert.equal(written.created, true);
assert.equal(recordPublicBlockedSafeForensic(forensicDb, {
  turnId: ids.turn,
  aiCoreRequestId: ids.aiCore,
  evidence,
  nowMs,
}).created, false);
const restored = getPublicBlockedSafeForensicByRequestId(
  forensicDb,
  ids.aiCore,
  nowMs,
);
assert.ok(restored);
assert.equal(restored.route, 'public_ai_core');
assert.equal(restored.evidence.decision_package_sha,
  evidence.decision_package_sha);
assert.equal(restored.evidence.projection_sha, evidence.projection_sha);
assert.equal(restored.evidence.executor_request_count, 1);
const storedJson = JSON.stringify(restored.evidence);
for (const forbidden of [fullUserText, rawAnswer, repairedAnswer]) {
  assert.doesNotMatch(storedJson, new RegExp(forbidden));
}
const secretDb = new Database(':memory:');
runPublicBlockedSafeForensicMigrations(secretDb);
assert.throws(() => recordPublicBlockedSafeForensic(
  secretDb,
  {
    turnId: 'turn:public-blocked-secret-01',
    aiCoreRequestId: 'aicore:public-blocked-secret1',
    evidence: {
      ...evidence,
      ai_core_request_id: 'aicore:public-blocked-secret1',
      raw_answer: rawAnswer,
    },
    nowMs,
  },
), /FORBIDDEN_KEY/);
assert.equal(cleanupExpiredPublicBlockedSafeForensics(
  forensicDb,
  nowMs + PUBLIC_BLOCKED_SAFE_FORENSIC_RETENTION_MS,
), 1);

const eventDb = new Database(':memory:');
eventDb.pragma('foreign_keys = ON');
runAiWidgetLogMigrations(eventDb);
beginAiWidgetTurn(eventDb, {
  turnId: ids.turn,
  sessionId: ids.session,
  requestId: ids.request,
  sourcePage: '/parkovka',
  userContent: fullUserText,
  runtimeMode: 'production',
  nowMs,
});
failAiWidgetTurn(eventDb, {
  turnId: ids.turn,
  errorCode: 'AI_CORE_FINAL_GATE_BLOCKED',
  elapsedMs: 5072,
  nowMs: nowMs + 5072,
});
recordAiWidgetServerEvent(eventDb, {
  turnId: ids.turn,
  eventName: 'answer_error',
  route: 'public_ai_core',
  errorCode: 'AI_CORE_FINAL_GATE_BLOCKED',
  elapsedMs: 5072,
  aiCoreRequestId: ids.aiCore,
  runtimeTelemetryRef: `public-blocked:${ids.aiCore}`,
  nowMs: nowMs + 5072,
  idFactory: () => 'event:public-blocked-error-001',
});
const terminal = listAiWidgetServerEvents(eventDb, ids.turn).at(-1);
assert.equal(terminal.route, 'public_ai_core');
assert.equal(terminal.aiCoreRequestId, ids.aiCore);
assert.doesNotMatch(JSON.stringify(terminal), new RegExp(fullUserText));

const apiSource = readFileSync(
  new URL('../app/lib/ai-widget-api.ts', import.meta.url),
  'utf8',
);
const databaseSource = readFileSync(
  new URL('../app/lib/public-blocked-safe-forensic-database.ts', import.meta.url),
  'utf8',
);
assert.match(apiSource, /recordPublicBlockedSafeForensic/);
assert.match(apiSource, /route: aiCoreAudience === 'public_ai_core'/);
assert.match(databaseSource, /public-blocked-forensics\.sqlite/);
assert.match(databaseSource, /chmodSync\(filePath, 0o600\)/);

console.log([
  'public blocked safe forensic v1 tests: ok',
  'public_route=retained',
  'dp_projection=retained',
  'full_user_text=excluded',
  'raw_answers=excluded',
  'retention_days=7',
  'model_requests=0',
].join('; '));
