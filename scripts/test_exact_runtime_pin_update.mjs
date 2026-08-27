import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  CANONICALIZATION_VERSION,
  buildOwnerCanaryCoreRequest,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';

const APPROVED_RUNTIME = '651738a5db1a748fa252d5df4f6df3e843ef1f92';
const OLD_RUNTIME = '78db9e3c3363720fe680056873b41b332f319b96';
const CONTRACT = '4d75773d60f3453279cbfcee1453f54b15b66567';
const CANONICALIZATION = 'CANONICAL_JSON_HASH_V1';

assert.equal(AI_CORE_RUNTIME_SHA, APPROVED_RUNTIME);
assert.equal(AI_CORE_CONTRACT_SHA, CONTRACT);
assert.equal(CANONICALIZATION_VERSION, CANONICALIZATION);

const request = buildOwnerCanaryCoreRequest({
  aiCoreRequestId: 'aicore_exact_pin_00000001',
  conversationThreadId: 'thread_exact_pin_00000001',
  messageId: 'message_exact_pin_00000001',
  currentMessage: 'Сколько будет 2+2?',
  sourcePage: '/',
  recentMessages: [],
  state: {
    conversationThreadId: 'thread_exact_pin_00000001',
    stateVersion: 0,
    confirmedProjectFacts: [],
    candidateFacts: [],
    conflicts: [],
    activeQuestion: null,
    askedQuestions: [],
    conversationPreferences: {},
    lastMutationAcknowledgement: null,
  },
  siteRelease: '79d7f917f382ffc3371631d558778d8b021aa631',
  gatewayRelease: 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9',
  sentAt: '2026-08-09T00:00:00.000Z',
  dryRun: true,
});
const runtime = spawnSync(
  'python3',
  ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
  { input: JSON.stringify(request), encoding: 'utf8' },
);
assert.equal(runtime.status, 0, runtime.stderr);
const envelope = JSON.parse(runtime.stdout);
assert.equal(
  validateOwnerCanaryCoreResponse(envelope, request).runtime_sha,
  APPROVED_RUNTIME,
);

const greetingRequest = buildOwnerCanaryCoreRequest({
  aiCoreRequestId: 'aicore_greeting_pin_00000001',
  conversationThreadId: 'thread_greeting_pin_00000001',
  messageId: 'message_greeting_pin_00000001',
  currentMessage: 'Привет!',
  sourcePage: '/',
  recentMessages: [],
  state: {
    conversationThreadId: 'thread_greeting_pin_00000001',
    stateVersion: 0,
    confirmedProjectFacts: [],
    candidateFacts: [],
    conflicts: [],
    activeQuestion: null,
    askedQuestions: [],
    conversationPreferences: {},
    lastMutationAcknowledgement: null,
  },
  siteRelease: '0d1b5821392cd82392106b95e237cbc5b2d858b4',
  gatewayRelease: 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9',
  sentAt: '2026-08-09T00:00:00.000Z',
  dryRun: true,
});
const greetingRuntime = spawnSync(
  'python3',
  ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
  { input: JSON.stringify(greetingRequest), encoding: 'utf8' },
);
assert.equal(greetingRuntime.status, 0, greetingRuntime.stderr);
const greetingEnvelope = validateOwnerCanaryCoreResponse(
  JSON.parse(greetingRuntime.stdout),
  greetingRequest,
);
assert.equal(greetingEnvelope.runtime_sha, APPROVED_RUNTIME);
assert.equal(
  greetingEnvelope.response.decision_package.decision_type,
  'not_required',
);
assert.equal(greetingEnvelope.response.executor_trace.execution_mode, 'deterministic');
assert.deepEqual(greetingEnvelope.response.executor_trace.attempts, []);
assert.equal(greetingEnvelope.response.executor_trace.final_executor, null);
assert.equal(greetingEnvelope.response.executor_trace.model_request_count, 0);
assert.equal(greetingEnvelope.response.executor_trace.deterministic_handler, 'courtesy');
assert.equal(
  greetingEnvelope.response.component_versions.engineering_lab,
  'not_invoked',
);
assert.equal(greetingEnvelope.response.evaluation_result.status, 'pass');
assert.equal(
  greetingEnvelope.response.telemetry.publication.candidate_status,
  'allowed',
);

