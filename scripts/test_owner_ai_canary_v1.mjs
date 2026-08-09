import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_CONTRACT_VERSION,
  AI_CORE_OWNER_MODEL,
  AI_CORE_RUNTIME_SHA,
  AI_CORE_RUNTIME_VERSION,
  CANONICALIZATION_VERSION,
  acknowledgeOwnerCanaryMutations,
  buildOwnerCanaryCoreRequest,
  callOwnerCanaryRuntime,
  canonicalJson,
  ownerCanaryRuntimeConfig,
  preGateTelemetryFromError,
  sha256,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  clearOwnerCanaryCookieHeader,
  issueOwnerCanarySession,
  mapSiteIdentity,
  OWNER_AI_CANARY_COOKIE,
  ownerCanaryCookieHeader,
  selectOwnerCanaryAudience,
  verifyOwnerCanarySession,
} from '../app/lib/owner-ai-canary-core.ts';
import {
  appendOwnerCanaryHistory,
  applyOwnerCanaryMutationBatch,
  ensureOwnerCanaryThread,
  getOwnerCanaryPreGateTelemetry,
  getOwnerCanaryRuntimeResponse,
  listOwnerCanaryHistory,
  ownerCanarySessionRevoked,
  recordOwnerCanaryPreGateTelemetry,
  recordOwnerCanaryRuntimeTelemetry,
  recordOwnerCanaryTelemetry,
  registerOwnerCanaryMessage,
  revokeOwnerCanarySession,
  runOwnerAiCanaryMigrations,
  saveOwnerCanaryRuntimeResponse,
} from '../app/lib/owner-ai-canary-state.ts';
import {
  beginAiWidgetTurn,
  completeAiWidgetTurn,
  failAiWidgetTurn,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';
import {
  listAiWidgetServerEvents,
  recordAiWidgetServerEvent,
} from '../app/lib/ai-widget-server-events-core.ts';

const credential = 'owner-credential-that-is-at-least-32-bytes';
const env = {
  AI_CORE_OWNER_CANARY_ENABLED: 'true',
  AI_CORE_OWNER_CANARY_CREDENTIAL: credential,
  AI_CORE_OWNER_CANARY_COOKIE_KEY:
    'cookie-signing-key-that-is-at-least-32-bytes',
  AI_CORE_OWNER_CANARY_SESSION_VERSION: 'v1',
  AI_CORE_IDENTITY_HMAC_KEY:
    'identity-mapping-key-that-is-at-least-32-bytes',
  AI_CORE_OWNER_CANARY_URL: 'https://rsp-ai-gw-prod.example.ts.net',
  AI_CORE_OWNER_CANARY_SECRET:
    'gateway-owner-secret-that-is-at-least-32-bytes',
  AI_CORE_OWNER_CANARY_RUNTIME_SHA: AI_CORE_RUNTIME_SHA,
  AI_CORE_OWNER_CANARY_CONTRACT_SHA: AI_CORE_CONTRACT_SHA,
};
const nowMs = Date.UTC(2026, 7, 7, 12, 0, 0);

// Owner authentication is opt-in, signed, expiring and revocable.
const issued = issueOwnerCanarySession({
  credential,
  env,
  nowMs,
  ttlSeconds: 600,
  idFactory: () => '11111111-1111-4111-8111-111111111111',
});
assert.ok(verifyOwnerCanarySession({ token: issued.token, env, nowMs }));
assert.throws(
  () => issueOwnerCanarySession({ credential: 'wrong', env, nowMs }),
  /OWNER_CANARY_AUTH_DENIED/,
);
assert.equal(verifyOwnerCanarySession({
  token: `${issued.token.slice(0, -1)}x`, env, nowMs,
}), null);
assert.equal(verifyOwnerCanarySession({
  token: issued.token, env, nowMs: nowMs + 601_000,
}), null);
const cookie = ownerCanaryCookieHeader(issued.token, issued.ttlSeconds);
assert.match(cookie, new RegExp(`^${OWNER_AI_CANARY_COOKIE}=`));
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /Secure/);
assert.match(cookie, /SameSite=Strict/);
assert.match(clearOwnerCanaryCookieHeader(), /Max-Age=0/);
assert.doesNotMatch(cookie, new RegExp(credential));
assert.equal(selectOwnerCanaryAudience({
  cookieToken: issued.token,
  env: { ...env, AI_CORE_OWNER_CANARY_ENABLED: 'false' },
  nowMs,
}).audience, 'legacy');
assert.equal(selectOwnerCanaryAudience({
  cookieToken: null, env, nowMs,
}).audience, 'legacy');
assert.equal(selectOwnerCanaryAudience({
  cookieToken: issued.token, env, nowMs,
}).audience, 'owner_canary');

