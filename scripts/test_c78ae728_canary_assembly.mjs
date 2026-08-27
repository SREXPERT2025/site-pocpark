import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  buildOwnerCanaryCoreRequest,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  applyOwnerCanaryMutationBatch,
  ensureOwnerCanaryThread,
  runOwnerAiCanaryMigrations,
} from '../app/lib/owner-ai-canary-state.ts';

const RUNTIME_SHA = 'ecb7de690dd361de0ff03de9e0687cd16cf28ff9';
const CONTRACT_SHA = '4d75773d60f3453279cbfcee1453f54b15b66567';
const GATEWAY_SHA = 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9';
const SITE_BASE_SHA = 'bcd1f87bdde83aa9cc889036e58762dff8776276';
const THREAD_ID = 'thread_ecb7de69_stateful_0001';

assert.equal(AI_CORE_RUNTIME_SHA, RUNTIME_SHA);
assert.equal(AI_CORE_CONTRACT_SHA, CONTRACT_SHA);

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runOwnerAiCanaryMigrations(db);
let state = ensureOwnerCanaryThread(db, {
  conversationThreadId: THREAD_ID,
  siteSessionId: 'session_ecb7de69_stateful_0001',
  nowMs: Date.UTC(2026, 7, 14, 10, 0, 0),
});
const history = [];
let sequence = 0;
let duplicateExecutions = 0;
let duplicateMutations = 0;

function nextId(prefix) {
  sequence += 1;
  return `${prefix}_ecb7de69_${String(sequence).padStart(8, '0')}`;
}

function runTurn(message) {
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
    sentAt: `2026-08-14T10:${String(sequence).padStart(2, '0')}:00.000Z`,
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
  assert.equal(rawEnvelope.observability_trace.identity.runtime_sha, RUNTIME_SHA);
  assert.equal(rawEnvelope.observability_trace.identity.contract_sha, CONTRACT_SHA);
  assert.match(rawEnvelope.observability_trace.trace_sha256, /^[a-f0-9]{64}$/);
  assert.equal(
    envelope.response.telemetry.publication.candidate_status,
    'allowed',
  );

  if (envelope.response.state_mutations.length > 0) {
    const beforeVersion = state.stateVersion;
    const applied = applyOwnerCanaryMutationBatch(db, {
      conversationThreadId: THREAD_ID,
      messageId,
      requestId,
      responseId: envelope.response.response_id,
      mutations: envelope.response.state_mutations,
      nowMs: Date.UTC(2026, 7, 14, 10, sequence, 1),
    });
    assert.equal(applied.accepted, true);
    assert.ok(applied.acknowledgement.acknowledgements.every(
      (item) => item.status === 'applied',
    ));
    state = applied.state;
    const idempotent = applyOwnerCanaryMutationBatch(db, {
      conversationThreadId: THREAD_ID,
      messageId,
      requestId,
      responseId: envelope.response.response_id,
      mutations: envelope.response.state_mutations,
      nowMs: Date.UTC(2026, 7, 14, 10, sequence, 2),
    });
    assert.equal(idempotent.accepted, true);
    assert.equal(idempotent.state.stateVersion, state.stateVersion);
    assert.equal(state.stateVersion, beforeVersion + 1);
  }

  history.push(
    {
      message_id: messageId,
      role: 'user',
      content: message,
      created_at: `2026-08-14T10:${String(sequence).padStart(2, '0')}:00.000Z`,
    },
    {
      message_id: envelope.response.response_id,
      role: 'assistant',
      content: envelope.response.answer,
      created_at: `2026-08-14T10:${String(sequence).padStart(2, '0')}:01.000Z`,
    },
  );
  return { request, rawEnvelope, envelope };
}

