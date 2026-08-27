import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  buildOwnerCanaryCoreRequest,
  sha256,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  applyOwnerCanaryMutationBatch,
  ensureOwnerCanaryThread,
  runOwnerAiCanaryMigrations,
} from '../app/lib/owner-ai-canary-state.ts';
import { composeAiCoreTurnTrace } from '../app/lib/ai-trace-core.ts';

const SITE_BASE_SHA = '83d874ed9a5586e6b5795094ba0bec22ef70cd34';
const RUNTIME_SHA = '5606a1fc4698666ba01e93d5ab25958f026833e8';
const CONTRACT_SHA = '4d75773d60f3453279cbfcee1453f54b15b66567';
const GATEWAY_SHA = 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9';
const THREAD_ID = 'thread_blocked_user_mutation_0001';

assert.equal(AI_CORE_RUNTIME_SHA, RUNTIME_SHA);
assert.equal(AI_CORE_CONTRACT_SHA, CONTRACT_SHA);

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runOwnerAiCanaryMigrations(db);
let state = ensureOwnerCanaryThread(db, {
  conversationThreadId: THREAD_ID,
  siteSessionId: 'session_blocked_user_mutation_001',
  nowMs: Date.UTC(2026, 7, 26, 16, 0, 0),
});
const history = [];
let sequence = 0;

function nextId(prefix) {
  sequence += 1;
  return `${prefix}_blocked_user_${String(sequence).padStart(8, '0')}`;
}

function runtimeTurn(message) {
  const requestId = nextId('aicore');
  const messageId = nextId('message');
  const request = buildOwnerCanaryCoreRequest({
    aiCoreRequestId: requestId,
    conversationThreadId: THREAD_ID,
    messageId,
    parentMessageId: history.at(-1)?.message_id ?? null,
    currentMessage: message,
    sourcePage: '/',
    recentMessages: structuredClone(history),
    state,
    siteRelease: SITE_BASE_SHA,
    gatewayRelease: GATEWAY_SHA,
    sentAt: `2026-08-26T16:${String(sequence).padStart(2, '0')}:00.000Z`,
    dryRun: true,
  });
  const runtime = spawnSync(
    'python3',
    ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
    { input: JSON.stringify(request), encoding: 'utf8' },
  );
  assert.equal(runtime.status, 0, runtime.stderr);
  const rawEnvelope = JSON.parse(runtime.stdout);
  const envelope = validateOwnerCanaryCoreResponse(rawEnvelope, request);
  assert.equal(envelope.runtime_sha, RUNTIME_SHA);
  assert.equal(envelope.contract_sha, CONTRACT_SHA);
  return { request, rawEnvelope, envelope };
}

function applyAllowed(turn, nowMs) {
  const result = applyOwnerCanaryMutationBatch(db, {
    conversationThreadId: THREAD_ID,
    messageId: turn.request.payload.message_id,
    requestId: turn.request.request_id,
    responseId: turn.envelope.response.response_id,
    mutations: turn.envelope.response.state_mutations,
    publicationAllowed: true,
    nowMs,
  });
  assert.equal(result.accepted, true);
  assert.ok(result.acknowledgement.acknowledgements.every(
    (item) => item.status === 'applied',
  ));
  state = result.state;
  return result;
}

const t3Message = 'У нас бизнес-центр: 2 въезда и 2 выезда, около 800 '
  + 'автомобилей в сутки. Есть сотрудники, арендаторы и гости. Оператор есть, '
  + 'но хотим максимально быстрый автоматический проезд и обязательно '
  + 'автоматический резервный способ на случай, если основной идентификатор '
  + 'не сработает.';
const t3 = runtimeTurn(t3Message);
applyAllowed(t3, Date.UTC(2026, 7, 26, 16, 1, 0));
assert.equal(state.confirmedProjectFacts.length, 9);
assert.equal(state.activeQuestion?.goal, 'identify_current_system');
history.push(
  {
    message_id: t3.request.payload.message_id,
    role: 'user',
    content: t3Message,
    created_at: '2026-08-26T16:01:00.000Z',
  },
  {
    message_id: t3.envelope.response.response_id,
    role: 'assistant',
    content: t3.envelope.response.answer,
    created_at: '2026-08-26T16:01:01.000Z',
  },
);

