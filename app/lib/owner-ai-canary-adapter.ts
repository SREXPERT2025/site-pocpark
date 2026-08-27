import {
  CANONICALIZATION_VERSION,
  canonicalJson,
  sha256,
} from './canonical-json-hash-v1.ts';
import {
  AI_CORE_CONTRACT_V1_2_SHA,
  AI_CORE_CONTRACT_V1_2_VERSION,
  validateAiCoreExecutionProvenanceV1_2,
} from './ai-core-execution-provenance-v1-2.ts';

export const AI_CORE_RUNTIME_SHA =
  '5606a1fc4698666ba01e93d5ab25958f026833e8';
export const AI_CORE_CONTRACT_SHA = AI_CORE_CONTRACT_V1_2_SHA;
export const AI_CORE_CONTRACT_VERSION = AI_CORE_CONTRACT_V1_2_VERSION;
export const AI_CORE_RUNTIME_VERSION = '1.3.0';
export const AI_CORE_OWNER_MODEL = 'qwen3.6:27b';
const CONSENT_SAFE_CONTEXT_REFS = Object.freeze([
  'ctxref:knowledge:parking_access',
] as const);
export const OWNER_CANARY_BLOCKED_FORENSIC_VERSION =
  'OWNER_CANARY_BLOCKED_FORENSIC_V1';
export const PUBLIC_BLOCKED_SAFE_FORENSIC_VERSION =
  'PUBLIC_BLOCKED_SAFE_FORENSIC_V1';
export const AI_CORE_RUNTIME_TRACE_VERSION = 'AI_CORE_RUNTIME_TRACE_V1';
export { CANONICALIZATION_VERSION, canonicalJson, sha256 };

export const decisionPackageHash = sha256;

export type OwnerCanaryRecentMessage = {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type OwnerCanaryThreadState = {
  conversationThreadId: string;
  stateVersion: number;
  confirmedProjectFacts: unknown[];
  candidateFacts: unknown[];
  conflicts: unknown[];
  activeQuestion: unknown | null;
  askedQuestions: unknown[];
  conversationPreferences: Record<string, unknown>;
  lastMutationAcknowledgement: unknown | null;
};

export type OwnerCanaryCoreRequest = Readonly<{
  contract_version: typeof AI_CORE_CONTRACT_VERSION;
  canonicalization_version: typeof CANONICALIZATION_VERSION;
  request_id: string;
  idempotency_key: string;
  request_payload_hash: string;
  site_release: string;
  gateway_release: string;
  sent_at: string;
  trace_context: {
    trace_id: string;
    span_id: string;
    parent_span_id: string | null;
  };
  dry_run: boolean;
  payload: Record<string, unknown>;
}>;

function safeHintCode(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9:_/-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160) || 'unknown';
}

function buildIntentHints(input: {
  sourcePage: string;
  pageContextIntentHint?: unknown;
  messageId: string;
}) {
  const hints: Record<string, unknown>[] = [];
  const sourcePage = input.sourcePage.trim().slice(0, 160);
  if (sourcePage) {
    hints.push({
      hint_id: `hint:${sha256(`path\0${sourcePage}`).slice(0, 24)}`,
      source_type: 'pathname',
      value_code: safeHintCode(sourcePage),
      provenance_ref: `hintref:path_${sha256(sourcePage).slice(0, 20)}`,
      confirmation_status: 'unconfirmed',
    });
  }
  if (input.pageContextIntentHint !== undefined
    && input.pageContextIntentHint !== null) {
    const encoded = canonicalJson(input.pageContextIntentHint);
    hints.push({
      hint_id: `hint:${sha256(`ui\0${encoded}`).slice(0, 24)}`,
      source_type: 'ui_selection',
      value_code: `ui:${sha256(encoded).slice(0, 24)}`,
      provenance_ref: `hintref:message_${sha256(input.messageId).slice(0, 20)}`,
      confirmation_status: 'unconfirmed',
    });
  }
  return hints;
}

export function ownerCanaryIdempotencyKey(
  conversationThreadId: string,
  messageId: string,
) {
  return `idem:${sha256(
    `${conversationThreadId}\0${messageId}`,
  ).slice(0, 48)}`;
}

export function buildOwnerCanaryCoreRequest(input: {
  aiCoreRequestId: string;
  conversationThreadId: string;
  messageId: string;
  parentMessageId?: string | null;
  currentMessage: string;
  sourcePage: string;
  pageContextIntentHint?: unknown;
  recentMessages?: OwnerCanaryRecentMessage[];
  state: OwnerCanaryThreadState;
  siteRelease: string;
  gatewayRelease: string;
  sentAt?: string;
  traceId?: string;
  spanId?: string;
  dryRun?: boolean;
  policyId?: string;
}): OwnerCanaryCoreRequest {
  if (input.state.conversationThreadId !== input.conversationThreadId) {
    throw new Error('STATE_IDENTITY_MISMATCH');
  }
  const sentAt = input.sentAt ?? new Date().toISOString();
  const idempotencyKey = ownerCanaryIdempotencyKey(
    input.conversationThreadId,
    input.messageId,
  );
  const payload = {
    potential_project_id: null,
    conversation_thread_id: input.conversationThreadId,
    conversation_id: input.conversationThreadId,
    message_id: input.messageId,
    parent_message_id: input.parentMessageId ?? null,
    timestamp: sentAt,
    channel: 'website',
    current_message: input.currentMessage,
    recent_messages: (input.recentMessages ?? []).slice(-20),
    state_version: input.state.stateVersion,
    confirmed_project_facts: input.state.confirmedProjectFacts,
    candidate_facts: input.state.candidateFacts,
    fact_conflicts: input.state.conflicts,
    intent_hints: buildIntentHints(input),
    active_question: input.state.activeQuestion,
    // Immutable reference to verified corporate parking knowledge. It carries
    // no visitor data and is the evidence context required by Contract V1.2.
    consent_safe_context_refs: [...CONSENT_SAFE_CONTEXT_REFS],
    executor_policy: {
      policy_id: input.policyId ?? 'policy:owner_qwen_v1',
      assignment_id: `assignment:${sha256(input.conversationThreadId).slice(0, 32)}`,
      planned_executor: 'qwen',
      allowed_executors: ['qwen'],
      max_model_fallbacks: 0,
      fallback_order: ['qwen'],
      attempt_timeout_ms: 90_000,
      total_timeout_ms: 90_000,
      cost_bucket_limit: 'local_high',
      deterministic_route_handling: 'outside_executor_attempts',
    },
  };
  return Object.freeze({
    contract_version: AI_CORE_CONTRACT_VERSION,
    canonicalization_version: CANONICALIZATION_VERSION,
    request_id: input.aiCoreRequestId,
    idempotency_key: idempotencyKey,
    request_payload_hash: sha256(payload),
    site_release: input.siteRelease,
    gateway_release: input.gatewayRelease,
    sent_at: sentAt,
    trace_context: {
      trace_id: input.traceId ?? `trace:${sha256(input.aiCoreRequestId).slice(0, 24)}`,
      span_id: input.spanId ?? `span:${sha256(input.messageId).slice(0, 24)}`,
      parent_span_id: null,
    },
    dry_run: input.dryRun ?? false,
    payload,
  });
}

export function buildPublicAiCoreRequest(
  input: Parameters<typeof buildOwnerCanaryCoreRequest>[0],
) {
  return buildOwnerCanaryCoreRequest({
    ...input,
    policyId: 'policy:public_qwen_v1',
  });
}

export type OwnerCanaryRuntimeEnvelope = Readonly<{
  runtime_sha: typeof AI_CORE_RUNTIME_SHA;
  runtime_version: typeof AI_CORE_RUNTIME_VERSION;
  contract_sha: typeof AI_CORE_CONTRACT_SHA;
  canonicalization_version: typeof CANONICALIZATION_VERSION;
  model: typeof AI_CORE_OWNER_MODEL;
  response: Record<string, unknown>;
  preGateTelemetry: OwnerCanaryPreGateTelemetry;
  restrictedForensic: OwnerCanaryRestrictedForensicEvidence | null;
  observabilityTrace: AiCoreRuntimeObservabilityTrace | null;
  transportEvidence?: AiCoreTransportEvidence;
}>;

export type AiCoreTransportEvidence = Readonly<{
  endpoint: string;
  request_id: string;
  request_body_sha256: string;
  expected_site_sha: string;
  expected_runtime_sha: string;
  expected_contract_sha: string;
  outcome: 'http_response_accepted' | 'http_response_rejected'
    | 'transport_timeout' | 'transport_unavailable';
  http_status: number | null;
  error_class: string | null;
}>;

