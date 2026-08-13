import assert from 'node:assert/strict';

import {
  AI_CORE_CONTRACT_V1_2_SHA,
  AI_CORE_CONTRACT_V1_2_VERSION,
  validateAiCoreExecutionProvenanceV1_2,
  validateAiCoreSuccessfulPublicationV1_2,
} from '../app/lib/ai-core-execution-provenance-v1-2.ts';

const DP_SHA = 'd6f6f3505a689790916c262cb1618670b05777a4084c4fa7cb45c625759a08cd';

function attempt(executor, status = 'success', index = 1) {
  return {
    attempt_index: index,
    executor,
    status,
    decision_package_hash: DP_SHA,
    state_version: 7,
  };
}

function model(executor) {
  return {
    contractSha: AI_CORE_CONTRACT_V1_2_SHA,
    contractVersion: AI_CORE_CONTRACT_V1_2_VERSION,
    decisionPackageHash: DP_SHA,
    stateVersionBefore: 7,
    executorTrace: {
      execution_mode: 'model',
      planned_executor: executor,
      attempts: [attempt(executor)],
      final_executor: executor,
      fallback_reason: 'none',
      model_request_count: 1,
      deterministic_handler: null,
      decision_package_hash: DP_SHA,
      state_version: 7,
    },
    executorTelemetry: {
      execution_mode: 'model',
      planned: executor,
      final: executor,
      attempt_count: 1,
      model_request_count: 1,
      fallback_used: false,
      cost_bucket: executor === 'qwen' ? 'local_high' : 'external_high',
      deterministic_handler: null,
    },
    evaluationResult: { status: 'pass', reason_codes: [] },
    publicationTelemetry: { candidate_status: 'allowed', published: false },
  };
}

function deterministic() {
  return {
    contractSha: AI_CORE_CONTRACT_V1_2_SHA,
    contractVersion: AI_CORE_CONTRACT_V1_2_VERSION,
    decisionPackageHash: DP_SHA,
    stateVersionBefore: 7,
    executorTrace: {
      execution_mode: 'deterministic',
      planned_executor: null,
      attempts: [],
      final_executor: null,
      fallback_reason: 'none',
      model_request_count: 0,
      deterministic_handler: 'courtesy',
      decision_package_hash: DP_SHA,
      state_version: 7,
    },
    executorTelemetry: {
      execution_mode: 'deterministic',
      planned: null,
      final: null,
      attempt_count: 0,
      model_request_count: 0,
      fallback_used: false,
      cost_bucket: 'none',
      deterministic_handler: 'courtesy',
    },
    evaluationResult: { status: 'pass', reason_codes: [] },
    publicationTelemetry: { candidate_status: 'allowed', published: false },
  };
}

function clone(value) {
  return structuredClone(value);
}

const qwen = validateAiCoreSuccessfulPublicationV1_2(model('qwen'));
const codex = validateAiCoreSuccessfulPublicationV1_2(model('codex'));
const deterministicSuccess = validateAiCoreSuccessfulPublicationV1_2(
  deterministic(),
);
assert.equal(qwen.executionMode, 'model');
assert.equal(codex.executionMode, 'model');
assert.equal(deterministicSuccess.executionMode, 'deterministic');
assert.equal(deterministicSuccess.attempts, 0);
assert.equal(deterministicSuccess.finalExecutor, null);
assert.equal(deterministicSuccess.modelRequestCount, 0);
assert.equal(deterministicSuccess.deterministicHandler, 'courtesy');

const forbidden = [];
function rejects(name, mutate, pattern) {
  const candidate = clone(deterministic());
  mutate(candidate);
  assert.throws(
    () => validateAiCoreSuccessfulPublicationV1_2(candidate),
    pattern,
    name,
  );
  forbidden.push(name);
}

rejects('deterministic_with_model_attempt', (value) => {
  value.executorTrace.attempts = [attempt('qwen')];
}, /DETERMINISTIC_EXECUTION_INVALID|EXECUTION_PROVENANCE_INVALID/);
rejects('deterministic_with_final_executor', (value) => {
  value.executorTrace.final_executor = 'qwen';
}, /DETERMINISTIC_EXECUTION_INVALID/);
rejects('deterministic_with_model_request_count', (value) => {
  value.executorTrace.model_request_count = 1;
}, /EXECUTION_PROVENANCE_INVALID|DETERMINISTIC_EXECUTION_INVALID/);
rejects('deterministic_with_unknown_handler', (value) => {
  value.executorTrace.deterministic_handler = 'unknown';
}, /DETERMINISTIC_EXECUTION_INVALID/);

const qwenWithoutAttempts = model('qwen');
qwenWithoutAttempts.executorTrace.attempts = [];
assert.throws(
  () => validateAiCoreSuccessfulPublicationV1_2(qwenWithoutAttempts),
  /EXECUTION_PROVENANCE_INVALID|MODEL_EXECUTION_INVALID/,
);
forbidden.push('model_with_empty_attempts');

const qwenWithoutFinal = model('qwen');
qwenWithoutFinal.executorTrace.final_executor = null;
assert.throws(
  () => validateAiCoreSuccessfulPublicationV1_2(qwenWithoutFinal),
  /MODEL_EXECUTION_INVALID/,
);
forbidden.push('model_with_null_final_executor');

const telemetryMismatch = deterministic();
telemetryMismatch.executorTelemetry.model_request_count = 1;
assert.throws(
  () => validateAiCoreSuccessfulPublicationV1_2(telemetryMismatch),
  /TRACE_TELEMETRY_MISMATCH/,
);
forbidden.push('trace_model_request_count_mismatch');

const blockedByEvaluation = deterministic();
blockedByEvaluation.evaluationResult.status = 'fail';
blockedByEvaluation.publicationTelemetry.candidate_status = 'blocked';
const blockedProvenance = validateAiCoreExecutionProvenanceV1_2(
  blockedByEvaluation,
);
assert.equal(blockedProvenance.publicationAllowed, false);
assert.throws(
  () => validateAiCoreSuccessfulPublicationV1_2(blockedByEvaluation),
  /PUBLICATION_BLOCKED/,
);
forbidden.push('deterministic_failed_evaluation_not_publishable');

console.log(JSON.stringify({
  contract_sha: AI_CORE_CONTRACT_V1_2_SHA,
  contract_version: AI_CORE_CONTRACT_V1_2_VERSION,
  model_success_qwen: 'pass',
  model_success_codex: 'pass',
  deterministic_success: 'pass',
  attempts_empty: 'pass',
  final_executor_null: 'pass',
  model_request_count_zero: 'pass',
  deterministic_handler: 'pass',
  trace_schema_compatibility: 'pass',
  security_publication_invariants: 'pass',
  invalid_combinations_rejected: `${forbidden.length}/${forbidden.length}`,
  model_requests: 0,
  production_changes: 0,
}, null, 2));