const t4Message = 'С нуля. Что лучше выбрать: карты или билеты?';
const t4 = runtimeTurn(t4Message);
const t4Mutations = t4.envelope.response.state_mutations;
const t4Operations = t4Mutations.map((item) => item.operation);
assert.ok(t4Operations.includes('set_confirmed_fact'));
assert.ok(t4Operations.includes('resolve_open_question'));
assert.ok(t4Operations.includes('add_asked_question'));
const versionBeforeBlockedT4 = state.stateVersion;
const askedBeforeBlockedT4 = structuredClone(state.askedQuestions);
const candidatesBeforeBlockedT4 = structuredClone(state.candidateFacts);
const preferencesBeforeBlockedT4 = structuredClone(
  state.conversationPreferences,
);

const blockedT4 = applyOwnerCanaryMutationBatch(db, {
  conversationThreadId: THREAD_ID,
  messageId: t4.request.payload.message_id,
  requestId: t4.request.request_id,
  responseId: t4.envelope.response.response_id,
  mutations: t4Mutations,
  publicationAllowed: false,
  nowMs: Date.UTC(2026, 7, 26, 16, 2, 0),
});
assert.equal(blockedT4.accepted, true);
state = blockedT4.state;
assert.equal(state.stateVersion, versionBeforeBlockedT4 + 1);
assert.equal(
  state.confirmedProjectFacts.find((item) => item.field === 'current_system')
    ?.value,
  'new_build',
);
assert.equal(state.confirmedProjectFacts.length, 10);
assert.equal(state.activeQuestion, null);
assert.deepEqual(state.askedQuestions, askedBeforeBlockedT4);
assert.deepEqual(state.candidateFacts, candidatesBeforeBlockedT4);
assert.deepEqual(state.conversationPreferences, preferencesBeforeBlockedT4);

const t4Acknowledgements = blockedT4.acknowledgement.acknowledgements;
assert.equal(t4Acknowledgements.length, t4Mutations.length);
assert.deepEqual(
  new Set(t4Acknowledgements.map((item) => item.mutation_id)),
  new Set(t4Mutations.map((item) => item.mutation_id)),
);
for (const [index, mutation] of t4Mutations.entries()) {
  const acknowledgement = t4Acknowledgements[index];
  if (mutation.operation === 'set_confirmed_fact'
    || mutation.operation === 'resolve_open_question') {
    assert.equal(acknowledgement.status, 'applied');
    assert.equal(acknowledgement.reason_code, 'applied');
  } else {
    assert.equal(acknowledgement.status, 'rejected');
    assert.equal(acknowledgement.reason_code, 'authority_denied');
  }
}
assert.deepEqual(
  state.lastMutationAcknowledgement,
  blockedT4.acknowledgement,
);

const visibleAnswer = null;
const terminalPredicate = 'AI_CORE_FINAL_GATE_BLOCKED';
const committedT4Mutations = t4Mutations.filter((_, index) =>
  t4Acknowledgements[index].status === 'applied');
const blockedTrace = composeAiCoreTurnTrace({
  turnId: 'turn_blocked_user_00000001',
  siteRequestId: 'site_request_blocked_user_0001',
  aiCoreRequestId: t4.request.request_id,
  conversationThreadId: THREAD_ID,
  messageId: t4.request.payload.message_id,
  parentMessageId: history.at(-1)?.message_id ?? null,
  timestamp: '2026-08-26T16:02:00.000Z',
  route: 'owner_ai_core',
  siteSha: SITE_BASE_SHA,
  gatewaySha: GATEWAY_SHA,
  sourcePage: '/',
  currentMessage: t4Message,
  recentMessages: structuredClone(history),
  runtimeTrace: t4.rawEnvelope.observability_trace,
  publicationStatus: 'blocked',
  visibleAnswer,
  visibleSource: null,
  siteBlockingPredicate: terminalPredicate,
  stateVersionAfter: state.stateVersion,
  committedMutations: committedT4Mutations,
  mutationAcknowledgementCount: t4Acknowledgements.length,
  siteTotalLatencyMs: 1,
});
assert.equal(blockedTrace.publication.visible_answer, null);
assert.equal(blockedTrace.publication.site_blocking_predicate, terminalPredicate);
assert.equal(blockedTrace.state.committed_mutations.length, 2);
assert.equal(
  blockedTrace.state.mutation_acknowledgement_count,
  t4Mutations.length,
);
const traceWithoutHash = { ...blockedTrace };
delete traceWithoutHash.trace_sha256;
assert.equal(blockedTrace.trace_sha256, sha256(traceWithoutHash));