export type AiCoreRuntimeObservabilityTrace = Readonly<{
  schema_version: typeof AI_CORE_RUNTIME_TRACE_VERSION;
  identity: Readonly<Record<string, unknown>>;
  routing: Readonly<Record<string, unknown>>;
  state: Readonly<Record<string, unknown>>;
  pipeline: readonly Readonly<Record<string, unknown>>[];
  timeline: readonly Readonly<Record<string, unknown>>[];
  diagnostics: Readonly<Record<string, unknown>>;
  runtime_error: Readonly<Record<string, unknown>> | null;
  trace_sha256: string;
}>;

export type OwnerCanaryRestrictedForensicEvidence = Readonly<{
  schema_version: typeof OWNER_CANARY_BLOCKED_FORENSIC_VERSION;
  ai_core_request_id: string;
  evidence_sha256: string;
  runtime: Readonly<{
    sha: string;
    version: string;
    contract_sha: string;
    canonicalization_version: string;
  }>;
  resolved: Readonly<{
    intent: string;
    action: string;
    current_turn_facts_summary: readonly Record<string, unknown>[];
  }>;
  controller: Readonly<Record<string, unknown>>;
  lab: Readonly<{
    decision_package_summary: Readonly<Record<string, unknown>>;
    decision_package_sha: string;
  }>;
  projection: Readonly<{ sha: string }>;
  semantic_coverage: Readonly<Record<string, unknown>>;
  executor: Readonly<{
    name: 'qwen';
    raw_answer: string;
    request_count: 1;
  }>;
  repair: Readonly<{
    applied: boolean;
    method: 'none' | 'deterministic';
    repaired_answer: string;
    reason_codes: readonly string[];
  }>;
  evaluation: Readonly<Record<string, unknown>>;
  mutation: Readonly<{
    proposed: boolean;
    summary: readonly Record<string, unknown>[];
  }>;
  publication: Readonly<{
    candidate_status: 'blocked' | 'owner_review';
    blocking_predicate: string;
  }>;
}>;

export type OwnerCanaryPreGateTelemetry = Readonly<{
  aiCoreRequestId: string;
  runtimeSha: string;
  contractSha: string;
  canonicalizationVersion: string;
  decisionPackageSha: string;
  projectionSourceSha: string;
  plannedExecutor: string;
  finalExecutor: string;
  executorRequestCount: number;
  executionMode: 'model' | 'deterministic';
  deterministicHandler: string | null;
  rawEvaluationStatus: string;
  finalEvaluationStatus: string;
  evaluationReasonCodes: readonly string[];
  repairApplied: boolean;
  repairStatus: string;
  repairReasonCodes: readonly string[];
  publicationCandidateStatus: string;
  stateMutationProposed: boolean;
  latencyStages: Readonly<Record<string, number>>;
}>;

export type PublicBlockedSafeForensicEvidence = Readonly<{
  schema_version: typeof PUBLIC_BLOCKED_SAFE_FORENSIC_VERSION;
  ai_core_request_id: string;
  route: 'public_ai_core';
  site_sha: string;
  runtime_sha: string;
  runtime_version: string;
  contract_sha: string;
  canonicalization_version: string;
  resolved_intent: string | null;
  resolved_action: string | null;
  extracted_facts: readonly Readonly<{
    field: string;
    value_kind: string;
  }>[];
  decision_package_sha: string;
  projection_sha: string | null;
  semantic_coverage: Readonly<{
    raw_status: string | null;
    raw_reason_codes: readonly string[];
    final_status: string | null;
    final_reason_codes: readonly string[];
  }>;
  executor: string;
  executor_request_count: number;
  retries: number;
  fallbacks: number;
  raw_evaluation_status: string;
  raw_evaluation_reason_codes: readonly string[];
  repair_applied: boolean;
  repair_reason_codes: readonly string[];
  final_evaluation_status: string;
  final_evaluation_reason_codes: readonly string[];
  runtime_publication_status: string;
  site_blocking_predicate: string;
  proposed_mutation: Readonly<{
    proposed: boolean;
    summary: readonly Readonly<{
      target: string;
      operation: string;
      field: string;
      value_kind: string;
      expected_state_version: number;
      proposed_state_version: number;
    }>[];
  }>;
  durable_commit_count: 0;
  duplicate_execution_count: number;
  duplicate_mutation_count: 0;
  latency_stages: Readonly<Record<string, number>>;
}>;

export type AiCoreValidatedBlockedMutationBatch = Readonly<{
  responseId: string;
  mutations: readonly Readonly<Record<string, unknown>>[];
}>;

class AiCoreAdapterBlockedError extends Error {
  readonly preGateTelemetry: OwnerCanaryPreGateTelemetry;
  readonly publicSafeForensic: PublicBlockedSafeForensicEvidence;
  readonly observabilityTrace: AiCoreRuntimeObservabilityTrace | null;
  readonly validatedMutationBatch: AiCoreValidatedBlockedMutationBatch;

  constructor(
    code: string,
    telemetry: OwnerCanaryPreGateTelemetry,
    publicSafeForensic: PublicBlockedSafeForensicEvidence,
    cause: unknown,
    observabilityTrace: AiCoreRuntimeObservabilityTrace | null,
    validatedMutationBatch: AiCoreValidatedBlockedMutationBatch,
  ) {
    super(code, { cause });
    this.name = 'AiCoreAdapterBlockedError';
    this.preGateTelemetry = telemetry;
    this.publicSafeForensic = publicSafeForensic;
    this.observabilityTrace = observabilityTrace;
    this.validatedMutationBatch = validatedMutationBatch;
  }
}

type AiCoreRuntimeSafeFailure = Readonly<{
  code: string;
  category: string;
  retryable: boolean;
  safeMessageCode: string;
  stage: string;
}>;

class AiCoreRuntimeSafeError extends Error {
  readonly runtimeFailure: AiCoreRuntimeSafeFailure;
  readonly observabilityTrace: AiCoreRuntimeObservabilityTrace | null;

  constructor(
    runtimeFailure: AiCoreRuntimeSafeFailure,
    observabilityTrace: AiCoreRuntimeObservabilityTrace | null,
  ) {
    super(`AI_CORE_RUNTIME_${runtimeFailure.code}`);
    this.name = 'AiCoreRuntimeSafeError';
    this.runtimeFailure = runtimeFailure;
    this.observabilityTrace = observabilityTrace;
  }
}

export class AiCoreFinalGateBlockedError extends Error {
  readonly preGateTelemetry: OwnerCanaryPreGateTelemetry;
  readonly restrictedForensic: OwnerCanaryRestrictedForensicEvidence;
  readonly publicSafeForensic: PublicBlockedSafeForensicEvidence;
  readonly observabilityTrace: AiCoreRuntimeObservabilityTrace | null;
  readonly validatedMutationBatch: AiCoreValidatedBlockedMutationBatch;

  constructor(
    telemetry: OwnerCanaryPreGateTelemetry,
    restrictedForensic: OwnerCanaryRestrictedForensicEvidence,
    publicSafeForensic: PublicBlockedSafeForensicEvidence,
    observabilityTrace: AiCoreRuntimeObservabilityTrace | null,
    validatedMutationBatch: AiCoreValidatedBlockedMutationBatch,
  ) {
    super('AI_CORE_FINAL_GATE_BLOCKED');
    this.name = 'AiCoreFinalGateBlockedError';
    this.preGateTelemetry = telemetry;
    this.restrictedForensic = restrictedForensic;
    this.publicSafeForensic = publicSafeForensic;
    this.observabilityTrace = observabilityTrace;
    this.validatedMutationBatch = validatedMutationBatch;
  }
}

export function preGateTelemetryFromError(error: unknown) {
  return error instanceof AiCoreFinalGateBlockedError
    || error instanceof AiCoreAdapterBlockedError
    ? error.preGateTelemetry
    : null;
}

export function restrictedForensicFromError(error: unknown) {
  return error instanceof AiCoreFinalGateBlockedError
    ? error.restrictedForensic
    : null;
}

export function publicBlockedSafeForensicFromError(error: unknown) {
  return error instanceof AiCoreFinalGateBlockedError
    || error instanceof AiCoreAdapterBlockedError
    ? error.publicSafeForensic
    : null;
}

