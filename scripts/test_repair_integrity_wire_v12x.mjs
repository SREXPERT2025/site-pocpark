import assert from 'node:assert/strict';

import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_CONTRACT_VERSION,
  AI_CORE_OWNER_MODEL,
  AI_CORE_RUNTIME_SHA,
  AI_CORE_RUNTIME_TRACE_VERSION,
  AI_CORE_RUNTIME_VERSION,
  CANONICALIZATION_VERSION,
  OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
  preGateTelemetryFromError,
  restrictedForensicFromError,
  sha256,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';

const MESSAGE_ID = 'message_current_00000001';
const REQUEST_ID = 'aicore_repair_wire_00000001';
const payload = {
  message_id: MESSAGE_ID,
  state_version: 0,
  executor_policy: {
    allowed_executors: ['qwen'],
  },
};
const request = {
  contract_version: AI_CORE_CONTRACT_VERSION,
  canonicalization_version: CANONICALIZATION_VERSION,
  request_id: REQUEST_ID,
  idempotency_key: 'idem:repair:wire:00000001',
  request_payload_hash: sha256(payload),
  site_release: '243b831ef8f15733dd60e27d63d57c71d2a4113e',
  gateway_release: 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9',
  sent_at: '2026-08-13T12:00:00.000Z',
  trace_context: {
    trace_id: 'trace:repair:wire:00000001',
    span_id: 'span:repair:wire:00000001',
    parent_span_id: null,
  },
  dry_run: true,
  payload,
};
const decisionPackage = {
  schema_version: '1.2',
  decision_type: 'not_required',
  next_question: null,
};
const decisionPackageHash = sha256(decisionPackage);

function trace() {
  const value = {
    schema_version: AI_CORE_RUNTIME_TRACE_VERSION,
    identity: {
      runtime_sha: AI_CORE_RUNTIME_SHA,
      contract_sha: AI_CORE_CONTRACT_SHA,
      canonicalization_version: CANONICALIZATION_VERSION,
    },
    routing: {},
    state: {},
    pipeline: [],
    timeline: [],
    diagnostics: {},
    runtime_error: null,
  };
  return { ...value, trace_sha256: sha256(value) };
}

function response({
  executionMode = 'deterministic',
  reasonCodes = [],
  blocked = false,
  repairApplied = false,
  rewriteRatio = 0,
} = {}) {
  const model = executionMode === 'model';
  const repairMethod = repairApplied ? 'deterministic' : 'none';
  return {
    contract_version: AI_CORE_CONTRACT_VERSION,
    canonicalization_version: CANONICALIZATION_VERSION,
    success: true,
    request_id: request.request_id,
    response_id: 'response:repair:wire:00000001',
    idempotency_key: request.idempotency_key,
    request_payload_hash: request.request_payload_hash,
    state_version_before: 0,
    state_version_after: 0,
    context_resolution: {},
    controller_decision: {},
    decision_package_schema: '1.2',
    decision_package: decisionPackage,
    decision_package_hash: decisionPackageHash,
    executor_trace: {
      execution_mode: executionMode,
      planned_executor: model ? 'qwen' : null,
      attempts: model ? [{
        attempt_index: 1,
        executor: 'qwen',
        started_at: '2026-08-13T12:00:00.000Z',
        finished_at: '2026-08-13T12:00:00.010Z',
        status: 'success',
        safe_error_code: null,
        latency_ms: 10,
        cost_bucket: 'local_low',
        decision_package_hash: decisionPackageHash,
        state_version: 0,
      }] : [],
      final_executor: model ? 'qwen' : null,
      fallback_reason: 'none',
      model_request_count: model ? 1 : 0,
      deterministic_handler: model ? null : 'courtesy',
      decision_package_hash: decisionPackageHash,
      state_version: 0,
    },
    raw_answer_reference: 'rawref:repair:wire:00000001',
    answer: blocked ? 'Кандидат не должен публиковаться.' : 'Здравствуйте!',
    repair_result: {
      applied: repairApplied,
      method: repairMethod,
      reason_codes: [...reasonCodes],
      rewrite_ratio: rewriteRatio,
      decision_package_hash: decisionPackageHash,
    },
    evaluation_result: {
      evaluated_candidate: 'final_visible_candidate',
      status: blocked ? 'fail' : 'pass',
      reason_codes: blocked ? ['required_content_missing'] : [],
    },
    state_mutations: [],
    next_question: null,
    component_versions: { context_integrity: '2.2' },
    telemetry: {
      trace_id: 'trace:repair:wire:00000001',
      request_id: request.request_id,
      canonicalization_version: CANONICALIZATION_VERSION,
      route: 'ai_core',
      component_versions: { context_integrity: '2.2' },
      latency: { total_ms: model ? 17 : 7, executor_ms: model ? 10 : 0 },
      executor: {
        execution_mode: executionMode,
        planned: model ? 'qwen' : null,
        final: model ? 'qwen' : null,
        attempt_count: model ? 1 : 0,
        model_request_count: model ? 1 : 0,
        fallback_used: false,
        cost_bucket: model ? 'local_low' : 'none',
        deterministic_handler: model ? null : 'courtesy',
      },
      repair: {
        applied: repairApplied,
        method: repairMethod,
        reason_codes: [...reasonCodes],
        rewrite_ratio: rewriteRatio,
      },
      evaluation: {
        raw_status: blocked ? 'review_required' : 'pass',
        final_status: blocked ? 'fail' : 'pass',
      },
      publication: {
        candidate_status: blocked ? 'blocked' : 'allowed',
        published: false,
      },
    },
  };
}