// Stable thread identity, immutable per-turn message identity.
const first = mapSiteIdentity({
  sessionId: 'c846e840-abcc-40b4-bd26-c0fdec276da9',
  turnId: '11111111-aaaa-4111-8111-111111111111',
  env,
});
const repeated = mapSiteIdentity({
  sessionId: 'c846e840-abcc-40b4-bd26-c0fdec276da9',
  turnId: '11111111-aaaa-4111-8111-111111111111',
  env,
});
const next = mapSiteIdentity({
  sessionId: 'c846e840-abcc-40b4-bd26-c0fdec276da9',
  turnId: '22222222-bbbb-4222-8222-222222222222',
  env,
});
assert.deepEqual(first, repeated);
assert.equal(first.conversationThreadId, next.conversationThreadId);
assert.notEqual(first.messageId, next.messageId);

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runAiWidgetLogMigrations(db);
runOwnerAiCanaryMigrations(db);
runOwnerAiCanaryMigrations(db);
assert.deepEqual(
  db.prepare('SELECT version FROM owner_ai_canary_migrations ORDER BY version')
    .all().map((row) => row.version),
  [1, 2, 3, 4],
);
let state = ensureOwnerCanaryThread(db, {
  conversationThreadId: first.conversationThreadId,
  siteSessionId: first.siteSessionId,
  nowMs,
});
const requestPayload = { currentMessage: 'Два въезда', noPii: true };
assert.equal(registerOwnerCanaryMessage(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  siteTurnId: first.siteTurnId,
  requestPayload,
  nowMs,
}).created, true);
assert.equal(registerOwnerCanaryMessage(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  siteTurnId: first.siteTurnId,
  requestPayload,
  nowMs,
}).created, false);
assert.throws(() => registerOwnerCanaryMessage(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  siteTurnId: first.siteTurnId,
  requestPayload: { currentMessage: 'conflict' },
  nowMs,
}), /IDEMPOTENCY_CONFLICT/);

appendOwnerCanaryHistory(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: 'history_user_00000001',
  role: 'user',
  content: 'Это торговый центр.',
  nowMs,
});
appendOwnerCanaryHistory(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: 'history_assistant_01',
  role: 'assistant',
  content: 'Сколько въездов?',
  nowMs: nowMs + 1,
});
assert.deepEqual(
  listOwnerCanaryHistory(db, first.conversationThreadId).map((item) => item.role),
  ['user', 'assistant'],
);