export function observabilityTraceFromError(error: unknown) {
  return error instanceof AiCoreFinalGateBlockedError
    || error instanceof AiCoreAdapterBlockedError
    || error instanceof AiCoreRuntimeSafeError
    ? error.observabilityTrace
    : null;
}

export function validatedBlockedMutationBatchFromError(error: unknown) {
  return error instanceof AiCoreFinalGateBlockedError
    || error instanceof AiCoreAdapterBlockedError
    ? error.validatedMutationBatch
    : null;
}

export function runtimeSafeFailureFromError(error: unknown) {
  return error instanceof AiCoreRuntimeSafeError
    ? error.runtimeFailure
    : null;
}

export function transportEvidenceFromError(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  const evidence = (error as { transportEvidence?: unknown }).transportEvidence;
  return evidence && typeof evidence === 'object'
    ? evidence as AiCoreTransportEvidence : null;
}

function record(value: unknown, code: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function validateObservabilityTrace(
  value: unknown,
): AiCoreRuntimeObservabilityTrace | null {
  try {
    const trace = record(value, 'INVALID_AI_CORE_OBSERVABILITY_TRACE');
    if (trace.schema_version !== AI_CORE_RUNTIME_TRACE_VERSION
      || !Array.isArray(trace.pipeline)
      || !Array.isArray(trace.timeline)
      || typeof trace.trace_sha256 !== 'string'
      || !/^[a-f0-9]{64}$/.test(trace.trace_sha256)) {
      return null;
    }
    const allowedStatuses = new Set([
      'pass', 'warn', 'blocked', 'not_used', 'error', 'not_reached',
    ]);
    for (const rawStage of trace.pipeline) {
      const stage = record(rawStage, 'INVALID_TRACE_STAGE');
      if (typeof stage.name !== 'string'
        || !allowedStatuses.has(String(stage.status))
        || !Array.isArray(stage.reason_codes)
        || (stage.latency_ms !== null
          && typeof stage.latency_ms !== 'number')) {
        return null;
      }
    }
    const identity = record(
      trace.identity,
      'INVALID_AI_CORE_OBSERVABILITY_IDENTITY',
    );
    if (identity.runtime_sha !== AI_CORE_RUNTIME_SHA
      || identity.contract_sha !== AI_CORE_CONTRACT_SHA
      || identity.canonicalization_version !== CANONICALIZATION_VERSION) {
      return null;
    }
    const withoutHash = { ...trace };
    delete withoutHash.trace_sha256;
    if (sha256(withoutHash) !== trace.trace_sha256) return null;
    return Object.freeze({
      ...trace,
      identity: Object.freeze({ ...identity }),
      routing: Object.freeze({ ...record(trace.routing, 'INVALID_TRACE_ROUTING') }),
      state: Object.freeze({ ...record(trace.state, 'INVALID_TRACE_STATE') }),
      pipeline: trace.pipeline.map((item) => Object.freeze({
        ...record(item, 'INVALID_TRACE_STAGE'),
      })),
      timeline: trace.timeline.map((item) => Object.freeze({
        ...record(item, 'INVALID_TRACE_TIMELINE'),
      })),
      diagnostics: Object.freeze({
        ...record(trace.diagnostics, 'INVALID_TRACE_DIAGNOSTICS'),
      }),
      runtime_error: trace.runtime_error === null
        ? null
        : Object.freeze({
          ...record(trace.runtime_error, 'INVALID_TRACE_RUNTIME_ERROR'),
        }),
    }) as unknown as AiCoreRuntimeObservabilityTrace;
  } catch {
    // Observability is deliberately fail-open relative to the AI response.
    return null;
  }
}

function telemetryString(value: unknown, code: string) {
  if (typeof value !== 'string'
    || !value
    || value.length > 160
    || /[\r\n\0]/.test(value)) {
    throw new Error(code);
  }
  return value;
}

function telemetryEnum(
  value: unknown,
  allowed: readonly string[],
  code: string,
) {
  const normalized = telemetryString(value, code);
  if (!allowed.includes(normalized)) throw new Error(code);
  return normalized;
}

function telemetryReasonCodes(value: unknown, code: string) {
  if (!Array.isArray(value)
    || value.some((item) => typeof item !== 'string'
      || !/^[a-z][a-z0-9_]{0,100}$/.test(item))) {
    throw new Error(code);
  }
  return Object.freeze(value.map(String));
}

export function normalizeRepairReasonCodes(
  value: unknown,
  code = 'INVALID_AI_CORE_REPAIR_REASON_CODES',
) {
  const codes = telemetryReasonCodes(value, code);
  if (new Set(codes).size !== codes.length) throw new Error(code);
  return Object.freeze([...codes].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0));
}

function telemetryLatencyStages(value: unknown) {
  const latency = record(value, 'INVALID_AI_CORE_LATENCY_TELEMETRY');
  const safe: Record<string, number> = {};
  for (const [key, item] of Object.entries(latency)) {
    if (!/^[a-z][a-z0-9_]{0,79}$/.test(key)
      || typeof item !== 'number'
      || !Number.isFinite(item)
      || item < 0) {
      throw new Error('INVALID_AI_CORE_LATENCY_TELEMETRY');
    }
    safe[key] = item;
  }
  return Object.freeze(safe);
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  code: string,
) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
    || actual.some((item, index) => item !== wanted[index])) {
    throw new Error(code);
  }
}

function forensicCode(value: unknown, code: string) {
  if (typeof value !== 'string'
    || !/^[a-z][a-z0-9_]{0,100}$/.test(value)) {
    throw new Error(code);
  }
  return value;
}

const FORENSIC_SECRET_PATTERN =
  /(?:\bBearer\s+[A-Za-z0-9._~+/=-]+|\bsk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|secret|token)\s*=)/i;

function validateRestrictedValue(
  value: unknown,
  depth = 0,
) {
  if (depth > 12) throw new Error('AI_CORE_RESTRICTED_FORENSIC_TOO_DEEP');
  if (value === null || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))) return;
  if (typeof value === 'string') {
    if (value.length > 8_000 || /[\0]/.test(value)
      || FORENSIC_SECRET_PATTERN.test(value)) {
      throw new Error('AI_CORE_RESTRICTED_FORENSIC_SECRET_OR_SIZE');
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 200) {
      throw new Error('AI_CORE_RESTRICTED_FORENSIC_TOO_LARGE');
    }
    value.forEach((item) => validateRestrictedValue(item, depth + 1));
    return;
  }
  const item = record(value, 'AI_CORE_RESTRICTED_FORENSIC_INVALID_VALUE');
  for (const [key, nested] of Object.entries(item)) {
    if (['cookie', 'credential', 'credentials', 'password', 'secret', 'token',
      'user_message', 'current_message', 'raw_user_text'].includes(
      key.toLowerCase(),
    )) {
      throw new Error('AI_CORE_RESTRICTED_FORENSIC_FORBIDDEN_KEY');
    }
    validateRestrictedValue(nested, depth + 1);
  }
}

function safeRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeForensicCode(value: unknown) {
  return typeof value === 'string'
    && /^[a-z][a-z0-9_]{0,100}$/.test(value)
    ? value
    : null;
}

function safeBlockingPredicate(value: unknown) {
  return typeof value === 'string'
    && /^[A-Z][A-Z0-9_]{0,127}$/.test(value)
    ? value
    : 'AI_CORE_ADAPTER_REJECTED';
}

function safeReasonCodes(value: unknown) {
  try {
    return normalizeRepairReasonCodes(value);
  } catch {
    return Object.freeze([] as string[]);
  }
}

function safeFactValueKind(value: unknown) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (value && typeof value === 'object') return 'object';
  return 'unknown';
}

function safeCoverage(value: unknown) {
  const coverage = safeRecord(value);
  return Object.freeze({
    status: safeForensicCode(coverage?.status),
    reasonCodes: safeReasonCodes(coverage?.reason_codes ?? []),
  });
}

