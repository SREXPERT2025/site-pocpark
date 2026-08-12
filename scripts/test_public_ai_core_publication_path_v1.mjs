import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  assertPublicAiCorePublicationAllowed,
  buildPublicAiCoreRequest,
  callPublicAiCoreRuntime,
  observabilityTraceFromError,
  publicBlockedSafeForensicFromError,
  transportEvidenceFromError,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  getOwnerCanaryRuntimeResponse,
  ensureOwnerCanaryThread,
  appendOwnerCanaryHistory,
  listOwnerCanaryHistory,
  runOwnerAiCanaryMigrations,
  saveOwnerCanaryRuntimeResponse,
} from '../app/lib/owner-ai-canary-state.ts';
import { composeAiCoreTurnTrace } from '../app/lib/ai-trace-core.ts';

const incidentA = JSON.parse(readFileSync(
  'scripts/fixtures/public_ai_core_incident_a_20260812.json', 'utf8',
));
const incidentB = JSON.parse(readFileSync(
  'scripts/fixtures/public_ai_core_incident_b_20260812.json', 'utf8',
));
assert.equal(incidentA.identity.ai_core_request_id,
  'aicore_49de9787-c3a3-4b3f-a010-b6e18f6492a3');
assert.equal(incidentB.identity.ai_core_request_id,
  'aicore_1ec3fcdc-bc8d-4d3f-8904-c0294602b6fc');
assert.equal(incidentA.identity.conversation_thread_id,
  incidentB.identity.conversation_thread_id);

const env = {
  AI_CORE_PUBLIC_URL: 'https://runtime.example.test',
  AI_CORE_PUBLIC_SECRET: 'safe-test-secret-with-at-least-32-bytes',
  AI_CORE_PUBLIC_RUNTIME_SHA: AI_CORE_RUNTIME_SHA,
  AI_CORE_PUBLIC_CONTRACT_SHA: AI_CORE_CONTRACT_SHA,
};
const thread = 'cth_v1_1111111111111111';
const message = 'msg_v1_1111111111111111';
const state = {
  conversationThreadId: thread,
  stateVersion: 0,
  confirmedProjectFacts: [], candidateFacts: [], conflicts: [],
  activeQuestion: null, askedQuestions: [], conversationPreferences: {},
  lastMutationAcknowledgement: null,
};
const request = buildPublicAiCoreRequest({
  aiCoreRequestId: 'aicore_publication_path_0001',
  conversationThreadId: thread,
  messageId: message,
  currentMessage: 'Сколько будет 2+2?',
  sourcePage: '/', state,
  siteRelease: 'a'.repeat(40), gatewayRelease: 'b'.repeat(40),
  sentAt: '2026-08-12T12:00:00.000Z', dryRun: true,
});
const probe = spawnSync(
  'python3', ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
  { input: JSON.stringify(request), encoding: 'utf8' },
);
assert.equal(probe.status, 0, probe.stderr);
const runtimeBody = JSON.parse(probe.stdout);
const accepted = await callPublicAiCoreRuntime(request, {
  env,
  fetchImpl: async () => new Response(JSON.stringify(runtimeBody), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }),
});
const provenance = assertPublicAiCorePublicationAllowed({
  envelope: accepted, request, conversationThreadId: thread, messageId: message,
  turnId: 'turn_v1_1111111111111111',
});
assert.equal(provenance.ai_core_request_id, request.request_id);
assert.equal(provenance.candidate_status, 'allowed');
assert.equal(accepted.transportEvidence.http_status, 200);
assert.ok(accepted.observabilityTrace);
assert.equal(accepted.observabilityTrace.identity.runtime_sha,
  AI_CORE_RUNTIME_SHA);