const coreRequest = buildOwnerCanaryCoreRequest({
  aiCoreRequestId: 'aicore_77777777-aaaa-4777-8777-777777777777',
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  parentMessageId: 'history_assistant_01',
  currentMessage: 'Два въезда',
  sourcePage: '/parkovka',
  pageContextIntentHint: { selectedProblem: 'Убрать ручные пропуска' },
  recentMessages: listOwnerCanaryHistory(db, first.conversationThreadId),
  state,
  siteRelease: '2f5560909d31aa9df732cab74f269c0259c15529',
  gatewayRelease: 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9',
  sentAt: '2026-08-07T12:00:00.000Z',
});
assert.equal(coreRequest.contract_version, AI_CORE_CONTRACT_VERSION);
assert.equal(coreRequest.canonicalization_version, CANONICALIZATION_VERSION);
assert.equal(coreRequest.dry_run, false);
assert.equal(coreRequest.payload.executor_policy.planned_executor, 'qwen');
assert.deepEqual(coreRequest.payload.executor_policy.allowed_executors, ['qwen']);
assert.deepEqual(coreRequest.payload.executor_policy.fallback_order, ['qwen']);
assert.equal(coreRequest.payload.executor_policy.max_model_fallbacks, 0);
assert.equal(coreRequest.request_payload_hash, sha256(coreRequest.payload));
assert.equal(coreRequest.payload.recent_messages.length, 2);
assert.equal(coreRequest.payload.intent_hints[0].confirmation_status, 'unconfirmed');
assert.equal(coreRequest.payload.intent_hints[1].confirmation_status, 'unconfirmed');
assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
const sameCoreRequest = buildOwnerCanaryCoreRequest({
  aiCoreRequestId: coreRequest.request_id,
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  parentMessageId: 'history_assistant_01',
  currentMessage: 'Два въезда',
  sourcePage: '/parkovka',
  pageContextIntentHint: { selectedProblem: 'Убрать ручные пропуска' },
  recentMessages: listOwnerCanaryHistory(db, first.conversationThreadId),
  state,
  siteRelease: coreRequest.site_release,
  gatewayRelease: coreRequest.gateway_release,
  sentAt: coreRequest.sent_at,
});
assert.equal(coreRequest.idempotency_key, sameCoreRequest.idempotency_key);
assert.equal(coreRequest.request_payload_hash, sameCoreRequest.request_payload_hash);

// The Site-built envelope is accepted by the exact packaged Runtime.
const utilityRequest = buildOwnerCanaryCoreRequest({
  aiCoreRequestId: 'aicore_utility_00000001',
  conversationThreadId: first.conversationThreadId,
  messageId: next.messageId,
  currentMessage: 'Сколько будет 2+2?',
  sourcePage: '/',
  recentMessages: [],
  state,
  siteRelease: '2f5560909d31aa9df732cab74f269c0259c15529',
  gatewayRelease: 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9',
  sentAt: '2026-08-07T12:00:00.000Z',
  dryRun: true,
});
const e2e = spawnSync(
  'python3',
  ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
  { input: JSON.stringify(utilityRequest), encoding: 'utf8' },
);
assert.equal(e2e.status, 0, e2e.stderr);
const e2eEnvelope = validateOwnerCanaryCoreResponse(
  JSON.parse(e2e.stdout), utilityRequest,
);
assert.equal(e2eEnvelope.response.answer, '2+2 = 4.');