function buildPublicBlockedSafeForensic(
  value: unknown,
  request: OwnerCanaryCoreRequest | undefined,
  telemetry: OwnerCanaryPreGateTelemetry,
  siteBlockingPredicate: string,
): PublicBlockedSafeForensicEvidence {
  if (!request || !/^[a-f0-9]{40}$/.test(request.site_release)) {
    throw new Error('AI_CORE_PUBLIC_SAFE_FORENSIC_SITE_SHA_INVALID');
  }
  const evidence = safeRecord(value);
  const resolved = safeRecord(evidence?.resolved);
  const facts = Array.isArray(resolved?.current_turn_facts_summary)
    ? resolved.current_turn_facts_summary.flatMap((item) => {
      const fact = safeRecord(item);
      const field = safeForensicCode(fact?.field);
      return field ? [{
        field,
        value_kind: safeFactValueKind(fact?.value_summary),
      }] : [];
    }).slice(0, 100)
    : [];
  const projection = safeRecord(evidence?.projection);
  const projectionSha = typeof projection?.sha === 'string'
    && /^[a-f0-9]{64}$/.test(projection.sha)
    ? projection.sha
    : null;
  const semanticCoverage = safeRecord(evidence?.semantic_coverage);
  const rawCoverage = safeCoverage(semanticCoverage?.raw);
  const finalCoverage = safeCoverage(semanticCoverage?.final);
  const evaluation = safeRecord(evidence?.evaluation);
  const rawEvaluation = safeRecord(evaluation?.raw);
  const finalEvaluation = safeRecord(evaluation?.final);
  const repair = safeRecord(evidence?.repair);
  const mutation = safeRecord(evidence?.mutation);
  const mutationSummary = Array.isArray(mutation?.summary)
    ? mutation.summary.flatMap((item) => {
      const summary = safeRecord(item);
      const target = safeForensicCode(summary?.target);
      const operation = safeForensicCode(summary?.operation);
      const field = safeForensicCode(summary?.field);
      const valueKind = safeForensicCode(summary?.value_kind);
      const before = summary?.expected_state_version;
      const after = summary?.proposed_state_version;
      return target && operation && field && valueKind
        && Number.isSafeInteger(before) && Number(before) >= 0
        && Number.isSafeInteger(after) && Number(after) >= 0
        ? [{
          target,
          operation,
          field,
          value_kind: valueKind,
          expected_state_version: Number(before),
          proposed_state_version: Number(after),
        }]
        : [];
    }).slice(0, 100)
    : [];
  const publication = safeRecord(evidence?.publication);
  const runtimePublicationStatus = safeForensicCode(
    publication?.candidate_status,
  ) ?? telemetry.publicationCandidateStatus;
  const executorRequestCount = telemetry.executorRequestCount;
  return Object.freeze({
    schema_version: PUBLIC_BLOCKED_SAFE_FORENSIC_VERSION,
    ai_core_request_id: telemetry.aiCoreRequestId,
    route: 'public_ai_core',
    site_sha: request.site_release,
    runtime_sha: telemetry.runtimeSha,
    runtime_version: AI_CORE_RUNTIME_VERSION,
    contract_sha: telemetry.contractSha,
    canonicalization_version: telemetry.canonicalizationVersion,
    resolved_intent: safeForensicCode(resolved?.intent),
    resolved_action: safeForensicCode(resolved?.action),
    extracted_facts: Object.freeze(facts),
    decision_package_sha: telemetry.decisionPackageSha,
    projection_sha: projectionSha,
    semantic_coverage: Object.freeze({
      raw_status: rawCoverage.status,
      raw_reason_codes: rawCoverage.reasonCodes,
      final_status: finalCoverage.status,
      final_reason_codes: finalCoverage.reasonCodes,
    }),
    executor: telemetry.finalExecutor,
    executor_request_count: executorRequestCount,
    retries: Math.max(0, executorRequestCount - 1),
    fallbacks: telemetry.plannedExecutor === telemetry.finalExecutor ? 0 : 1,
    raw_evaluation_status: telemetry.rawEvaluationStatus,
    raw_evaluation_reason_codes: safeReasonCodes(
      rawEvaluation?.reason_codes ?? [],
    ),
    repair_applied: telemetry.repairApplied,
    repair_reason_codes: safeReasonCodes(repair?.reason_codes ?? []),
    final_evaluation_status: telemetry.finalEvaluationStatus,
    final_evaluation_reason_codes: safeReasonCodes(
      finalEvaluation?.reason_codes ?? telemetry.evaluationReasonCodes,
    ),
    runtime_publication_status: runtimePublicationStatus,
    site_blocking_predicate: safeBlockingPredicate(siteBlockingPredicate),
    proposed_mutation: Object.freeze({
      proposed: telemetry.stateMutationProposed,
      summary: Object.freeze(mutationSummary),
    }),
    durable_commit_count: 0,
    duplicate_execution_count: Math.max(0, executorRequestCount - 1),
    duplicate_mutation_count: 0,
    latency_stages: telemetry.latencyStages,
  });
}

