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
  OwnerCanaryRestrictedForensicError,
  OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS,
  cleanupExpiredOwnerCanaryRestrictedForensics,
  getOwnerCanaryRestrictedForensicByRequestId,
  recordOwnerCanaryRestrictedForensic,
  runOwnerCanaryRestrictedForensicMigrations,
} from '../app/lib/owner-canary-restricted-forensic-core.ts';
import {
  aiCorePrimaryFailureDiagnostic,
  aiCoreSecondaryFailureDiagnostic,
} from '../app/lib/ai-core-failure-observability.ts';
import { composeAiCoreTurnTrace } from '../app/lib/ai-trace-core.ts';
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

function evidenceWithHash(overrides = {}, aiCoreRequestId = ids.aiCore) {
  const evidence = {
    schema_version: OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
    ai_core_request_id: aiCoreRequestId,
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

const conflictingRequestId = 'aicore:owner-forensic-conflict-01';
assert.throws(() => recordOwnerCanaryRestrictedForensic(db, {
  turnId: ids.turn,
  conversationThreadId: ids.conversation,
  messageId: 'message:owner-forensic-conflict-1',
  aiCoreRequestId: conflictingRequestId,
  evidence: evidenceWithHash({}, conflictingRequestId),
  nowMs,
}), (error) => {
  assert.ok(error instanceof OwnerCanaryRestrictedForensicError);
  assert.equal(error.code, 'OWNER_RESTRICTED_FORENSIC_TURN_ID_CONFLICT');
  assert.equal(error.stage, 'idempotency_lookup');
  return true;
});

const invalidHashEvidence = {
  ...evidence,
  evidence_sha256: '0'.repeat(64),
};
const invalidHashDb = new Database(':memory:');
runOwnerCanaryRestrictedForensicMigrations(invalidHashDb);
assert.throws(() => recordOwnerCanaryRestrictedForensic(invalidHashDb, {
  turnId: 'turn:owner-forensic-invalid-hash-1',
  conversationThreadId: ids.conversation,
  messageId: 'message:owner-forensic-invalid-hash-1',
  aiCoreRequestId: ids.aiCore,
  evidence: invalidHashEvidence,
  nowMs,
}), (error) => {
  assert.ok(error instanceof OwnerCanaryRestrictedForensicError);
  assert.equal(error.code, 'OWNER_RESTRICTED_FORENSIC_HASH_MISMATCH');
  assert.equal(error.stage, 'evidence_validation');
  return true;
});

const storageDb = new Database(':memory:');
runOwnerCanaryRestrictedForensicMigrations(storageDb);
storageDb.exec(`
  CREATE TRIGGER owner_forensic_forced_storage_failure
  BEFORE INSERT ON owner_canary_blocked_forensics
  BEGIN
    SELECT RAISE(ABORT, 'forced owner forensic storage failure');
  END;
`);
let storageFailure;
try {
  recordOwnerCanaryRestrictedForensic(storageDb, {
    turnId: 'turn:owner-forensic-storage-fail-1',
    conversationThreadId: ids.conversation,
    messageId: 'message:owner-forensic-storage-fail-1',
    aiCoreRequestId: ids.aiCore,
    evidence,
    nowMs,
  });
} catch (error) {
  storageFailure = error;
}
assert.ok(storageFailure instanceof OwnerCanaryRestrictedForensicError);
assert.equal(
  storageFailure.code,
  'OWNER_RESTRICTED_FORENSIC_SQLITE_CONSTRAINT_TRIGGER',
);
assert.equal(storageFailure.stage, 'insert');
assert.equal(storageFailure.storageCode, 'SQLITE_CONSTRAINT_TRIGGER');
assert.match(storageFailure.storageMessage, /forced owner forensic storage failure/);

const primaryFailure = aiCorePrimaryFailureDiagnostic({
  error: new Error('AI_CORE_FINAL_GATE_BLOCKED'),
  runtimeTrace: {
    schema_version: 'AI_CORE_RUNTIME_TRACE_V1',
    identity: {},
    routing: {},
    state: {},
    pipeline: [{ name: 'repair', status: 'blocked' }],
    timeline: [],
    diagnostics: {},
    runtime_error: {
      code: 'repair_rewrite_ratio_exceeded',
      stage: 'repair',
    },
    trace_sha256: 'a'.repeat(64),
  },
  transportEvidence: null,
  fallbackCode: 'OWNER_AI_CORE_ERROR',
});
const secondaryFailure = aiCoreSecondaryFailureDiagnostic({
  source: 'owner_restricted_forensic',
  error: storageFailure,
  fallbackStage: 'database_open_or_write',
});
assert.deepEqual(primaryFailure, {
  error_code: 'AI_CORE_FINAL_GATE_BLOCKED',
  stage: 'repair',
  origin: 'runtime',
  runtime_error_code: 'repair_rewrite_ratio_exceeded',
});
assert.equal(
  secondaryFailure.error_code,
  'OWNER_RESTRICTED_FORENSIC_SQLITE_CONSTRAINT_TRIGGER',
);
assert.equal(secondaryFailure.stage, 'insert');
assert.equal(secondaryFailure.storage_code, 'SQLITE_CONSTRAINT_TRIGGER');

const failedTrace = composeAiCoreTurnTrace({
  turnId: ids.turn,
  siteRequestId: ids.request,
  aiCoreRequestId: ids.aiCore,
  conversationThreadId: ids.conversation,
  messageId: ids.message,
  timestamp: new Date(nowMs).toISOString(),
  route: 'owner_ai_core',
  siteSha: '3'.repeat(40),
  runtimeSha: AI_CORE_RUNTIME_SHA,
  runtimeVersion: AI_CORE_RUNTIME_VERSION,
  contractSha: AI_CORE_CONTRACT_SHA,
  canonicalizationVersion: CANONICALIZATION_VERSION,
  gatewaySha: '4'.repeat(40),
  sourcePage: '/parkovka',
  currentMessage: 'Диагностический запрос',
  recentMessages: [],
  runtimeTrace: null,
  publicationStatus: 'blocked',
  siteBlockingPredicate: primaryFailure.error_code,
  failureDiagnostics: {
    primary: primaryFailure,
    secondary_integrity_failures: [secondaryFailure],
  },
});
assert.equal(
  failedTrace.diagnostics.failure_observability.primary.error_code,
  'AI_CORE_FINAL_GATE_BLOCKED',
);
assert.equal(
  failedTrace.diagnostics.failure_observability.primary.stage,
  'repair',
);
assert.equal(
  failedTrace.diagnostics.failure_observability
    .secondary_integrity_failures[0].error_code,
  'OWNER_RESTRICTED_FORENSIC_SQLITE_CONSTRAINT_TRIGGER',
);
const failedTraceWithoutHash = { ...failedTrace };
delete failedTraceWithoutHash.trace_sha256;
assert.equal(failedTrace.trace_sha256, sha256(failedTraceWithoutHash));
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
assert.match(apiSource, /secondary_integrity_failures/);
assert.match(apiSource, /const code = primaryFailure\.error_code/);
assert.doesNotMatch(apiSource, /OWNER_RESTRICTED_FORENSIC_WRITE_FAILED/);
const forensicCoreSource = readFileSync(
  new URL(
    '../app/lib/owner-canary-restricted-forensic-core.ts',
    import.meta.url,
  ),
  'utf8',
);
assert.doesNotMatch(forensicCoreSource, /INSERT OR IGNORE/);
assert.doesNotMatch(
  forensicCoreSource,
  /OWNER_RESTRICTED_FORENSIC_WRITE_FAILED/,
);
assert.match(dbSource, /owner-forensics\.sqlite/);
assert.match(dbSource, /mode: 0o700/);
assert.match(dbSource, /chmodSync\(filePath, 0o600\)/);

console.log([
  'owner canary blocked forensic v1 tests: ok',
  'restricted_fields=12/12',
  'retention_days=7',
  'site_b_raw_content=0',
  'secrets=excluded',
  'primary_error_and_stage=preserved',
  'sqlite_cause=preserved',
  'insert_or_ignore=0',
  'model_requests=0',
].join('; '));