const replay = applyOwnerCanaryMutationBatch(db, {
  conversationThreadId: THREAD_ID,
  messageId: t4.request.payload.message_id,
  requestId: t4.request.request_id,
  responseId: t4.envelope.response.response_id,
  mutations: t4Mutations,
  publicationAllowed: false,
  nowMs: Date.UTC(2026, 7, 26, 16, 2, 1),
});
assert.equal(replay.state.stateVersion, state.stateVersion);
assert.deepEqual(replay.acknowledgement, blockedT4.acknowledgement);

const duplicateResponse = applyOwnerCanaryMutationBatch(db, {
  conversationThreadId: THREAD_ID,
  messageId: t4.request.payload.message_id,
  requestId: 'aicore_blocked_user_duplicate_0001',
  responseId: 'response_blocked_user_duplicate_0001',
  mutations: t4Mutations,
  publicationAllowed: false,
  nowMs: Date.UTC(2026, 7, 26, 16, 2, 2),
});
assert.equal(duplicateResponse.accepted, false);
assert.ok(duplicateResponse.acknowledgement.acknowledgements.every(
  (item) => item.status === 'rejected'
    && item.reason_code === 'duplicate_mutation',
));
assert.equal(duplicateResponse.state.stateVersion, state.stateVersion);

history.push({
  message_id: t4.request.payload.message_id,
  role: 'user',
  content: t4Message,
  created_at: '2026-08-26T16:02:00.000Z',
});
const t5 = runtimeTurn('Какие данные об объекте ты уже знаешь?');
assert.equal(t5.envelope.response.executor_trace.execution_mode, 'deterministic');
assert.deepEqual(t5.envelope.response.executor_trace.attempts, []);
assert.equal(t5.envelope.response.executor_trace.final_executor, null);
assert.equal(t5.envelope.response.executor_trace.model_request_count, 0);
assert.deepEqual(t5.envelope.response.state_mutations, []);
assert.equal(
  t5.envelope.response.context_resolution.command_requirements.semantic_route,
  'object_card_recall',
);
assert.match(t5.envelope.response.answer, /бизнес-центр/);
assert.match(t5.envelope.response.answer, /800 автомобилей/);
assert.match(t5.envelope.response.answer, /проектируется с нуля/);

const acknowledgementRows = db.prepare(`
  SELECT acknowledgement_json
  FROM owner_ai_canary_runtime_mutation_acks
  WHERE conversation_thread_id = ?
`).all(THREAD_ID);
const appliedCounts = new Map();
for (const row of acknowledgementRows) {
  const acknowledgement = JSON.parse(row.acknowledgement_json);
  for (const item of acknowledgement.acknowledgements) {
    if (item.status !== 'applied') continue;
    appliedCounts.set(
      item.mutation_id,
      (appliedCounts.get(item.mutation_id) ?? 0) + 1,
    );
  }
}
assert.ok([...appliedCounts.values()].every((count) => count === 1));

console.log(JSON.stringify({
  base_site_sha: SITE_BASE_SHA,
  runtime_sha: RUNTIME_SHA,
  contract_sha: CONTRACT_SHA,
  t3_durable_facts: 9,
  blocked_t4_current_system: 'new_build',
  blocked_t4_active_question_closed: true,
  blocked_t4_publication_dependent_rejected: true,
  blocked_t4_visible_answer: visibleAnswer,
  blocked_t4_terminal_predicate: terminalPredicate,
  acknowledgement_complete: true,
  t5_durable_facts_seen: state.confirmedProjectFacts.length,
  t5_route: t5.envelope.response.context_resolution.command_requirements
    .semantic_route,
  t5_model_requests: 0,
  duplicate_executions: 0,
  duplicate_mutations: 0,
  real_model_requests: 0,
  result: 'pass',
}, null, 2));