function validateRestrictedForensic(
  value: unknown,
  request: OwnerCanaryCoreRequest | undefined,
  telemetry: OwnerCanaryPreGateTelemetry,
) {
  const evidence = record(
    value,
    'AI_CORE_RESTRICTED_FORENSIC_EVIDENCE_MISSING',
  );
  exactKeys(evidence, [
    'schema_version', 'ai_core_request_id', 'evidence_sha256', 'runtime',
    'resolved', 'controller', 'lab', 'projection', 'semantic_coverage',
    'executor', 'repair', 'evaluation', 'mutation', 'publication',
  ], 'AI_CORE_RESTRICTED_FORENSIC_SCHEMA_INVALID');
  if (evidence.schema_version !== OWNER_CANARY_BLOCKED_FORENSIC_VERSION) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_VERSION_UNSUPPORTED');
  }
  if (evidence.ai_core_request_id !== telemetry.aiCoreRequestId
    || (request && evidence.ai_core_request_id !== request.request_id)) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_CORRELATION_MISMATCH');
  }
  const runtime = record(
    evidence.runtime,
    'AI_CORE_RESTRICTED_FORENSIC_RUNTIME_INVALID',
  );
  exactKeys(runtime, [
    'sha', 'version', 'contract_sha', 'canonicalization_version',
  ], 'AI_CORE_RESTRICTED_FORENSIC_RUNTIME_INVALID');
  if (runtime.sha !== AI_CORE_RUNTIME_SHA
    || runtime.version !== AI_CORE_RUNTIME_VERSION
    || runtime.contract_sha !== AI_CORE_CONTRACT_SHA
    || runtime.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_RELEASE_MISMATCH');
  }
  const resolved = record(
    evidence.resolved,
    'AI_CORE_RESTRICTED_FORENSIC_RESOLUTION_INVALID',
  );
  exactKeys(resolved, [
    'intent', 'action', 'current_turn_facts_summary',
  ], 'AI_CORE_RESTRICTED_FORENSIC_RESOLUTION_INVALID');
  forensicCode(
    resolved.intent,
    'AI_CORE_RESTRICTED_FORENSIC_RESOLUTION_INVALID',
  );
  forensicCode(
    resolved.action,
    'AI_CORE_RESTRICTED_FORENSIC_RESOLUTION_INVALID',
  );
  if (!Array.isArray(resolved.current_turn_facts_summary)
    || resolved.current_turn_facts_summary.length > 100) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_FACTS_INVALID');
  }
  resolved.current_turn_facts_summary.forEach((item) => {
    const fact = record(item, 'AI_CORE_RESTRICTED_FORENSIC_FACTS_INVALID');
    exactKeys(fact, [
      'field', 'value_summary', 'source',
    ], 'AI_CORE_RESTRICTED_FORENSIC_FACTS_INVALID');
    forensicCode(fact.field, 'AI_CORE_RESTRICTED_FORENSIC_FACTS_INVALID');
    if (fact.source !== 'current_turn_extraction') {
      throw new Error('AI_CORE_RESTRICTED_FORENSIC_FACTS_INVALID');
    }
  });
  const controller = record(
    evidence.controller,
    'AI_CORE_RESTRICTED_FORENSIC_CONTROLLER_INVALID',
  );
  exactKeys(controller, [
    'action', 'answer_required', 'question_required',
  ], 'AI_CORE_RESTRICTED_FORENSIC_CONTROLLER_INVALID');
  forensicCode(
    controller.action,
    'AI_CORE_RESTRICTED_FORENSIC_CONTROLLER_INVALID',
  );
  if (typeof controller.answer_required !== 'boolean'
    || typeof controller.question_required !== 'boolean') {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_CONTROLLER_INVALID');
  }
  const lab = record(evidence.lab, 'AI_CORE_RESTRICTED_FORENSIC_LAB_INVALID');
  exactKeys(lab, [
    'decision_package_summary', 'decision_package_sha',
  ], 'AI_CORE_RESTRICTED_FORENSIC_LAB_INVALID');
  record(
    lab.decision_package_summary,
    'AI_CORE_RESTRICTED_FORENSIC_LAB_INVALID',
  );
  if (lab.decision_package_sha !== telemetry.decisionPackageSha) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_DECISION_HASH_MISMATCH');
  }
  const projection = record(
    evidence.projection,
    'AI_CORE_RESTRICTED_FORENSIC_PROJECTION_INVALID',
  );
  exactKeys(projection, ['sha'], 'AI_CORE_RESTRICTED_FORENSIC_PROJECTION_INVALID');
  if (typeof projection.sha !== 'string'
    || !/^[a-f0-9]{64}$/.test(projection.sha)) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_PROJECTION_INVALID');
  }
  const semanticCoverage = record(
    evidence.semantic_coverage,
    'AI_CORE_RESTRICTED_FORENSIC_COVERAGE_INVALID',
  );
  exactKeys(semanticCoverage, [
    'raw', 'final',
  ], 'AI_CORE_RESTRICTED_FORENSIC_COVERAGE_INVALID');
  record(
    semanticCoverage.raw,
    'AI_CORE_RESTRICTED_FORENSIC_COVERAGE_INVALID',
  );
  record(
    semanticCoverage.final,
    'AI_CORE_RESTRICTED_FORENSIC_COVERAGE_INVALID',
  );
  const executor = record(
    evidence.executor,
    'AI_CORE_RESTRICTED_FORENSIC_EXECUTOR_INVALID',
  );
  exactKeys(executor, [
    'name', 'raw_answer', 'request_count',
  ], 'AI_CORE_RESTRICTED_FORENSIC_EXECUTOR_INVALID');
  if (executor.name !== 'qwen'
    || executor.request_count !== 1
    || typeof executor.raw_answer !== 'string'
    || !executor.raw_answer.trim()) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_EXECUTOR_INVALID');
  }
  const repair = record(
    evidence.repair,
    'AI_CORE_RESTRICTED_FORENSIC_REPAIR_INVALID',
  );
  exactKeys(repair, [
    'applied', 'method', 'repaired_answer', 'reason_codes',
  ], 'AI_CORE_RESTRICTED_FORENSIC_REPAIR_INVALID');
  if (typeof repair.applied !== 'boolean'
    || !['none', 'deterministic'].includes(String(repair.method))
    || typeof repair.repaired_answer !== 'string'
    || !repair.repaired_answer.trim()) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_REPAIR_INVALID');
  }
  if ((repair.applied && repair.method !== 'deterministic')
    || (!repair.applied && repair.method !== 'none')
    || repair.applied !== telemetry.repairApplied) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_REPAIR_MISMATCH');
  }
  const repairReasons = normalizeRepairReasonCodes(
    repair.reason_codes,
    'AI_CORE_RESTRICTED_FORENSIC_REPAIR_INVALID',
  );
  const telemetryRepairReasons = normalizeRepairReasonCodes(
    telemetry.repairReasonCodes,
    'AI_CORE_RESTRICTED_FORENSIC_REPAIR_INVALID',
  );
  if (canonicalJson(repairReasons) !== canonicalJson(telemetryRepairReasons)) {
    throw new Error(
      'AI_CORE_RESTRICTED_FORENSIC_REPAIR_REASON_MISMATCH',
    );
  }
  const evaluationForensic = record(
    evidence.evaluation,
    'AI_CORE_RESTRICTED_FORENSIC_EVALUATION_INVALID',
  );
  exactKeys(evaluationForensic, [
    'raw', 'final',
  ], 'AI_CORE_RESTRICTED_FORENSIC_EVALUATION_INVALID');
  const rawEvaluation = record(
    evaluationForensic.raw,
    'AI_CORE_RESTRICTED_FORENSIC_EVALUATION_INVALID',
  );
  const finalEvaluation = record(
    evaluationForensic.final,
    'AI_CORE_RESTRICTED_FORENSIC_EVALUATION_INVALID',
  );
  for (const item of [rawEvaluation, finalEvaluation]) {
    exactKeys(item, [
      'status', 'reason_codes',
    ], 'AI_CORE_RESTRICTED_FORENSIC_EVALUATION_INVALID');
    telemetryEnum(
      item.status,
      ['pass', 'review_required', 'fail', 'not_evaluable'],
      'AI_CORE_RESTRICTED_FORENSIC_EVALUATION_INVALID',
    );
    telemetryReasonCodes(
      item.reason_codes,
      'AI_CORE_RESTRICTED_FORENSIC_EVALUATION_INVALID',
    );
  }
  if (rawEvaluation.status !== telemetry.rawEvaluationStatus
    || finalEvaluation.status !== telemetry.finalEvaluationStatus
    || canonicalJson(finalEvaluation.reason_codes)
      !== canonicalJson(telemetry.evaluationReasonCodes)) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_EVALUATION_MISMATCH');
  }
  const mutation = record(
    evidence.mutation,
    'AI_CORE_RESTRICTED_FORENSIC_MUTATION_INVALID',
  );
  exactKeys(mutation, [
    'proposed', 'summary',
  ], 'AI_CORE_RESTRICTED_FORENSIC_MUTATION_INVALID');
  if (typeof mutation.proposed !== 'boolean'
    || mutation.proposed !== telemetry.stateMutationProposed
    || !Array.isArray(mutation.summary)
    || mutation.summary.length > 100
    || mutation.proposed !== (mutation.summary.length > 0)) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_MUTATION_INVALID');
  }
  mutation.summary.forEach((item) => {
    const summary = record(
      item,
      'AI_CORE_RESTRICTED_FORENSIC_MUTATION_INVALID',
    );
    exactKeys(summary, [
      'mutation_id', 'target', 'operation', 'field', 'value_kind',
      'expected_state_version', 'proposed_state_version',
    ], 'AI_CORE_RESTRICTED_FORENSIC_MUTATION_INVALID');
    for (const field of ['target', 'operation', 'field', 'value_kind']) {
      forensicCode(
        summary[field],
        'AI_CORE_RESTRICTED_FORENSIC_MUTATION_INVALID',
      );
    }
    if (typeof summary.mutation_id !== 'string'
      || !summary.mutation_id
      || summary.mutation_id.length > 160
      || !Number.isSafeInteger(summary.expected_state_version)
      || Number(summary.expected_state_version) < 0
      || !Number.isSafeInteger(summary.proposed_state_version)
      || Number(summary.proposed_state_version) < 0) {
      throw new Error('AI_CORE_RESTRICTED_FORENSIC_MUTATION_INVALID');
    }
  });
  const publicationForensic = record(
    evidence.publication,
    'AI_CORE_RESTRICTED_FORENSIC_PUBLICATION_INVALID',
  );
  exactKeys(publicationForensic, [
    'candidate_status', 'blocking_predicate',
  ], 'AI_CORE_RESTRICTED_FORENSIC_PUBLICATION_INVALID');
  if (!['blocked', 'owner_review'].includes(
    String(publicationForensic.candidate_status),
  ) || ![
    'final_evaluation_status_must_equal_pass',
    'publication_candidate_status_must_equal_allowed',
  ].includes(String(publicationForensic.blocking_predicate))
    || publicationForensic.candidate_status
      !== telemetry.publicationCandidateStatus) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_PUBLICATION_INVALID');
  }
  validateRestrictedValue(evidence);
  const evidenceSha = telemetryString(
    evidence.evidence_sha256,
    'AI_CORE_RESTRICTED_FORENSIC_HASH_INVALID',
  );
  const withoutHash = { ...evidence };
  delete withoutHash.evidence_sha256;
  if (!/^[a-f0-9]{64}$/.test(evidenceSha)
    || sha256(withoutHash) !== evidenceSha) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_HASH_INVALID');
  }
  return Object.freeze({
    ...evidence,
    runtime: Object.freeze({ ...runtime }),
    lab: Object.freeze({ ...lab }),
    projection: Object.freeze({ ...projection }),
    executor: Object.freeze({ ...executor }),
    repair: Object.freeze({ ...repair }),
    publication: Object.freeze({ ...publicationForensic }),
  }) as OwnerCanaryRestrictedForensicEvidence;
}

export function validateDecisionPackageHash(value: unknown) {
  const response = record(value, 'INVALID_AI_CORE_RESPONSE_BODY');
  if (response.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_CANONICALIZATION_VERSION_UNSUPPORTED');
  }
  const decisionPackage = record(
    response.decision_package,
    'INVALID_DECISION_PACKAGE',
  );
  if (response.decision_package_hash !== sha256(decisionPackage)) {
    throw new Error('DECISION_PACKAGE_HASH_MISMATCH');
  }
  return decisionPackage;
}

