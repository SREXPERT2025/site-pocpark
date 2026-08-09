import {
  CANONICALIZATION_VERSION,
  canonicalJson,
  sha256,
} from './canonical-json-hash-v1.ts';

export const AI_CORE_RUNTIME_SHA =
  'bdaaf16215b2066659c37ca6094e5e2f0a3c1bea';
export const AI_CORE_CONTRACT_SHA =
  '6cd71a5596346925ecdd2ffeb9d45262d881ee93';
export const AI_CORE_CONTRACT_VERSION = '1.1';
export const AI_CORE_RUNTIME_VERSION = '1.2.1';
export const AI_CORE_OWNER_MODEL = 'qwen3.6:27b';
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
    consent_safe_context_refs: [],
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

export class AiCoreFinalGateBlockedError extends Error {
  readonly preGateTelemetry: OwnerCanaryPreGateTelemetry;

  constructor(telemetry: OwnerCanaryPreGateTelemetry) {
    super('AI_CORE_FINAL_GATE_BLOCKED');
    this.name = 'AiCoreFinalGateBlockedError';
    this.preGateTelemetry = telemetry;
  }
}

export function preGateTelemetryFromError(error: unknown) {
  return error instanceof AiCoreFinalGateBlockedError
    ? error.preGateTelemetry
    : null;
}

function record(value: unknown, code: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
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
  const response = record(envelope.response, 'INVALID_AI_CORE_RESPONSE_BODY');
  if (response.contract_version !== AI_CORE_CONTRACT_VERSION
    || response.canonicalization_version !== CANONICALIZATION_VERSION
    || response.success !== true) {
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
  if (executorTrace.planned_executor !== 'qwen'
    || executorTrace.final_executor !== 'qwen'
    || executorTrace.fallback_reason !== 'none') {
    throw new Error('AI_CORE_EXECUTOR_POLICY_VIOLATION');
  }
  const attempts = executorTrace.attempts;
  if (!Array.isArray(attempts) || attempts.length !== 1
    || record(attempts[0], 'INVALID_EXECUTOR_ATTEMPT').executor !== 'qwen') {
    throw new Error('AI_CORE_EXECUTOR_ATTEMPTS_VIOLATION');
  }
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
  const repair = record(response.repair_result, 'INVALID_AI_CORE_REPAIR');
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
    plannedExecutor: telemetryString(
      executorTrace.planned_executor,
      'INVALID_EXECUTOR_TRACE',
    ),
    finalExecutor: telemetryString(
      executorTrace.final_executor,
      'INVALID_EXECUTOR_TRACE',
    ),
    executorRequestCount: attempts.length,
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
    repairApplied: repair.applied === true,
    repairStatus: telemetryEnum(
      repair.method ?? repairTelemetry.method,
      ['none', 'deterministic'],
      'INVALID_AI_CORE_REPAIR_TELEMETRY',
    ),
    repairReasonCodes: telemetryReasonCodes(
      repair.reason_codes ?? repairTelemetry.reason_codes ?? [],
      'INVALID_AI_CORE_REPAIR_REASON_CODES',
    ),
    publicationCandidateStatus: telemetryEnum(
      publication.candidate_status,
      ['allowed', 'owner_review', 'blocked'],
      'INVALID_AI_CORE_PUBLICATION',
    ),
    stateMutationProposed: mutations.length > 0,
    latencyStages: telemetryLatencyStages(telemetry.latency),
  } satisfies OwnerCanaryPreGateTelemetry);
  if (evaluation.status !== 'pass'
    || publication.candidate_status !== 'allowed'
    || publication.published !== false) {
    throw new AiCoreFinalGateBlockedError(preGateTelemetry);
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
  },
) {
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(
      `${input.config.url}/v1/owner-ai-core`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.config.secret}`,
          'Content-Type': 'application/json',
          'X-AI-Core-Runtime-SHA': input.config.runtimeSha,
          'X-AI-Core-Contract-SHA': input.config.contractSha,
          'X-Request-Id': request.request_id,
        },
        body: JSON.stringify(request),
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
    throw error;
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(input.upstreamError);
    Object.assign(error, { status: response.status, safeBody: body });
    throw error;
  }
  return validateOwnerCanaryCoreResponse(body, request);
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