function forensic(runtimeResponse, reasonCodes) {
  const value = {
    schema_version: OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
    ai_core_request_id: request.request_id,
    runtime: {
      sha: AI_CORE_RUNTIME_SHA,
      version: AI_CORE_RUNTIME_VERSION,
      contract_sha: AI_CORE_CONTRACT_SHA,
      canonicalization_version: CANONICALIZATION_VERSION,
    },
    resolved: {
      intent: 'engineering_solution',
      action: 'recommend_architecture',
      current_turn_facts_summary: [],
    },
    controller: {
      action: 'answer_with_recommendation',
      answer_required: true,
      question_required: false,
    },
    lab: {
      decision_package_summary: {
        schema_version: '1.2',
        decision_type: 'not_required',
      },
      decision_package_sha: decisionPackageHash,
    },
    projection: { sha: sha256({ projection: 'repair-wire-v12x' }) },
    semantic_coverage: {
      raw: { status: 'missing', reason_codes: ['required_content_missing'] },
      final: { status: 'missing', reason_codes: ['required_content_missing'] },
    },
    executor: {
      name: 'qwen',
      raw_answer: runtimeResponse.answer,
      request_count: 1,
    },
    repair: {
      applied: runtimeResponse.repair_result.applied,
      method: runtimeResponse.repair_result.method,
      repaired_answer: runtimeResponse.answer,
      reason_codes: [...reasonCodes],
    },
    evaluation: {
      raw: { status: 'review_required', reason_codes: ['required_content_missing'] },
      final: { status: 'fail', reason_codes: ['required_content_missing'] },
    },
    mutation: { proposed: false, summary: [] },
    publication: {
      candidate_status: 'blocked',
      blocking_predicate: 'final_evaluation_status_must_equal_pass',
    },
  };
  return { ...value, evidence_sha256: sha256(value) };
}

function envelope(runtimeResponse, forensicReasonCodes = undefined) {
  const result = {
    runtime_sha: AI_CORE_RUNTIME_SHA,
    runtime_version: AI_CORE_RUNTIME_VERSION,
    contract_sha: AI_CORE_CONTRACT_SHA,
    canonicalization_version: CANONICALIZATION_VERSION,
    model: AI_CORE_OWNER_MODEL,
    response: runtimeResponse,
    observability_trace: trace(),
  };
  if (forensicReasonCodes !== undefined) {
    result.restricted_forensic = forensic(
      runtimeResponse,
      forensicReasonCodes,
    );
  }
  return result;
}

function capture(candidate) {
  try {
    return { value: validateOwnerCanaryCoreResponse(candidate, request) };
  } catch (error) {
    return { error };
  }
}

const fixtures = [];
function pass(name, assertion) {
  assertion();
  fixtures.push(name);
}

pass('F1_all_three_empty_equal', () => {
  const candidate = response({ executionMode: 'model', blocked: true });
  const { error } = capture(envelope(candidate, []));
  assert.match(error.message, /AI_CORE_FINAL_GATE_BLOCKED/);
});