export function validateOwnerCanaryCoreResponse(
  value: unknown,
  request?: OwnerCanaryCoreRequest,
  options: { forensicScope?: 'owner' | 'public' } = {},
): OwnerCanaryRuntimeEnvelope {
  const envelope = record(value, 'INVALID_AI_CORE_RESPONSE');
  if (envelope.runtime_sha !== AI_CORE_RUNTIME_SHA) {
    throw new Error('AI_CORE_RUNTIME_SHA_MISMATCH');
  }
  if (envelope.runtime_version !== AI_CORE_RUNTIME_VERSION) {
    throw new Error('AI_CORE_RUNTIME_VERSION_MISMATCH');
  }
  if (envelope.contract_sha !== AI_CORE_CONTRACT_SHA) {
    throw new Error('AI_CORE_CONTRACT_SHA_MISMATCH');
  }
  if (envelope.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_CANONICALIZATION_VERSION_UNSUPPORTED');
  }
  if (envelope.model !== AI_CORE_OWNER_MODEL) {
    throw new Error('AI_CORE_MODEL_MISMATCH');
  }
  const observabilityTrace = validateObservabilityTrace(
    envelope.observability_trace,
  );
  const response = record(envelope.response, 'INVALID_AI_CORE_RESPONSE_BODY');
  if (response.contract_version !== AI_CORE_CONTRACT_VERSION
    || response.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_CONTRACT_RESPONSE_REJECTED');
  }
  if (response.success === false) {
    exactKeys(response, [
      'contract_version', 'canonicalization_version', 'success',
      'request_id', 'error', 'trace_id',
    ], 'AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID');
    const runtimeError = record(
      response.error,
      'AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID',
    );
    exactKeys(runtimeError, [
      'code', 'category', 'retryable', 'safe_message_code', 'stage',
    ], 'AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID');
    const code = telemetryEnum(runtimeError.code, [
      'VALIDATION_ERROR', 'POLICY_REJECTED', 'EXECUTOR_TIMEOUT',
      'EXECUTOR_UNAVAILABLE', 'IDEMPOTENCY_CONFLICT',
      'UNKNOWN_COMPONENT_VERSION', 'INVALID_STATE_MUTATION',
      'DECISION_PACKAGE_IMMUTABLE', 'FALLBACK_LIMIT_EXCEEDED',
      'INTERNAL_ERROR', 'REVIEW_REQUIRED', 'NOT_EVALUABLE',
    ], 'AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID');
    const category = telemetryEnum(runtimeError.category, [
      'validation', 'policy', 'executor', 'idempotency', 'state',
      'internal', 'evaluation',
    ], 'AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID');
    const stage = telemetryEnum(runtimeError.stage, [
      'transport', 'validation', 'context', 'controller', 'decision',
      'executor', 'repair', 'evaluation', 'mutation',
    ], 'AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID');
    const safeMessageCode = telemetryString(
      runtimeError.safe_message_code,
      'AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID',
    );
    if (typeof runtimeError.retryable !== 'boolean'
      || !/^[A-Z][A-Z0-9_]{2,80}$/.test(safeMessageCode)
      || (request && response.request_id !== request.request_id)) {
      throw new Error('AI_CORE_RUNTIME_SAFE_ERROR_SCHEMA_INVALID');
    }
    throw new AiCoreRuntimeSafeError(Object.freeze({
      code,
      category,
      retryable: runtimeError.retryable,
      safeMessageCode,
      stage,
    }), observabilityTrace);
  }
  if (response.success !== true) {
    throw new Error('AI_CORE_CONTRACT_RESPONSE_REJECTED');
  }
  if (request) {
    if (response.request_id !== request.request_id
      || response.idempotency_key !== request.idempotency_key
      || response.request_payload_hash !== request.request_payload_hash) {
      throw new Error('AI_CORE_RESPONSE_CORRELATION_MISMATCH');
    }
    if (response.state_version_before !== request.payload.state_version) {
      throw new Error('AI_CORE_STATE_VERSION_MISMATCH');
    }
  }
  validateDecisionPackageHash(response);
  const executorTrace = record(response.executor_trace, 'INVALID_EXECUTOR_TRACE');
  const telemetry = record(response.telemetry, 'INVALID_AI_CORE_TELEMETRY');
  if (telemetry.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_TELEMETRY_CANONICALIZATION_MISMATCH');
  }
  const evaluation = record(
    response.evaluation_result,
    'INVALID_AI_CORE_EVALUATION',
  );
  const publication = record(
    telemetry.publication,
    'INVALID_AI_CORE_PUBLICATION',
  );
  const executionProvenance = validateAiCoreExecutionProvenanceV1_2({
    contractSha: envelope.contract_sha,
    contractVersion: response.contract_version,
    decisionPackageHash: response.decision_package_hash,
    stateVersionBefore: response.state_version_before,
    executorTrace,
    executorTelemetry: telemetry.executor,
    evaluationResult: evaluation,
    publicationTelemetry: publication,
  });
  if (request && executionProvenance.executionMode === 'model') {
    const policy = record(
      request.payload.executor_policy,
      'AI_CORE_EXECUTOR_POLICY_VIOLATION',
    );
    const allowed = Array.isArray(policy.allowed_executors)
      ? policy.allowed_executors : [];
    if (!executionProvenance.plannedExecutor
      || !executionProvenance.finalExecutor
      || !allowed.includes(executionProvenance.plannedExecutor)
      || !allowed.includes(executionProvenance.finalExecutor)) {
      throw new Error('AI_CORE_EXECUTOR_POLICY_VIOLATION');
    }
  }
  const attempts = executorTrace.attempts as unknown[];
  const repair = record(response.repair_result, 'INVALID_AI_CORE_REPAIR');
  exactKeys(repair, [
    'applied', 'method', 'reason_codes', 'rewrite_ratio',
    'decision_package_hash',
  ], 'INVALID_AI_CORE_REPAIR');
  if (!Array.isArray(response.state_mutations)) {
    throw new Error('INVALID_AI_CORE_MUTATIONS');
  }
  const mutations = response.state_mutations.map((item) =>
    record(item, 'INVALID_AI_CORE_MUTATION'));
  const stateBefore = Number(response.state_version_before);
  const expectedAfter = stateBefore + (mutations.length > 0 ? 1 : 0);
  if (response.state_version_after !== expectedAfter
    || mutations.some((item) =>
      item.target !== 'thread_state'
      || String(item.field).startsWith('decision_package')
      || item.expected_state_version !== stateBefore
      || item.proposed_state_version !== expectedAfter
      || (request && item.source_message_id !== request.payload.message_id))) {
    throw new Error('AI_CORE_MUTATION_VERSION_OR_AUTHORITY_VIOLATION');
  }
  const decisionPackageSha = telemetryString(
    response.decision_package_hash,
    'INVALID_DECISION_PACKAGE_HASH',
  );
  const projectionSourceSha = telemetryString(
    executorTrace.decision_package_hash,
    'INVALID_PROJECTION_SOURCE_HASH',
  );
  if (!/^[a-f0-9]{64}$/.test(decisionPackageSha)
    || projectionSourceSha !== decisionPackageSha
    || repair.decision_package_hash !== decisionPackageSha) {
    throw new Error('AI_CORE_PROJECTION_HASH_PROPAGATION_MISMATCH');
  }
  const evaluationTelemetry = record(
    telemetry.evaluation,
    'INVALID_AI_CORE_EVALUATION_TELEMETRY',
  );
  const repairTelemetry = record(
    telemetry.repair,
    'INVALID_AI_CORE_REPAIR_TELEMETRY',
  );
  exactKeys(repairTelemetry, [
    'applied', 'method', 'reason_codes', 'rewrite_ratio',
  ], 'INVALID_AI_CORE_REPAIR_TELEMETRY');
  if (typeof repair.applied !== 'boolean'
    || typeof repairTelemetry.applied !== 'boolean'
    || typeof repair.rewrite_ratio !== 'number'
    || !Number.isFinite(repair.rewrite_ratio)
    || repair.rewrite_ratio < 0
    || repair.rewrite_ratio > 1
    || typeof repairTelemetry.rewrite_ratio !== 'number'
    || !Number.isFinite(repairTelemetry.rewrite_ratio)
    || repairTelemetry.rewrite_ratio < 0
    || repairTelemetry.rewrite_ratio > 1) {
    throw new Error('INVALID_AI_CORE_REPAIR_TELEMETRY');
  }
  const repairResultMethod = telemetryEnum(
    repair.method,
    ['none', 'deterministic'],
    'INVALID_AI_CORE_REPAIR_TELEMETRY',
  );
  const repairTelemetryMethod = telemetryEnum(
    repairTelemetry.method,
    ['none', 'deterministic'],
    'INVALID_AI_CORE_REPAIR_TELEMETRY',
  );
  const repairResultReasonCodes = normalizeRepairReasonCodes(
    repair.reason_codes,
    'INVALID_AI_CORE_REPAIR_RESULT_REASON_CODES',
  );
  const repairTelemetryReasonCodes = normalizeRepairReasonCodes(
    repairTelemetry.reason_codes,
    'INVALID_AI_CORE_REPAIR_TELEMETRY_REASON_CODES',
  );
  if (repair.applied !== repairTelemetry.applied
    || repairResultMethod !== repairTelemetryMethod
    || repair.rewrite_ratio !== repairTelemetry.rewrite_ratio) {
    throw new Error('AI_CORE_REPAIR_RESULT_TELEMETRY_MISMATCH');
  }
  if (canonicalJson(repairResultReasonCodes)
    !== canonicalJson(repairTelemetryReasonCodes)) {
    throw new Error('AI_CORE_REPAIR_RESULT_TELEMETRY_REASON_MISMATCH');
  }
  const preGateTelemetry = Object.freeze({
    aiCoreRequestId: telemetryString(
      response.request_id,
      'INVALID_AI_CORE_REQUEST_ID',
    ),
    runtimeSha: AI_CORE_RUNTIME_SHA,
    contractSha: AI_CORE_CONTRACT_SHA,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    decisionPackageSha,
    projectionSourceSha,
    plannedExecutor: executionProvenance.plannedExecutor ?? 'none',
    finalExecutor: executionProvenance.finalExecutor ?? 'none',
    executorRequestCount: executionProvenance.modelRequestCount,
    executionMode: executionProvenance.executionMode,
    deterministicHandler: executionProvenance.deterministicHandler,
    rawEvaluationStatus: telemetryEnum(
      evaluationTelemetry.raw_status,
      ['pass', 'review_required', 'fail', 'not_evaluable'],
      'INVALID_AI_CORE_EVALUATION_TELEMETRY',
    ),
    finalEvaluationStatus: telemetryEnum(
      evaluationTelemetry.final_status,
      ['pass', 'review_required', 'fail', 'not_evaluable'],
      'INVALID_AI_CORE_EVALUATION_TELEMETRY',
    ),
    evaluationReasonCodes: telemetryReasonCodes(
      evaluation.reason_codes,
      'INVALID_AI_CORE_EVALUATION_REASON_CODES',
    ),
    repairApplied: repair.applied,
    repairStatus: repairResultMethod,
    repairReasonCodes: repairResultReasonCodes,
    publicationCandidateStatus: telemetryEnum(
      publication.candidate_status,
      ['allowed', 'owner_review', 'blocked'],
      'INVALID_AI_CORE_PUBLICATION',
    ),
    stateMutationProposed: mutations.length > 0,
    latencyStages: telemetryLatencyStages(telemetry.latency),
  } satisfies OwnerCanaryPreGateTelemetry);
  const validatedMutationBatch = Object.freeze({
    responseId: telemetryString(
      response.response_id,
      'INVALID_AI_CORE_RESPONSE_ID',
    ),
    mutations: Object.freeze(mutations.map((mutation) =>
      Object.freeze({ ...mutation }))),
  } satisfies AiCoreValidatedBlockedMutationBatch);
  if (evaluation.status !== 'pass'
    || publication.candidate_status !== 'allowed'
    || publication.published !== false) {
    if (options.forensicScope === 'public') {
      throw new AiCoreAdapterBlockedError(
        'AI_CORE_FINAL_GATE_BLOCKED',
        preGateTelemetry,
        buildPublicBlockedSafeForensic(
          envelope.restricted_forensic,
          request,
          preGateTelemetry,
          'AI_CORE_FINAL_GATE_BLOCKED',
        ),
        null,
        observabilityTrace,
        validatedMutationBatch,
      );
    }
    let restrictedForensic: OwnerCanaryRestrictedForensicEvidence;
    try {
      restrictedForensic = validateRestrictedForensic(
        envelope.restricted_forensic,
        request,
        preGateTelemetry,
      );
    } catch (cause) {
      const code = cause instanceof Error
        ? cause.message
        : 'AI_CORE_RESTRICTED_FORENSIC_VALIDATION_FAILED';
      throw new AiCoreAdapterBlockedError(
        code,
        preGateTelemetry,
        buildPublicBlockedSafeForensic(
          envelope.restricted_forensic,
          request,
          preGateTelemetry,
          code,
        ),
        cause,
        observabilityTrace,
        validatedMutationBatch,
      );
    }
    throw new AiCoreFinalGateBlockedError(
      preGateTelemetry,
      restrictedForensic,
      buildPublicBlockedSafeForensic(
        restrictedForensic,
        request,
        preGateTelemetry,
        'AI_CORE_FINAL_GATE_BLOCKED',
      ),
      observabilityTrace,
      validatedMutationBatch,
    );
  }
  if (envelope.restricted_forensic !== undefined
    && envelope.restricted_forensic !== null) {
    throw new Error('AI_CORE_RESTRICTED_FORENSIC_UNEXPECTED_FOR_ALLOWED');
  }
  if (typeof response.answer !== 'string' || !response.answer.trim()) {
    throw new Error('AI_CORE_EMPTY_ANSWER');
  }
  return Object.freeze({
    runtime_sha: AI_CORE_RUNTIME_SHA,
    runtime_version: AI_CORE_RUNTIME_VERSION,
    contract_sha: AI_CORE_CONTRACT_SHA,
    canonicalization_version: CANONICALIZATION_VERSION,
    model: AI_CORE_OWNER_MODEL,
    response: Object.freeze({ ...response }),
    preGateTelemetry,
    restrictedForensic: null,
    observabilityTrace,
  });
}