// A response belonging to another message/thread can never be published.
assert.throws(() => assertPublicAiCorePublicationAllowed({
  envelope: accepted, request,
  conversationThreadId: thread,
  messageId: 'msg_v1_2222222222222222',
  turnId: 'turn_v1_1111111111111111',
}), /AI_CORE_PUBLICATION_PROVENANCE_REJECTED/);
const nextRequest = buildPublicAiCoreRequest({
  ...{
    aiCoreRequestId: 'aicore_publication_path_0002',
    conversationThreadId: thread,
    messageId: 'msg_v1_2222222222222222',
    currentMessage: 'Следующий вопрос', sourcePage: '/', state,
    siteRelease: 'a'.repeat(40), gatewayRelease: 'b'.repeat(40),
    sentAt: '2026-08-12T12:00:01.000Z', dryRun: true,
  },
});
assert.throws(() => assertPublicAiCorePublicationAllowed({
  envelope: accepted, request: nextRequest,
  conversationThreadId: thread, messageId: nextRequest.payload.message_id,
  turnId: 'turn_v1_2222222222222222',
}), /AI_CORE_PUBLICATION_PROVENANCE_REJECTED/);

// Missing Runtime publication evidence is fail-closed.
const missingPublication = structuredClone(accepted);
delete missingPublication.response.telemetry.publication;
assert.throws(() => assertPublicAiCorePublicationAllowed({
  envelope: missingPublication, request,
  conversationThreadId: thread, messageId: message,
  turnId: 'turn_v1_1111111111111111',
}), /INVALID_AI_CORE_PUBLICATION/);

// Cache identity is the canonical thread + message + idempotency composite.
const db = new Database(':memory:');
runOwnerAiCanaryMigrations(db);
ensureOwnerCanaryThread(db, {
  conversationThreadId: thread,
  siteSessionId: 'session_v1_1111111111111111',
});
saveOwnerCanaryRuntimeResponse(db, {
  conversationThreadId: thread,
  messageId: message,
  idempotencyKey: request.idempotency_key,
  requestPayloadHash: request.request_payload_hash,
  response: accepted,
  visibleAnswer: String(accepted.response.answer),
});
assert.ok(getOwnerCanaryRuntimeResponse(db, {
  conversationThreadId: thread, messageId: message,
  idempotencyKey: request.idempotency_key,
}));
assert.equal(getOwnerCanaryRuntimeResponse(db, {
  conversationThreadId: thread, messageId: nextRequest.payload.message_id,
  idempotencyKey: nextRequest.idempotency_key,
}), null);
assert.equal(getOwnerCanaryRuntimeResponse(db, {
  conversationThreadId: 'cth_v1_2222222222222222', messageId: message,
  idempotencyKey: request.idempotency_key,
}), null);

// Exact two-turn shape: after a failed first Runtime call only the user's
// message exists in AI Core history. No stale assistant candidate is appended,
// so the follow-up cannot deadlock on that nonexistent assistant history.
appendOwnerCanaryHistory(db, {
  conversationThreadId: thread,
  messageId: message,
  role: 'user',
  content: 'Привет!',
});
const secondTurnHistory = listOwnerCanaryHistory(db, thread);
assert.equal(secondTurnHistory.length, 1);
assert.equal(secondTurnHistory[0].role, 'user');
assert.equal(secondTurnHistory.some((item) => item.role === 'assistant'), false);
db.close();

// Public non-pass responses are blocked by the public gate, without applying
// the owner-only restricted-forensic equality contract.
const blockedProbe = spawnSync(
  'python3', [
    'scripts/run_owner_ai_core_deterministic_contract_probe.py',
    '--fixed-answer',
    'Оставьте телефон прямо сейчас? Сколько у вас въездов?',
  ],
  { input: JSON.stringify(request), encoding: 'utf8' },
);
assert.equal(blockedProbe.status, 0, blockedProbe.stderr);
const blockedBody = JSON.parse(blockedProbe.stdout);
assert.equal(blockedBody.response.success, true);
assert.notEqual(blockedBody.response.evaluation_result.status, 'pass');
assert.equal(blockedBody.response.telemetry.publication.candidate_status,
  'blocked');
