import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  CANONICALIZATION_VERSION,
  buildOwnerCanaryCoreRequest,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';

const APPROVED_RUNTIME = '37efd4d17280e4f2781819a98d013d8909d2f750';
const OLD_RUNTIME = 'deec5a4ce86af17c952d7d21761050ba717b8994';
const CONTRACT = '6cd71a5596346925ecdd2ffeb9d45262d881ee93';
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
assert.equal(greetingEnvelope.response.decision_package.decision_type, 'not_required');
assert.equal(
  greetingEnvelope.response.component_versions.engineering_lab,
  'not_invoked',
);
assert.equal(greetingEnvelope.response.evaluation_result.status, 'pass');
assert.equal(
  greetingEnvelope.response.telemetry.publication.candidate_status,
  'allowed',
);

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
  runtime_sha: APPROVED_RUNTIME,
  contract_sha: CONTRACT,
  canonicalization_version: CANONICALIZATION,
  model_requests: 0,
  result: '6/6',
}));