export function assertPublicAiCorePublicationAllowed(input: {
  envelope: OwnerCanaryRuntimeEnvelope;
  request: OwnerCanaryCoreRequest;
  conversationThreadId: string;
  messageId: string;
  turnId: string;
}) {
  const response = input.envelope.response;
  const telemetry = record(response.telemetry, 'INVALID_AI_CORE_TELEMETRY');
  const publication = record(
    telemetry.publication,
    'INVALID_AI_CORE_PUBLICATION',
  );
  const evaluation = record(
    response.evaluation_result,
    'INVALID_AI_CORE_EVALUATION',
  );
  if (input.request.payload.conversation_thread_id
      !== input.conversationThreadId
    || input.request.payload.message_id !== input.messageId
    || !input.turnId.trim()
    || response.request_id !== input.request.request_id
    || response.idempotency_key !== input.request.idempotency_key
    || response.request_payload_hash !== input.request.request_payload_hash
    || input.envelope.runtime_sha !== AI_CORE_RUNTIME_SHA
    || input.envelope.contract_sha !== AI_CORE_CONTRACT_SHA
    || evaluation.status !== 'pass'
    || publication.candidate_status !== 'allowed'
    || publication.published !== false
    || typeof response.answer !== 'string'
    || !response.answer.trim()) {
    throw new Error('AI_CORE_PUBLICATION_PROVENANCE_REJECTED');
  }
  return Object.freeze({
    source: 'current_runtime_response' as const,
    ai_core_request_id: input.request.request_id,
    turn_id: input.turnId,
    conversation_thread_id: input.conversationThreadId,
    message_id: input.messageId,
    idempotency_key: input.request.idempotency_key,
    request_payload_hash: input.request.request_payload_hash,
    runtime_sha: AI_CORE_RUNTIME_SHA,
    contract_sha: AI_CORE_CONTRACT_SHA,
    candidate_status: 'allowed' as const,
  });
}

