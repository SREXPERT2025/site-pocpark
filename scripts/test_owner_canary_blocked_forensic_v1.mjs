import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  AI_CORE_RUNTIME_VERSION,
  CANONICALIZATION_VERSION,
  OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
  sha256,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS,
  cleanupExpiredOwnerCanaryRestrictedForensics,
  getOwnerCanaryRestrictedForensicByRequestId,
  recordOwnerCanaryRestrictedForensic,
  runOwnerCanaryRestrictedForensicMigrations,
} from '../app/lib/owner-canary-restricted-forensic-core.ts';
import {
  beginAiWidgetTurn,
  failAiWidgetTurn,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';
import {
  listAiWidgetServerEvents,
  recordAiWidgetServerEvent,
} from '../app/lib/ai-widget-server-events-core.ts';

const nowMs = Date.UTC(2026, 7, 10, 13, 0, 0);
const ids = {
  turn: 'turn:owner-forensic-00000001',
  session: 'session:owner-forensic-0001',
  request: 'site-request:owner-forensic-01',
  conversation: 'thread:owner-forensic-000001',
  message: 'message:owner-forensic-00001',
  aiCore: 'aicore:owner-forensic-000001',
};
const rawAnswer = 'Сырой ответ Qwen для закрытого owner forensic.';
const repairedAnswer = 'Исправленный ответ Qwen для закрытого owner forensic.';
const fullUserText = 'Полный текст пользователя не должен попасть в Site B.';

function evidenceWithHash(overrides = {}) {
  const evidence = {
    schema_version: OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
    ai_core_request_id: ids.aiCore,
    runtime: {
      sha: AI_CORE_RUNTIME_SHA,
      version: AI_CORE_RUNTIME_VERSION,
      contract_sha: AI_CORE_CONTRACT_SHA,
      canonicalization_version: CANONICALIZATION_VERSION,
    },
    resolved: {
      intent: 'engineering_solution',
      action: 'recommend_architecture',
      current_turn_facts_summary: [{
        field: 'daily_traffic',
        value_summary: 800,
        source: 'current_turn_extraction',
      }],
    },
    controller: {
      action: 'answer_with_recommendation',
      answer_required: true,
      question_required: false,
    },
    lab: {
      decision_package_summary: {
        decision_type: 'engineering_recommendation',
        primary_identifier: 'license_plate',
      },
      decision_package_sha: '1'.repeat(64),
    },
    projection: { sha: '2'.repeat(64) },
    semantic_coverage: {
      raw: { status: 'partial', reason_codes: ['fallback_missing'] },
      final: { status: 'partial', reason_codes: ['fallback_missing'] },
    },
    executor: { name: 'qwen', raw_answer: rawAnswer, request_count: 1 },
    repair: {
      applied: true,
      method: 'deterministic',
      repaired_answer: repairedAnswer,
      reason_codes: ['fallback_missing'],
    },
    evaluation: {
      raw: { status: 'review_required', reason_codes: ['fallback_missing'] },
      final: { status: 'fail', reason_codes: ['fallback_missing'] },
    },
    mutation: {
      proposed: true,
      summary: [{
        mutation_id: 'mutation:owner-forensic-0001',
        target: 'thread_state',
        operation: 'set_confirmed_fact',
        field: 'daily_traffic',
        value_kind: 'int',
        expected_state_version: 1,
        proposed_state_version: 2,
      }],
    },
    publication: {
      candidate_status: 'blocked',
      blocking_predicate: 'final_evaluation_status_must_equal_pass',
    },
    ...overrides,
  };
  return { ...evidence, evidence_sha256: sha256(evidence) };
}

const db = new Database(':memory:');
runOwnerCanaryRestrictedForensicMigrations(db);
runOwnerCanaryRestrictedForensicMigrations(db);
const evidence = evidenceWithHash();
const written = recordOwnerCanaryRestrictedForensic(db, {
  turnId: ids.turn,
  conversationThreadId: ids.conversation,
  messageId: ids.message,
  aiCoreRequestId: ids.aiCore,
  evidence,
  nowMs,
});
assert.equal(written.created, true);
assert.equal(new Date(written.expiresAt).getTime() - nowMs,
  OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS);
assert.equal(recordOwnerCanaryRestrictedForensic(db, {
  turnId: ids.turn,
  conversationThreadId: ids.conversation,
  messageId: ids.message,
  aiCoreRequestId: ids.aiCore,
  evidence,
  nowMs,
}).created, false);

const restored = getOwnerCanaryRestrictedForensicByRequestId(
  db,
  ids.aiCore,
  nowMs,
);
assert.ok(restored);
assert.equal(restored.evidence.executor.raw_answer, rawAnswer);
assert.equal(restored.evidence.repair.repaired_answer, repairedAnswer);
assert.equal(restored.evidence.resolved.intent, 'engineering_solution');
assert.equal(restored.evidence.resolved.action, 'recommend_architecture');
assert.equal(restored.evidence.controller.action, 'answer_with_recommendation');
assert.equal(restored.evidence.lab.decision_package_sha, '1'.repeat(64));
assert.equal(restored.evidence.projection.sha, '2'.repeat(64));
assert.equal(restored.evidence.mutation.proposed, true);
assert.equal(restored.evidence.publication.candidate_status, 'blocked');
assert.doesNotMatch(JSON.stringify(restored.evidence), new RegExp(fullUserText));

assert.throws(() => recordOwnerCanaryRestrictedForensic(db, {
  turnId: ids.turn,
  conversationThreadId: ids.conversation,
  messageId: ids.message,
  aiCoreRequestId: ids.aiCore,
  evidence: evidenceWithHash({
    executor: { name: 'qwen', raw_answer: 'Другой ответ', request_count: 1 },
  }),
  nowMs,
}), /IDEMPOTENCY_CONFLICT/);
const secretEvidence = evidenceWithHash({
  controller: {
    action: 'answer_with_recommendation',
    answer_required: true,
    question_required: false,
    secret: 'should-not-be-stored',
  },
});
const secretDb = new Database(':memory:');
runOwnerCanaryRestrictedForensicMigrations(secretDb);
assert.throws(() => recordOwnerCanaryRestrictedForensic(
  secretDb,
  {
    turnId: 'turn:owner-forensic-secret-01',
    conversationThreadId: ids.conversation,
    messageId: 'message:owner-forensic-secret-1',
    aiCoreRequestId: ids.aiCore,
    evidence: secretEvidence,
    nowMs,
  },
), /FORBIDDEN_KEY/);

assert.equal(cleanupExpiredOwnerCanaryRestrictedForensics(
  db,
  nowMs + OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS,
), 1);
assert.equal(getOwnerCanaryRestrictedForensicByRequestId(
  db,
  ids.aiCore,
  nowMs + OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS,
), null);

// Site B stores only safe correlation metadata, never the user/raw answer.
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
recordAiWidgetServerEvent(eventDb, {
  turnId: ids.turn,
  eventName: 'turn_accepted',
  route: 'owner_ai_core',
  nowMs,
  idFactory: () => 'event:owner-forensic-accepted',
});
failAiWidgetTurn(eventDb, {
  turnId: ids.turn,
  errorCode: 'AI_CORE_FINAL_GATE_BLOCKED',
  elapsedMs: 100,
  nowMs: nowMs + 100,
});
recordAiWidgetServerEvent(eventDb, {
  turnId: ids.turn,
  eventName: 'answer_error',
  route: 'owner_ai_core',
  errorCode: 'AI_CORE_FINAL_GATE_BLOCKED',
  elapsedMs: 100,
  conversationThreadId: ids.conversation,
  messageId: ids.message,
  aiCoreRequestId: ids.aiCore,
  runtimeTelemetryRef: `owner-pre-gate:${ids.turn}`,
  nowMs: nowMs + 100,
  idFactory: () => 'event:owner-forensic-error-001',
});
const siteB = JSON.stringify(listAiWidgetServerEvents(eventDb, ids.turn));
assert.doesNotMatch(siteB, new RegExp(fullUserText));
assert.doesNotMatch(siteB, new RegExp(rawAnswer));
assert.doesNotMatch(siteB, new RegExp(repairedAnswer));
assert.match(siteB, new RegExp(ids.aiCore));

const apiSource = readFileSync(
  new URL('../app/lib/ai-widget-api.ts', import.meta.url),
  'utf8',
);
const dbSource = readFileSync(
  new URL(
    '../app/lib/owner-canary-restricted-forensic-database.ts',
    import.meta.url,
  ),
  'utf8',
);
assert.match(apiSource, /recordOwnerCanaryRestrictedForensic/);
assert.match(apiSource, /restrictedForensicFromError/);
assert.match(apiSource, /OWNER_RESTRICTED_FORENSIC_WRITE_FAILED/);
assert.match(dbSource, /owner-forensics\.sqlite/);
assert.match(dbSource, /mode: 0o700/);
assert.match(dbSource, /chmodSync\(filePath, 0o600\)/);

console.log([
  'owner canary blocked forensic v1 tests: ok',
  'restricted_fields=12/12',
  'retention_days=7',
  'site_b_raw_content=0',
  'secrets=excluded',
  'model_requests=0',
].join('; '));