const t1 = runTurn('Привет');
assert.equal(t1.envelope.response.executor_trace.execution_mode, 'deterministic');
assert.deepEqual(t1.envelope.response.executor_trace.attempts, []);
assert.equal(t1.envelope.response.executor_trace.final_executor, null);
assert.equal(t1.envelope.response.executor_trace.model_request_count, 0);
assert.equal(t1.envelope.response.repair_result.applied, false);
assert.equal(t1.envelope.response.evaluation_result.status, 'pass');

const t2 = runTurn('Что ты знаешь о РОСПАРК?');
assert.equal(t2.envelope.response.executor_trace.execution_mode, 'deterministic');
assert.equal(t2.envelope.response.executor_trace.model_request_count, 0);
const knowledgeStage = t2.rawEnvelope.observability_trace.pipeline.find(
  (item) => item.name === 'knowledge_sources',
);
assert.equal(knowledgeStage.status, 'pass');
assert.equal(knowledgeStage.input.required, true);
assert.ok(knowledgeStage.output.retrieval_result_count > 0);
assert.ok(knowledgeStage.output.executor_received_knowledge_count > 0);
assert.match(t2.envelope.response.answer, /РОСПАРК/);
assert.doesNotMatch(t2.envelope.response.answer, /qwen|codex|ollama/i);

const t3Message = 'У нас бизнес-центр: 2 въезда и 2 выезда, около 800 '
  + 'автомобилей в сутки. Есть сотрудники, арендаторы и гости. Оператор есть, '
  + 'но хотим максимально быстрый автоматический проезд и обязательно '
  + 'автоматический резервный способ на случай, если основной идентификатор '
  + 'не сработает.';
const t3 = runTurn(t3Message);
assert.equal(t3.envelope.response.executor_trace.execution_mode, 'deterministic');
assert.equal(t3.envelope.response.executor_trace.model_request_count, 0);
assert.equal(
  Object.keys(t3.envelope.response.context_resolution.extracted_facts).length,
  9,
);
assert.equal(state.confirmedProjectFacts.length, 9);
assert.equal(state.activeQuestion?.goal, 'identify_current_system');
assert.equal(t3.envelope.response.answer.split('?').length - 1, 1);

const t4 = runTurn('С нуля. Что лучше выбрать: карты или билеты?');
assert.equal(t4.envelope.response.executor_trace.execution_mode, 'model');
assert.equal(t4.envelope.response.executor_trace.model_request_count, 1);
assert.equal(t4.envelope.response.evaluation_result.status, 'pass');
assert.equal(t4.envelope.response.repair_result.applied, false);
assert.equal(t4.envelope.response.repair_result.rewrite_ratio, 0);
assert.equal(
  t4.envelope.response.decision_package.decision_status,
  'comparison_only',
);
assert.deepEqual(t4.envelope.response.decision_package.comparison_scope, [
  'card', 'ticket',
]);
assert.deepEqual(
  t4.envelope.response.decision_package.recommended_architecture.components,
  [],
);
assert.deepEqual(
  t4.envelope.response.decision_package.recommended_architecture.segments,
  {},
);
assert.equal(
  t4.rawEnvelope.observability_trace.state.request_local_effective.current_system,
  'new_build',
);
const t4Projection = t4.rawEnvelope.observability_trace.pipeline.find(
  (item) => item.name === 'verbalization_projection',
);
assert.equal(t4Projection.status, 'pass');
assert.equal(t4Projection.output.projection.decision_status, 'comparison_only');
assert.deepEqual(t4Projection.output.projection.comparison_scope, [
  'card', 'ticket',
]);
assert.match(t4.envelope.response.answer, /карт/i);
assert.match(t4.envelope.response.answer, /билет/i);
assert.doesNotMatch(t4.envelope.response.answer, /распознаван/i);
assert.doesNotMatch(
  t4.envelope.response.answer,
  /парковочная система уже установлена или проектируется с нуля/i,
);
assert.equal(
  state.confirmedProjectFacts.find((item) => item.field === 'current_system')
    ?.value,
  'new_build',
);
assert.notEqual(state.activeQuestion?.goal, 'identify_current_system');
assert.equal(state.activeQuestion?.asked_at_message_id, t4.request.payload.message_id);
assert.ok(t4.envelope.response.state_mutations.every(
  (item) => item.source_message_id === t4.request.payload.message_id,
));

