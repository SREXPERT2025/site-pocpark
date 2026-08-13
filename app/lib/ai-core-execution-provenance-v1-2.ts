export const AI_CORE_CONTRACT_V1_2_SHA =
  '42a4476d088540c63ffd7340195daba1a37e3b29';
export const AI_CORE_CONTRACT_V1_2_VERSION = '1.2';

// Shared by the canary-ready Site adapter. Activation remains a separate,
// owner-approved operation; this validator only enforces offline compatibility.

export const AI_CORE_DETERMINISTIC_HANDLERS = Object.freeze([
  'courtesy',
  'utility',
  'assistant_identity',
  'assistant_capabilities',
  'executor_identity_policy',
  'safe_response',
] as const);

type ExecutionMode = 'model' | 'deterministic';
type ModelExecutor = 'qwen' | 'codex';
type DeterministicHandler = typeof AI_CORE_DETERMINISTIC_HANDLERS[number];

export type AiCoreExecutionProvenanceV1_2 = Readonly<{
  executionMode: ExecutionMode;
  plannedExecutor: ModelExecutor | null;
  finalExecutor: ModelExecutor | null;
  attempts: number;
  modelRequestCount: number;
  deterministicHandler: DeterministicHandler | null;
  publicationAllowed: boolean;
}>;

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function modelExecutor(value: unknown): value is ModelExecutor {
  return value === 'qwen' || value === 'codex';
}

function deterministicHandler(value: unknown): value is DeterministicHandler {
  return typeof value === 'string'
    && (AI_CORE_DETERMINISTIC_HANDLERS as readonly string[]).includes(value);
}

function exactHash(value: unknown) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