pass('F2_all_three_nonempty_equal', () => {
  const codes = ['alpha_code', 'beta_code'];
  const candidate = response({ executionMode: 'model', blocked: true, reasonCodes: codes });
  const { error } = capture(envelope(candidate, [...codes].reverse()));
  assert.match(error.message, /AI_CORE_FINAL_GATE_BLOCKED/);
});

pass('F3_repair_result_differs_from_telemetry', () => {
  const candidate = response({ executionMode: 'model', blocked: true, reasonCodes: ['alpha_code'] });
  candidate.telemetry.repair.reason_codes = ['beta_code'];
  const { error } = capture(envelope(candidate, ['beta_code']));
  assert.match(error.message, /AI_CORE_REPAIR_RESULT_TELEMETRY_REASON_MISMATCH/);
});

pass('F4_repair_result_differs_from_forensic', () => {
  const candidate = response({ executionMode: 'model', blocked: true, reasonCodes: ['alpha_code'] });
  const { error } = capture(envelope(candidate, ['beta_code']));
  assert.match(error.message, /AI_CORE_RESTRICTED_FORENSIC_REPAIR_REASON_MISMATCH/);
});

pass('F5_telemetry_differs_from_forensic', () => {
  const candidate = response({ executionMode: 'model', blocked: true, reasonCodes: ['beta_code'] });
  const { error } = capture(envelope(candidate, ['alpha_code']));
  assert.match(error.message, /AI_CORE_RESTRICTED_FORENSIC_REPAIR_REASON_MISMATCH/);
});

pass('F6_missing_required_wire_field', () => {
  const candidate = response();
  delete candidate.repair_result.reason_codes;
  const { error } = capture(envelope(candidate));
  assert.match(error.message, /INVALID_AI_CORE_REPAIR/);
});

pass('F7_deterministic_success_without_repair', () => {
  const candidate = response();
  const { value } = capture(envelope(candidate));
  assert.equal(value.preGateTelemetry.executionMode, 'deterministic');
  assert.equal(value.preGateTelemetry.executorRequestCount, 0);
  assert.deepEqual(value.preGateTelemetry.repairReasonCodes, []);
  assert.ok(value.observabilityTrace);
});

pass('F8_blocked_rewrite_ratio_integrity_pass_publication_blocked', () => {
  const codes = ['repair_rewrite_ratio_exceeded'];
  const candidate = response({
    executionMode: 'model',
    blocked: true,
    reasonCodes: codes,
    repairApplied: true,
    rewriteRatio: 0.6,
  });
  const { error } = capture(envelope(candidate, codes));
  assert.match(error.message, /AI_CORE_FINAL_GATE_BLOCKED/);
  assert.deepEqual(preGateTelemetryFromError(error).repairReasonCodes, codes);
  assert.deepEqual(
    restrictedForensicFromError(error).repair.reason_codes,
    codes,
  );
});

const authorizedMutation = response();
authorizedMutation.state_mutations = [{
  target: 'thread_state',
  field: 'entrances_count',
  expected_state_version: 0,
  proposed_state_version: 1,
  source_message_id: MESSAGE_ID,
}];
authorizedMutation.state_version_after = 1;
assert.doesNotThrow(() => validateOwnerCanaryCoreResponse(
  envelope(authorizedMutation), request,
));

const historicalMutation = structuredClone(authorizedMutation);
historicalMutation.state_mutations[0].source_message_id = 'message_old_00000001';
assert.throws(
  () => validateOwnerCanaryCoreResponse(envelope(historicalMutation), request),
  /AI_CORE_MUTATION_VERSION_OR_AUTHORITY_VIOLATION/,
);

console.log(JSON.stringify({
  contract_sha: AI_CORE_CONTRACT_SHA,
  allowed_runtime_pin: AI_CORE_RUNTIME_SHA,
  fixtures: `${fixtures.length}/${fixtures.length}`,
  triple_reason_code_equality: 'pass',
  missing_wire_fields_fail_closed: 'pass',
  deterministic_success_without_repair: 'pass',
  blocked_repair_integrity: 'pass',
  blocked_repair_publication: 'blocked',
  mutation_authority_unchanged: 'pass',
  trace_hash: 'pass',
  model_requests: 0,
  production_changes: 0,
}, null, 2));