const t5 = runTurn('Какие данные об объекте ты уже знаешь?');
assert.equal(
  t5.envelope.response.context_resolution.command_requirements.semantic_route,
  'object_card_recall',
);
assert.equal(t5.envelope.response.executor_trace.execution_mode, 'deterministic');
assert.deepEqual(t5.envelope.response.executor_trace.attempts, []);
assert.equal(t5.envelope.response.executor_trace.final_executor, null);
assert.equal(t5.envelope.response.executor_trace.model_request_count, 0);
assert.deepEqual(t5.envelope.response.state_mutations, []);
assert.equal(state.confirmedProjectFacts.length, 10);
assert.match(t5.envelope.response.answer, /бизнес-центр/);
assert.match(t5.envelope.response.answer, /800 автомобилей/);
assert.match(t5.envelope.response.answer, /проектируется с нуля/);

const t6 = runTurn(
  'Что будет происходить если клиент приехал, а номер не распознался? '
    + 'Как он поймет что ему делать?',
);
assert.equal(
  t6.envelope.response.context_resolution.command_requirements.semantic_route,
  'identification_failure_fallback',
);
assert.equal(t6.envelope.response.executor_trace.execution_mode, 'model');
assert.equal(t6.envelope.response.executor_trace.model_request_count, 1);
assert.equal(t6.envelope.response.executor_trace.attempts.length, 1);
assert.equal(t6.envelope.response.decision_package.decision_status,
  'fallback_decision_pending');
assert.notEqual(t6.envelope.response.decision_package.decision_type,
  'not_required');
assert.ok(t6.envelope.response.decision_package.missing_critical_facts.includes(
  'fallback_reader_infrastructure',
));
assert.ok(Object.values(
  t6.envelope.response.decision_package.recommended_architecture.segments,
).every((segment) => segment.assisted_recovery?.usage === 'exception_only'));
const t6Knowledge = t6.rawEnvelope.observability_trace.pipeline.find(
  (item) => item.name === 'knowledge_sources',
);
assert.equal(t6Knowledge.status, 'pass');
assert.equal(t6Knowledge.input.required, true);
assert.equal(t6Knowledge.output.executor_received_knowledge_count, 1);
const t6Lab = t6.rawEnvelope.observability_trace.pipeline.find(
  (item) => item.name === 'engineering_lab',
);
assert.equal(t6Lab.status, 'pass');
assert.equal(t6.envelope.response.evaluation_result.status, 'pass');
assert.ok(t6.envelope.response.repair_result.applied === false
  || t6.envelope.response.repair_result.rewrite_ratio <= 0.35);
assert.doesNotMatch(t6.envelope.response.answer, /охранник|всегда дежурит/i);
assert.match(t6.envelope.response.answer, /автоматическ/i);
assert.match(t6.envelope.response.answer, /оператор/i);
assert.match(t6.envelope.response.answer, /исключительн/i);

assert.equal(duplicateExecutions, 0);
assert.equal(duplicateMutations, 0);
console.log(JSON.stringify({
  runtime_sha: RUNTIME_SHA,
  contract_sha: CONTRACT_SHA,
  t1: 'pass',
  t2: 'pass',
  t3: 'pass',
  t3_extracted_facts: 9,
  t4: 'pass',
  t4_active_question_closed: true,
  t5: 'pass',
  t5_route: 'object_card_recall',
  t5_model_requests: 0,
  t6: 'pass',
  t6_route: 'identification_failure_fallback',
  t6_decision_package: 'fallback_decision_pending',
  t6_verified_knowledge_to_executor: true,
  duplicate_executions: duplicateExecutions,
  duplicate_mutations: duplicateMutations,
  real_model_requests: 0,
  result: '6/6',
}, null, 2));