const decisionPackage = {
  schema_version: '1.2', decision_type: 'not_required', next_question: null,
};
const runtimeResponse = {
  contract_version: AI_CORE_CONTRACT_VERSION,
  canonicalization_version: CANONICALIZATION_VERSION,
  success: true,
  request_id: coreRequest.request_id,
  response_id: 'response:1234567890abcdef',
  idempotency_key: coreRequest.idempotency_key,
  request_payload_hash: coreRequest.request_payload_hash,
  state_version_before: 0,
  state_version_after: 1,
  context_resolution: {},
  controller_decision: {},
  decision_package_schema: '1.2',
  decision_package: decisionPackage,
  decision_package_hash: sha256(decisionPackage),
  executor_trace: {
    planned_executor: 'qwen',
    attempts: [{
      attempt_index: 1, executor: 'qwen',
      started_at: '2026-08-07T12:00:00Z',
      finished_at: '2026-08-07T12:00:00.004Z',
      status: 'success', safe_error_code: null, latency_ms: 4,
      cost_bucket: 'local_low',
      decision_package_hash: sha256(decisionPackage), state_version: 0,
    }],
    final_executor: 'qwen', fallback_reason: 'none',
    decision_package_hash: sha256(decisionPackage), state_version: 0,
  },
  raw_answer_reference: 'rawref:1234567890abcdef',
  answer: 'Понял: два въезда.',
  repair_result: {
    applied: false, method: 'none', rewrite_ratio: 0,
    decision_package_hash: sha256(decisionPackage),
  },
  evaluation_result: {
    evaluated_candidate: 'final_visible_candidate', status: 'pass', reason_codes: [],
  },
  state_mutations: [{
    mutation_id: 'mutation:1234567890abcdef',
    target: 'thread_state', operation: 'set_confirmed_fact',
    field: 'entrances_count', value: 2,
    expected_state_version: 0, proposed_state_version: 1,
    source_message_id: first.messageId,
    provenance: {
      source_type: 'user_message', source_ref: first.messageId,
      confirmation_status: 'confirmed',
    },
    conflict_policy: 'record_conflict',
  }],
  next_question: null,
  component_versions: { context_integrity: '2.2' },
  telemetry: {
    trace_id: 'trace:owner:1', request_id: coreRequest.request_id,
    canonicalization_version: CANONICALIZATION_VERSION,
    route: 'ai_core', component_versions: { context_integrity: '2.2' },
    latency: { total_ms: 11, executor_ms: 4 },
    executor: {
      planned: 'qwen', final: 'qwen', attempt_count: 1,
      fallback_used: false, cost_bucket: 'local_low',
    },
    repair: { applied: false, method: 'none', rewrite_ratio: 0 },
    evaluation: { raw_status: 'pass', final_status: 'pass' },
    publication: { candidate_status: 'allowed', published: false },
  },
};
const envelope = {
  runtime_sha: AI_CORE_RUNTIME_SHA,
  runtime_version: AI_CORE_RUNTIME_VERSION,
  contract_sha: AI_CORE_CONTRACT_SHA,
  canonicalization_version: CANONICALIZATION_VERSION,
  model: AI_CORE_OWNER_MODEL,
  response: runtimeResponse,
};
assert.equal(
  validateOwnerCanaryCoreResponse(envelope, coreRequest).response.answer,
  runtimeResponse.answer,
);
const validatedEnvelope = validateOwnerCanaryCoreResponse(envelope, coreRequest);
assert.equal(
  validatedEnvelope.preGateTelemetry.decisionPackageSha,
  runtimeResponse.decision_package_hash,
);
assert.equal(
  validatedEnvelope.preGateTelemetry.projectionSourceSha,
  runtimeResponse.decision_package_hash,
);
assert.equal(validatedEnvelope.preGateTelemetry.executorRequestCount, 1);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope,
  runtime_sha: 'b9c58dbbd0cd28fcc0de9e2751b0ddd5a3a66763',
}, coreRequest), /AI_CORE_RUNTIME_SHA_MISMATCH/);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope, runtime_sha: '0'.repeat(40),
}, coreRequest), /AI_CORE_RUNTIME_SHA_MISMATCH/);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope, contract_sha: '0'.repeat(40),
}, coreRequest), /AI_CORE_CONTRACT_SHA_MISMATCH/);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope, canonicalization_version: 'CANONICAL_JSON_HASH_V0',
}, coreRequest), /AI_CORE_CANONICALIZATION_VERSION_UNSUPPORTED/);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope,
  response: {
    ...runtimeResponse,
    executor_trace: { ...runtimeResponse.executor_trace, final_executor: 'codex' },
  },
}, coreRequest), /EXECUTOR_POLICY_VIOLATION/);

const blockedEnvelope = structuredClone(envelope);
blockedEnvelope.response.evaluation_result.status = 'fail';
blockedEnvelope.response.evaluation_result.reason_codes = [
  'required_content_missing',
];
blockedEnvelope.response.telemetry.evaluation.raw_status = 'review_required';
blockedEnvelope.response.telemetry.evaluation.final_status = 'fail';
blockedEnvelope.response.telemetry.publication.candidate_status = 'blocked';
let blockedError;
try {
  validateOwnerCanaryCoreResponse(blockedEnvelope, coreRequest);
} catch (error) {
  blockedError = error;
}
assert.match(blockedError.message, /AI_CORE_FINAL_GATE_BLOCKED/);
const blockedTelemetry = preGateTelemetryFromError(blockedError);
assert.ok(blockedTelemetry);
assert.equal(blockedTelemetry.rawEvaluationStatus, 'review_required');
assert.equal(blockedTelemetry.finalEvaluationStatus, 'fail');
assert.deepEqual(blockedTelemetry.evaluationReasonCodes, [
  'required_content_missing',
]);
assert.equal(blockedTelemetry.repairApplied, false);
assert.equal(blockedTelemetry.repairStatus, 'none');
assert.equal(blockedTelemetry.publicationCandidateStatus, 'blocked');
assert.equal(blockedTelemetry.stateMutationProposed, true);