export function validateAiCoreExecutionProvenanceV1_2(input: {
  contractSha: unknown;
  contractVersion: unknown;
  decisionPackageHash: unknown;
  stateVersionBefore: unknown;
  executorTrace: unknown;
  executorTelemetry: unknown;
  evaluationResult: unknown;
  publicationTelemetry: unknown;
}): AiCoreExecutionProvenanceV1_2 {
  if (input.contractSha !== AI_CORE_CONTRACT_V1_2_SHA
    || input.contractVersion !== AI_CORE_CONTRACT_V1_2_VERSION) {
    throw new Error('AI_CORE_CONTRACT_V1_2_IDENTITY_MISMATCH');
  }
  if (!exactHash(input.decisionPackageHash)) {
    throw new Error('AI_CORE_CONTRACT_V1_2_DECISION_PACKAGE_HASH_INVALID');
  }

  const trace = record(
    input.executorTrace,
    'AI_CORE_CONTRACT_V1_2_EXECUTOR_TRACE_INVALID',
  );
  const telemetry = record(
    input.executorTelemetry,
    'AI_CORE_CONTRACT_V1_2_EXECUTOR_TELEMETRY_INVALID',
  );
  const evaluation = record(
    input.evaluationResult,
    'AI_CORE_CONTRACT_V1_2_EVALUATION_INVALID',
  );
  const publication = record(
    input.publicationTelemetry,
    'AI_CORE_CONTRACT_V1_2_PUBLICATION_INVALID',
  );
  const attempts = trace.attempts;
  if (!Array.isArray(attempts)
    || trace.decision_package_hash !== input.decisionPackageHash
    || trace.state_version !== input.stateVersionBefore
    || trace.model_request_count !== attempts.length) {
    throw new Error('AI_CORE_CONTRACT_V1_2_EXECUTION_PROVENANCE_INVALID');
  }

  const normalizedAttempts = attempts.map((value, index) => {
    const attempt = record(
      value,
      'AI_CORE_CONTRACT_V1_2_EXECUTOR_ATTEMPT_INVALID',
    );
    if (attempt.attempt_index !== index + 1
      || !modelExecutor(attempt.executor)
      || attempt.decision_package_hash !== input.decisionPackageHash
      || attempt.state_version !== input.stateVersionBefore) {
      throw new Error('AI_CORE_CONTRACT_V1_2_EXECUTOR_ATTEMPT_INVALID');
    }
    return attempt;
  });

  let executionMode: ExecutionMode;
  let plannedExecutor: ModelExecutor | null;
  let finalExecutor: ModelExecutor | null;
  let handler: DeterministicHandler | null;

  if (trace.execution_mode === 'model') {
    executionMode = 'model';
    if (!modelExecutor(trace.planned_executor)
      || !modelExecutor(trace.final_executor)
      || trace.deterministic_handler !== null
      || normalizedAttempts.length < 1
      || normalizedAttempts.length > 2
      || normalizedAttempts[0].executor !== trace.planned_executor) {
      throw new Error('AI_CORE_CONTRACT_V1_2_MODEL_EXECUTION_INVALID');
    }
    const successful = normalizedAttempts.filter(
      (attempt) => attempt.status === 'success',
    );
    if (successful.length !== 1
      || successful[0].executor !== trace.final_executor
      || (normalizedAttempts.length === 1 && trace.fallback_reason !== 'none')) {
      throw new Error('AI_CORE_CONTRACT_V1_2_MODEL_EXECUTION_INVALID');
    }
    if (normalizedAttempts.length === 2
      && (trace.planned_executor !== 'codex'
        || normalizedAttempts[0].executor !== 'codex'
        || normalizedAttempts[0].status === 'success'
        || normalizedAttempts[1].executor !== 'qwen'
        || normalizedAttempts[1].status !== 'success'
        || trace.fallback_reason === 'none')) {
      throw new Error('AI_CORE_CONTRACT_V1_2_MODEL_EXECUTION_INVALID');
    }
    plannedExecutor = trace.planned_executor;
    finalExecutor = trace.final_executor;
    handler = null;
  } else if (trace.execution_mode === 'deterministic') {
    executionMode = 'deterministic';
    if (normalizedAttempts.length !== 0
      || trace.model_request_count !== 0
      || trace.planned_executor !== null
      || trace.final_executor !== null
      || trace.fallback_reason !== 'none'
      || !deterministicHandler(trace.deterministic_handler)) {
      throw new Error('AI_CORE_CONTRACT_V1_2_DETERMINISTIC_EXECUTION_INVALID');
    }
    plannedExecutor = null;
    finalExecutor = null;
    handler = trace.deterministic_handler;
  } else {
    throw new Error('AI_CORE_CONTRACT_V1_2_EXECUTION_MODE_INVALID');
  }

  if (telemetry.execution_mode !== executionMode
    || telemetry.planned !== plannedExecutor
    || telemetry.final !== finalExecutor
    || telemetry.attempt_count !== normalizedAttempts.length
    || telemetry.model_request_count !== normalizedAttempts.length
    || telemetry.deterministic_handler !== handler
    || telemetry.fallback_used !== (normalizedAttempts.length === 2)
    || (executionMode === 'deterministic' && telemetry.cost_bucket !== 'none')) {
    throw new Error('AI_CORE_CONTRACT_V1_2_TRACE_TELEMETRY_MISMATCH');
  }

  const publicationAllowed = evaluation.status === 'pass'
    && publication.candidate_status === 'allowed'
    && publication.published === false;

  return Object.freeze({
    executionMode,
    plannedExecutor,
    finalExecutor,
    attempts: normalizedAttempts.length,
    modelRequestCount: normalizedAttempts.length,
    deterministicHandler: handler,
    publicationAllowed,
  });
}

export function validateAiCoreSuccessfulPublicationV1_2(
  input: Parameters<typeof validateAiCoreExecutionProvenanceV1_2>[0],
) {
  const provenance = validateAiCoreExecutionProvenanceV1_2(input);
  if (!provenance.publicationAllowed) {
    throw new Error('AI_CORE_CONTRACT_V1_2_PUBLICATION_BLOCKED');
  }
  return provenance;
}