function requiredTransportSecret(
  value: string | undefined,
  codePrefix: 'AI_CORE_OWNER_CANARY' | 'AI_CORE_PUBLIC',
) {
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${codePrefix}_SECRET_INVALID`);
  }
  return value;
}

function runtimeConfig(input: {
  rawUrl: string | undefined;
  secret: string | undefined;
  runtimeSha: string | undefined;
  contractSha: string | undefined;
  codePrefix: 'AI_CORE_OWNER_CANARY' | 'AI_CORE_PUBLIC';
}) {
  const rawUrl = input.rawUrl?.trim();
  if (!rawUrl) throw new Error(`${input.codePrefix}_URL_MISSING`);
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password
    || url.search || url.hash) {
    throw new Error(`${input.codePrefix}_URL_UNSAFE`);
  }
  if (input.runtimeSha !== AI_CORE_RUNTIME_SHA) {
    throw new Error(`${input.codePrefix}_RUNTIME_PIN_MISMATCH`);
  }
  if (input.contractSha !== AI_CORE_CONTRACT_SHA) {
    throw new Error(`${input.codePrefix}_CONTRACT_PIN_MISMATCH`);
  }
  return Object.freeze({
    url: url.toString().replace(/\/$/, ''),
    secret: requiredTransportSecret(input.secret, input.codePrefix),
    runtimeSha: AI_CORE_RUNTIME_SHA,
    contractSha: AI_CORE_CONTRACT_SHA,
  });
}

export function ownerCanaryRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
) {
  return runtimeConfig({
    rawUrl: env.AI_CORE_OWNER_CANARY_URL,
    secret: env.AI_CORE_OWNER_CANARY_SECRET,
    runtimeSha: env.AI_CORE_OWNER_CANARY_RUNTIME_SHA,
    contractSha: env.AI_CORE_OWNER_CANARY_CONTRACT_SHA,
    codePrefix: 'AI_CORE_OWNER_CANARY',
  });
}

export function publicAiCoreRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
) {
  return runtimeConfig({
    rawUrl: env.AI_CORE_PUBLIC_URL,
    secret: env.AI_CORE_PUBLIC_SECRET,
    runtimeSha: env.AI_CORE_PUBLIC_RUNTIME_SHA,
    contractSha: env.AI_CORE_PUBLIC_CONTRACT_SHA,
    codePrefix: 'AI_CORE_PUBLIC',
  });
}

async function readTransportJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('AI_CORE_OWNER_CANARY_UPSTREAM_ERROR');
    Object.assign(error, { status: response.status, safeBody: body });
    throw error;
  }
  return body;
}

async function callRuntime(
  request: OwnerCanaryCoreRequest,
  input: {
    config: ReturnType<typeof ownerCanaryRuntimeConfig>;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    upstreamError: string;
    transportErrorPrefix: string;
    forensicScope: 'owner' | 'public';
  },
) {
  const endpoint = `${input.config.url}/v1/owner-ai-core`;
  const requestBody = JSON.stringify(request);
  const baseEvidence = {
    endpoint,
    request_id: request.request_id,
    request_body_sha256: sha256(requestBody),
    expected_site_sha: request.site_release,
    expected_runtime_sha: input.config.runtimeSha,
    expected_contract_sha: input.config.contractSha,
  };
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(
      endpoint,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.config.secret}`,
          'Content-Type': 'application/json',
          'X-AI-Core-Runtime-SHA': input.config.runtimeSha,
          'X-AI-Core-Contract-SHA': input.config.contractSha,
          'X-Request-Id': request.request_id,
        },
        body: requestBody,
        cache: 'no-store',
        signal: AbortSignal.timeout(input.timeoutMs ?? 95_000),
      },
    );
  } catch (cause) {
    const timeout = cause instanceof Error
      && (cause.name === 'TimeoutError' || cause.name === 'AbortError');
    const error = new Error(
      `${input.transportErrorPrefix}_TRANSPORT_${timeout ? 'TIMEOUT' : 'UNAVAILABLE'}`,
      { cause },
    );
    Object.assign(error, { transportEvidence: Object.freeze({
      ...baseEvidence,
      outcome: timeout ? 'transport_timeout' : 'transport_unavailable',
      http_status: null,
      error_class: error.message,
    } satisfies AiCoreTransportEvidence) });
    throw error;
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(input.upstreamError);
    Object.assign(error, {
      status: response.status,
      safeBody: body,
      transportEvidence: Object.freeze({
        ...baseEvidence,
        outcome: 'http_response_rejected',
        http_status: response.status,
        error_class: input.upstreamError,
      } satisfies AiCoreTransportEvidence),
    });
    throw error;
  }
  const acceptedEvidence = Object.freeze({
    ...baseEvidence,
    outcome: 'http_response_accepted',
    http_status: response.status,
    error_class: null,
  } satisfies AiCoreTransportEvidence);
  try {
    const envelope = validateOwnerCanaryCoreResponse(body, request, {
      forensicScope: input.forensicScope,
    });
    return Object.freeze({ ...envelope, transportEvidence: acceptedEvidence });
  } catch (error) {
    if (error && typeof error === 'object') {
      Object.assign(error, { transportEvidence: Object.freeze({
        ...acceptedEvidence,
        outcome: 'http_response_rejected',
        error_class: error instanceof Error ? error.message : 'UNKNOWN',
      } satisfies AiCoreTransportEvidence) });
    }
    throw error;
  }
}

export async function callOwnerCanaryRuntime(
  request: OwnerCanaryCoreRequest,
  input: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
) {
  return callRuntime(request, {
    config: ownerCanaryRuntimeConfig(input.env),
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
    upstreamError: 'AI_CORE_OWNER_CANARY_UPSTREAM_ERROR',
    transportErrorPrefix: 'AI_CORE_OWNER_CANARY',
    forensicScope: 'owner',
  });
}

export async function callPublicAiCoreRuntime(
  request: OwnerCanaryCoreRequest,
  input: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
) {
  return callRuntime(request, {
    config: publicAiCoreRuntimeConfig(input.env),
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
    upstreamError: 'AI_CORE_PUBLIC_UPSTREAM_ERROR',
    transportErrorPrefix: 'AI_CORE_PUBLIC',
    forensicScope: 'public',
  });
}

type MutationAcknowledgement = {
  contract_version: typeof AI_CORE_CONTRACT_VERSION;
  canonicalization_version: typeof CANONICALIZATION_VERSION;
  request_id: string;
  response_id: string;
  acknowledged_at: string;
  acknowledgements: unknown[];
};

export async function acknowledgeOwnerCanaryMutations(
  acknowledgement: MutationAcknowledgement,
  input: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
) {
  if (acknowledgement.contract_version !== AI_CORE_CONTRACT_VERSION
    || acknowledgement.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_MUTATION_ACK_CONTRACT_MISMATCH');
  }
  const config = ownerCanaryRuntimeConfig(input.env);
  const response = await (input.fetchImpl ?? fetch)(
    `${config.url}/v1/owner-ai-core/ack`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
        'X-AI-Core-Runtime-SHA': config.runtimeSha,
        'X-AI-Core-Contract-SHA': config.contractSha,
        'X-Request-Id': acknowledgement.request_id,
      },
      body: JSON.stringify(acknowledgement),
      cache: 'no-store',
      signal: AbortSignal.timeout(input.timeoutMs ?? 10_000),
    },
  );
  const body = await readTransportJson(response) as Record<string, unknown>;
  if (body.accepted !== true
    || body.runtime_sha !== AI_CORE_RUNTIME_SHA
    || body.contract_sha !== AI_CORE_CONTRACT_SHA
    || body.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_MUTATION_ACK_REJECTED');
  }
  return body;
}

export async function acknowledgePublicAiCoreMutations(
  acknowledgement: MutationAcknowledgement,
  input: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
) {
  if (acknowledgement.contract_version !== AI_CORE_CONTRACT_VERSION
    || acknowledgement.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_MUTATION_ACK_CONTRACT_MISMATCH');
  }
  const config = publicAiCoreRuntimeConfig(input.env);
  const response = await (input.fetchImpl ?? fetch)(
    `${config.url}/v1/owner-ai-core/ack`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
        'X-AI-Core-Runtime-SHA': config.runtimeSha,
        'X-AI-Core-Contract-SHA': config.contractSha,
        'X-Request-Id': acknowledgement.request_id,
      },
      body: JSON.stringify(acknowledgement),
      cache: 'no-store',
      signal: AbortSignal.timeout(input.timeoutMs ?? 10_000),
    },
  );
  const body = await readTransportJson(response) as Record<string, unknown>;
  if (body.accepted !== true
    || body.runtime_sha !== AI_CORE_RUNTIME_SHA
    || body.contract_sha !== AI_CORE_CONTRACT_SHA
    || body.canonicalization_version !== CANONICALIZATION_VERSION) {
    throw new Error('AI_CORE_MUTATION_ACK_REJECTED');
  }
  return body;
}