// Real client transport is exercised with a hermetic fetch. No model call.
const calls = [];
const fakeFetch = async (url, options) => {
  calls.push({ url, options });
  if (url.endsWith('/ack')) {
    return Response.json({
      accepted: true,
      runtime_sha: AI_CORE_RUNTIME_SHA,
      contract_sha: AI_CORE_CONTRACT_SHA,
      canonicalization_version: CANONICALIZATION_VERSION,
    });
  }
  return Response.json(envelope);
};
assert.equal(ownerCanaryRuntimeConfig(env).runtimeSha, AI_CORE_RUNTIME_SHA);
assert.throws(() => ownerCanaryRuntimeConfig({
  ...env, AI_CORE_OWNER_CANARY_URL: 'http://127.0.0.1:8788',
}), /URL_UNSAFE/);
const called = await callOwnerCanaryRuntime(coreRequest, {
  env, fetchImpl: fakeFetch,
});
assert.equal(called.runtime_sha, AI_CORE_RUNTIME_SHA);
assert.match(calls[0].options.headers.Authorization, /^Bearer /);
assert.doesNotMatch(JSON.stringify(calls), new RegExp(credential));
await assert.rejects(
  () => callOwnerCanaryRuntime(coreRequest, {
    env,
    fetchImpl: async () => Response.json(blockedEnvelope, { status: 200 }),
  }),
  (error) => {
    const preserved = preGateTelemetryFromError(error);
    assert.ok(preserved);
    assert.equal(preserved.finalEvaluationStatus, 'fail');
    assert.deepEqual(preserved.evaluationReasonCodes, [
      'required_content_missing',
    ]);
    return true;
  },
);

// Batch mutations are atomic and increment state exactly once.
const applied = applyOwnerCanaryMutationBatch(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  requestId: coreRequest.request_id,
  responseId: runtimeResponse.response_id,
  mutations: runtimeResponse.state_mutations,
  nowMs: nowMs + 1000,
});
assert.equal(applied.state.stateVersion, 1);
assert.equal(applied.state.confirmedProjectFacts[0].field, 'entrances_count');
assert.equal(applied.acknowledgement.acknowledgements[0].status, 'applied');
const appliedReplay = applyOwnerCanaryMutationBatch(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  requestId: coreRequest.request_id,
  responseId: runtimeResponse.response_id,
  mutations: runtimeResponse.state_mutations,
  nowMs: nowMs + 1500,
});
assert.equal(appliedReplay.accepted, true);
assert.deepEqual(appliedReplay.acknowledgement, applied.acknowledgement);
assert.equal(appliedReplay.state.stateVersion, 1);
await acknowledgeOwnerCanaryMutations(applied.acknowledgement, {
  env, fetchImpl: fakeFetch,
});
assert.equal(calls.filter((item) => item.url.endsWith('/ack')).length, 1);
const rejected = applyOwnerCanaryMutationBatch(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  requestId: coreRequest.request_id,
  responseId: 'response:fedcba0987654321',
  mutations: [{
    ...runtimeResponse.state_mutations[0],
    mutation_id: 'mutation:fedcba0987654321',
    field: 'exits_count',
  }],
  nowMs: nowMs + 2000,
});
assert.equal(rejected.accepted, false);
assert.equal(
  rejected.acknowledgement.acknowledgements[0].reason_code,
  'version_conflict',
);
assert.equal(rejected.state.stateVersion, 1);
await acknowledgeOwnerCanaryMutations(rejected.acknowledgement, {
  env, fetchImpl: fakeFetch,
});
assert.equal(calls.filter((item) => item.url.endsWith('/ack')).length, 2);

saveOwnerCanaryRuntimeResponse(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  idempotencyKey: coreRequest.idempotency_key,
  requestPayloadHash: coreRequest.request_payload_hash,
  response: envelope,
  visibleAnswer: runtimeResponse.answer,
});
const cached = getOwnerCanaryRuntimeResponse(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  idempotencyKey: coreRequest.idempotency_key,
});
assert.equal(cached.visibleAnswer, runtimeResponse.answer);
assert.equal(cached.requestPayloadHash, coreRequest.request_payload_hash);