const historicalThread = 'thread_historical_site_0001';
const historicalMessageId = 'message_current_historical_0001';
const historicalSourceMessageId = 'message_historical_0001';
const historicalRequest = buildOwnerCanaryCoreRequest({
  aiCoreRequestId: 'aicore_historical_site_0001',
  conversationThreadId: historicalThread,
  messageId: historicalMessageId,
  parentMessageId: historicalSourceMessageId,
  currentMessage: 'А если выбирать только карты или билеты?',
  sourcePage: '/',
  recentMessages: [{
    message_id: historicalSourceMessageId,
    role: 'user',
    content: 'У нас бизнес-центр: 2 въезда и 2 выезда, около 800 автомобилей '
      + 'в сутки. Есть сотрудники, арендаторы и гости. Оператор есть, нужен '
      + 'быстрый автоматический проезд и автоматический резерв.',
    created_at: '2026-08-13T11:59:00.000Z',
  }],
  state: {
    conversationThreadId: historicalThread,
    stateVersion: 0,
    confirmedProjectFacts: [],
    candidateFacts: [],
    conflicts: [],
    activeQuestion: null,
    askedQuestions: [],
    conversationPreferences: {},
    lastMutationAcknowledgement: null,
  },
  siteRelease: '243b831ef8f15733dd60e27d63d57c71d2a4113e',
  gatewayRelease: 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9',
  sentAt: '2026-08-13T12:00:00.000Z',
  dryRun: true,
});
const historicalRuntime = spawnSync(
  'python3',
  ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
  { input: JSON.stringify(historicalRequest), encoding: 'utf8' },
);
assert.equal(historicalRuntime.status, 0, historicalRuntime.stderr);
const historicalRawEnvelope = JSON.parse(historicalRuntime.stdout);
const historicalEnvelope = validateOwnerCanaryCoreResponse(
  historicalRawEnvelope,
  historicalRequest,
);
assert.equal(
  historicalEnvelope.response.telemetry.publication.candidate_status,
  'allowed',
);
assert.equal(
  historicalRawEnvelope.observability_trace.state
    .request_local_effective.object_type,
  'business_center',
);
assert.equal(
  historicalRawEnvelope.observability_trace.state
    .request_local_effective.daily_traffic,
  800,
);
assert.ok(historicalEnvelope.response.state_mutations.every(
  (mutation) => mutation.source_message_id === historicalMessageId,
));
assert.ok(historicalEnvelope.response.state_mutations.every(
  (mutation) => mutation.source_message_id !== historicalSourceMessageId,
));

assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope, runtime_sha: OLD_RUNTIME,
}, request), /AI_CORE_RUNTIME_SHA_MISMATCH/);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope, runtime_sha: '0'.repeat(40),
}, request), /AI_CORE_RUNTIME_SHA_MISMATCH/);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope, contract_sha: '0'.repeat(40),
}, request), /AI_CORE_CONTRACT_SHA_MISMATCH/);
assert.throws(() => validateOwnerCanaryCoreResponse({
  ...envelope, canonicalization_version: 'CANONICAL_JSON_HASH_V0',
}, request), /AI_CORE_CANONICALIZATION_VERSION_UNSUPPORTED/);

console.log(JSON.stringify({
  approved_runtime: 'pass',
  old_runtime_rejection: 'pass',
  wrong_runtime_rejection: 'pass',
  contract_mismatch_rejection: 'pass',
  canonicalization_mismatch_rejection: 'pass',
  greeting_deterministic_fixture: 'pass',
  historical_request_local_facts: 'pass',
  historical_source_mutations: 0,
  model_route_fixture: 'covered_by_bridge_test',
  runtime_sha: APPROVED_RUNTIME,
  contract_sha: CONTRACT,
  canonicalization_version: CANONICALIZATION,
  model_requests: 0,
  result: '8/8',
}));