assert.ok(blockedBody.observability_trace);
let blockedError;
try {
  await callPublicAiCoreRuntime(request, {
    env,
    fetchImpl: async () => new Response(JSON.stringify(blockedBody), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }),
  });
  assert.fail('Expected public final gate to block');
} catch (error) {
  blockedError = error;
}
assert.equal(blockedError.message, 'AI_CORE_FINAL_GATE_BLOCKED');
const blockedForensic = publicBlockedSafeForensicFromError(blockedError);
const blockedRuntimeTrace = observabilityTraceFromError(blockedError);
assert.ok(blockedForensic);
assert.ok(blockedRuntimeTrace);
assert.equal(blockedRuntimeTrace.identity.runtime_sha, AI_CORE_RUNTIME_SHA);
assert.deepEqual(
  blockedForensic.final_evaluation_reason_codes,
  blockedBody.response.evaluation_result.reason_codes,
);
assert.deepEqual(
  blockedRuntimeTrace.pipeline.find((item) =>
    item.name === 'evaluator_final').reason_codes,
  [...blockedBody.response.evaluation_result.reason_codes].sort(),
);
assert.equal(transportEvidenceFromError(blockedError).http_status, 200);
assert.equal(transportEvidenceFromError(blockedError).outcome,
  'http_response_rejected');

// The exact bridge trace must survive production Site validation and retain
// Runtime block reasons in the composed Site trace.
const preservedTrace = composeAiCoreTurnTrace({
  turnId: '33333333-3333-4333-8333-333333333333',
  siteRequestId: '44444444-4444-4444-8444-444444444444',
  aiCoreRequestId: request.request_id,
  conversationThreadId: thread, messageId: message,
  timestamp: request.sent_at, route: 'public_ai_core',
  siteSha: 'a'.repeat(40), gatewaySha: 'b'.repeat(40),
  sourcePage: '/', currentMessage: 'Сколько будет 2+2?', recentMessages: [],
  runtimeTrace: blockedRuntimeTrace,
  transportEvidence: transportEvidenceFromError(blockedError),
  publicationStatus: 'blocked', siteBlockingPredicate: blockedError.message,
});
assert.equal(preservedTrace.diagnostics.trace_capture_boundary,
  'site_plus_runtime');
assert.deepEqual(
  preservedTrace.pipeline.find((item) =>
    item.name === 'evaluator_final').reason_codes,
  [...blockedBody.response.evaluation_result.reason_codes].sort(),
);
assert.equal(preservedTrace.publication.status, 'blocked');

// A reached Runtime must never be rendered as "not reached" merely because
// its optional detailed observability trace is absent or invalid.
const unobservedTrace = composeAiCoreTurnTrace({
  turnId: '33333333-3333-4333-8333-333333333333',
  siteRequestId: '44444444-4444-4444-8444-444444444444',
  aiCoreRequestId: request.request_id,
  conversationThreadId: thread, messageId: message,
  timestamp: request.sent_at, route: 'public_ai_core',
  siteSha: 'a'.repeat(40), gatewaySha: 'b'.repeat(40),
  sourcePage: '/', currentMessage: 'Привет!', recentMessages: [],
  runtimeTrace: null,
  transportEvidence: transportEvidenceFromError(blockedError),
  publicationStatus: 'blocked', siteBlockingPredicate: blockedError.message,
});
assert.equal(unobservedTrace.pipeline[0].name, 'runtime_transport');
assert.equal(unobservedTrace.pipeline[0].status, 'pass');
assert.equal(unobservedTrace.diagnostics.trace_capture_boundary,
  'site_after_runtime_without_runtime_trace');
assert.equal(unobservedTrace.diagnostics.first_failure_stage,
  'site_response_validation');
assert.equal(unobservedTrace.publication.visible_answer, null);

console.log(JSON.stringify({
  tests: 30,
  current_publication: 'pass',
  identity_mismatch: 'blocked',
  missing_publication: 'blocked',
  stale_cache: 'not_selected',
  public_forensic_scope: 'pass',
  reached_runtime_trace: 'pass',
  canonical_runtime_trace_preserved: 'pass',
  blocked_reason_codes_preserved: 'pass',
}, null, 2));