// Site B accepted + terminal event and runtime telemetry remain linked.
const siteTurnId = '66666666-ffff-4666-8666-666666666666';
beginAiWidgetTurn(db, {
  turnId: siteTurnId,
  sessionId: '55555555-eeee-4555-8555-555555555555',
  requestId: '77777777-aaaa-4777-8777-777777777777',
  sourcePage: '/stati/test', userContent: 'Тест lifecycle',
  runtimeMode: 'production', nowMs,
});
recordAiWidgetServerEvent(db, {
  turnId: siteTurnId, eventName: 'turn_accepted', nowMs,
  idFactory: () => '88888888-bbbb-4888-8888-888888888888',
});
completeAiWidgetTurn(db, {
  turnId: siteTurnId, assistantContent: runtimeResponse.answer,
  route: 'owner_ai_core', elapsedMs: 11, nowMs: nowMs + 11,
});
const terminal = recordAiWidgetServerEvent(db, {
  turnId: siteTurnId, eventName: 'answer_completed',
  route: 'owner_ai_core', elapsedMs: 11, nowMs: nowMs + 11,
  idFactory: () => '99999999-cccc-4999-8999-999999999999',
});
recordOwnerCanaryTelemetry(db, {
  turnId: siteTurnId,
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  aiCoreRequestId: coreRequest.request_id,
  contractVersion: AI_CORE_CONTRACT_VERSION,
  runtimeSha: AI_CORE_RUNTIME_SHA,
  decisionPackageHash: runtimeResponse.decision_package_hash,
  plannedExecutor: 'qwen', finalExecutor: 'qwen',
  evaluationStatus: 'pass', repairStatus: 'not_applied',
  stateVersionBefore: 0, stateVersionAfter: 1,
  latencyMs: 11, siteTerminalEventId: terminal.id,
});
recordOwnerCanaryRuntimeTelemetry(db, {
  turnId: siteTurnId, runtimeSha: AI_CORE_RUNTIME_SHA,
  rawStatus: 'pass', repairApplied: false, finalStatus: 'pass',
  blockingReasonCodes: [],
  componentVersions: runtimeResponse.component_versions,
});
assert.deepEqual(
  listAiWidgetServerEvents(db, siteTurnId).map((item) => item.eventName),
  ['turn_accepted', 'answer_completed'],
);
const failedTurnId = 'aaaaaaaa-ffff-4666-8666-666666666666';
beginAiWidgetTurn(db, {
  turnId: failedTurnId,
  sessionId: '55555555-eeee-4555-8555-555555555555',
  requestId: 'bbbbbbbb-aaaa-4777-8777-777777777777',
  sourcePage: '/stati/test', userContent: 'Тест safe error',
  runtimeMode: 'production', nowMs: nowMs + 20,
});
recordAiWidgetServerEvent(db, {
  turnId: failedTurnId, eventName: 'turn_accepted', nowMs: nowMs + 20,
  idFactory: () => 'cccccccc-bbbb-4888-8888-888888888888',
});
const preGateEvidence = recordOwnerCanaryPreGateTelemetry(db, {
  turnId: failedTurnId,
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  telemetry: blockedTelemetry,
  createdAt: new Date(nowMs + 21).toISOString(),
});
assert.equal(preGateEvidence.created, true);
assert.equal(recordOwnerCanaryPreGateTelemetry(db, {
  turnId: failedTurnId,
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  telemetry: blockedTelemetry,
  createdAt: new Date(nowMs + 22).toISOString(),
}).created, false);
const storedPreGate = getOwnerCanaryPreGateTelemetry(db, failedTurnId);
assert.equal(storedPreGate.aiCoreRequestId, coreRequest.request_id);
assert.equal(storedPreGate.decisionPackageSha, runtimeResponse.decision_package_hash);
assert.equal(
  storedPreGate.projectionSourceSha,
  runtimeResponse.decision_package_hash,
);
assert.deepEqual(storedPreGate.evaluationReasonCodes, [
  'required_content_missing',
]);
assert.equal(storedPreGate.repairStatus, 'none');
failAiWidgetTurn(db, {
  turnId: failedTurnId,
  errorCode: 'OWNER_AI_CORE_ERROR',
  elapsedMs: 5,
  nowMs: nowMs + 25,
});
recordAiWidgetServerEvent(db, {
  turnId: failedTurnId, eventName: 'answer_error',
  errorCode: 'OWNER_AI_CORE_ERROR', elapsedMs: 5, nowMs: nowMs + 25,
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  aiCoreRequestId: coreRequest.request_id,
  runtimeTelemetryRef: preGateEvidence.telemetryRef,
  idFactory: () => 'dddddddd-cccc-4999-8999-999999999999',
});
assert.deepEqual(
  listAiWidgetServerEvents(db, failedTurnId).map((item) => item.eventName),
  ['turn_accepted', 'answer_error'],
);
const linkedError = listAiWidgetServerEvents(db, failedTurnId).at(-1);
assert.equal(linkedError.conversationThreadId, first.conversationThreadId);
assert.equal(linkedError.messageId, first.messageId);
assert.equal(linkedError.aiCoreRequestId, coreRequest.request_id);
assert.equal(linkedError.runtimeTelemetryRef, preGateEvidence.telemetryRef);
const preGateColumns = db.prepare(`
  SELECT name FROM pragma_table_info('owner_ai_canary_pre_gate_telemetry')
`).all().map((row) => row.name);
for (const forbidden of [
  'user_content',
  'current_message',
  'answer',
  'raw_answer',
  'raw_answer_reference',
  'credential',
  'cookie',
]) {
  assert.equal(preGateColumns.includes(forbidden), false);
}

revokeOwnerCanarySession(db, {
  jti: issued.payload.jti,
  expiresAtMs: issued.payload.exp * 1000,
  nowMs,
});
assert.equal(ownerCanarySessionRevoked(db, issued.payload.jti), true);
assert.equal(verifyOwnerCanarySession({
  token: issued.token, env, nowMs,
  isRevoked: (jti) => ownerCanarySessionRevoked(db, jti),
}), null);

const apiSource = readFileSync(
  new URL('../app/lib/ai-widget-api.ts', import.meta.url), 'utf8',
);
const logoutSource = readFileSync(
  new URL(
    '../app/api/ai-widget/owner-canary/logout/route.ts',
    import.meta.url,
  ),
  'utf8',
);
const statusSource = readFileSync(
  new URL(
    '../app/api/ai-widget/owner-canary/status/route.ts',
    import.meta.url,
  ),
  'utf8',
);
assert.match(logoutSource, /revokeOwnerCanarySession/);
assert.match(logoutSource, /clearOwnerCanaryCookieHeader/);
assert.match(statusSource, /selectOwnerCanaryAudience/);
assert.match(statusSource, /OWNER_AUTH_DENIED/);
assert.match(statusSource, /audience: 'owner_canary'/);
assert.match(statusSource, /route: 'ai_core'/);
assert.match(statusSource, /runtimeSha: AI_CORE_RUNTIME_SHA/);
assert.match(statusSource, /contractSha: AI_CORE_CONTRACT_SHA/);
assert.match(statusSource, /evaluateSiteReleaseProvenance/);
assert.match(statusSource, /siteSha: provenance\.reportedSiteSha/);
assert.match(apiSource, /callOwnerCanaryRuntime/);
assert.match(apiSource, /recordOwnerCanaryPreGateTelemetry/);
assert.match(apiSource, /preGateTelemetryFromError/);
assert.match(apiSource, /Legacy-маршрут не использован/);
assert.match(apiSource, /OWNER_AI_CANARY_MARKER/);
assert.match(apiSource, /aiCoreAudience === 'owner_canary'/);
assert.ok(apiSource.indexOf("if (aiCoreAudience !== 'legacy'")
  < apiSource.indexOf('`${gateway.url}/v1/chat`'));
assert.doesNotMatch(apiSource, /codex.*owner_ai_core/i);

console.log([
  'owner ai canary runtime canonical hash v1 tests: ok',
  'stable_ids=pass',
  'composite_idempotency=pass',
  'durable_state=pass',
  'mutation_ack=pass',
  'model_requests=0',
].join('; '));
