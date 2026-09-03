export const AGENT_PILOT_RUNTIME_SHA =
  '8bbd90a860893fb229466040f57b258a7c82b07e';
export const AGENT_PILOT_OWNER_MARKER = 'Agent Pilot Owner Canary';

const DEFAULT_TIMEOUT_MS = 180_000;
const MIN_SECRET_BYTES = 32;

export type AgentPilotOwnerResponse = {
  answer: string;
  runtimeSha: string;
  latencyMs: number;
  roleCalls: readonly Readonly<Record<string, unknown>>[];
  criticUsed: boolean;
  reconsiderationUsed: boolean;
  selectedEvidence: readonly Readonly<Record<string, unknown>>[];
  traceId: string;
  bridgeVersion: string;
  trace: Readonly<Record<string, unknown>>;
};

export class AgentPilotOwnerError extends Error {
  readonly reasonCode: string;
  readonly traceId: string | null;
  readonly runtimeSha: string | null;
  readonly bridgeVersion: string | null;
  readonly trace: Readonly<Record<string, unknown>> | null;

  constructor(
    reasonCode: string,
    message = reasonCode,
    evidence: {
      traceId?: string | null;
      runtimeSha?: string | null;
      bridgeVersion?: string | null;
      trace?: Readonly<Record<string, unknown>> | null;
    } = {},
  ) {
    super(message);
    this.reasonCode = reasonCode;
    this.traceId = evidence.traceId ?? null;
    this.runtimeSha = evidence.runtimeSha ?? null;
    this.bridgeVersion = evidence.bridgeVersion ?? null;
    this.trace = evidence.trace ?? null;
  }
}

export function agentPilotOwnerCanaryEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.AGENT_PILOT_OWNER_CANARY_ENABLED === 'true';
}

function requireConfig(env: NodeJS.ProcessEnv = process.env) {
  const rawUrl = env.AGENT_PILOT_OWNER_CANARY_URL?.trim() ?? '';
  const secret = env.AGENT_PILOT_OWNER_CANARY_SECRET ?? '';
  const runtimeSha = env.AGENT_PILOT_OWNER_CANARY_RUNTIME_SHA?.trim() ?? '';
  const parsedTimeout = Number.parseInt(
    env.AGENT_PILOT_OWNER_CANARY_TIMEOUT_MS ?? '',
    10,
  );
  const timeoutMs = Number.isFinite(parsedTimeout)
    ? Math.min(Math.max(parsedTimeout, 5_000), DEFAULT_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AgentPilotOwnerError('AGENT_PILOT_URL_INVALID');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new AgentPilotOwnerError('AGENT_PILOT_URL_INVALID');
  }
  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new AgentPilotOwnerError('AGENT_PILOT_SECRET_INVALID');
  }
  if (
    runtimeSha !== AGENT_PILOT_RUNTIME_SHA
    || !/^[a-f0-9]{40}$/.test(runtimeSha)
  ) {
    throw new AgentPilotOwnerError('AGENT_PILOT_RUNTIME_PIN_INVALID');
  }
  return { url, secret, runtimeSha, timeoutMs };
}

function cleanString(value: unknown, maximum: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\0/g, '').trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function cleanObjects(value: unknown, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const objects = value.filter(
    (item): item is Record<string, unknown> => Boolean(
      item && typeof item === 'object' && !Array.isArray(item),
    ),
  );
  return objects.length === value.length ? objects : null;
}

function cleanTrace(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded, 'utf8') > 512 * 1_024) return null;
  return value as Record<string, unknown>;
}

export async function callAgentPilotOwnerCanary(input: {
  conversationId: string;
  turnId: string;
  message: string;
  requestId: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AgentPilotOwnerResponse> {
  const env = input.env ?? process.env;
  if (!agentPilotOwnerCanaryEnabled(env)) {
    throw new AgentPilotOwnerError('AGENT_PILOT_DISABLED');
  }
  const config = requireConfig(env);
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(
      new URL('v1/chat', `${config.url.toString().replace(/\/?$/, '/')}`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.secret}`,
          'Content-Type': 'application/json',
          'X-Request-Id': input.requestId,
        },
        body: JSON.stringify({
          conversation_id: input.conversationId,
          turn_id: input.turnId,
          message: input.message,
          expected_runtime_sha: config.runtimeSha,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(config.timeoutMs),
      },
    );
  } catch (error) {
    throw new AgentPilotOwnerError(
      error instanceof DOMException && error.name === 'TimeoutError'
        ? 'AGENT_PILOT_TIMEOUT'
        : 'AGENT_PILOT_UNAVAILABLE',
    );
  }
  const body = await response.json().catch(() => null) as
    Record<string, unknown> | null;
  if (!response.ok) {
    const errorRuntimeSha = cleanString(body?.runtime_sha, 40);
    const errorTraceId = cleanString(body?.trace_id, 128);
    const errorBridgeVersion = cleanString(body?.bridge_version, 128);
    const errorTrace = cleanTrace(body?.trace);
    throw new AgentPilotOwnerError(
      response.status === 409
        ? 'AGENT_PILOT_RUNTIME_MISMATCH'
        : 'AGENT_PILOT_UPSTREAM_ERROR',
      undefined,
      {
        traceId: errorTraceId,
        runtimeSha: errorRuntimeSha,
        bridgeVersion: errorBridgeVersion,
        trace: errorTrace,
      },
    );
  }
  const answer = cleanString(body?.answer, 12_000);
  const runtimeSha = cleanString(body?.runtime_sha, 40);
  const traceId = cleanString(body?.trace_id, 128);
  const bridgeVersion = cleanString(body?.bridge_version, 128);
  const latencyMs = body?.latency_ms;
  const roleCalls = cleanObjects(body?.role_calls, 8);
  const selectedEvidence = cleanObjects(body?.selected_evidence, 12);
  const trace = cleanTrace(body?.trace);
  if (
    body?.success !== true
    || body?.fallback !== false
    || !answer
    || runtimeSha !== config.runtimeSha
    || runtimeSha !== AGENT_PILOT_RUNTIME_SHA
    || !traceId
    || !bridgeVersion
    || !Number.isInteger(latencyMs)
    || (latencyMs as number) < 0
    || !roleCalls
    || !selectedEvidence
    || !trace
    || trace.trace_id !== traceId
    || trace.turn_id !== input.turnId
    || trace.runtime_sha !== runtimeSha
    || typeof body?.critic_used !== 'boolean'
    || typeof body?.reconsideration_used !== 'boolean'
  ) {
    throw new AgentPilotOwnerError(
      runtimeSha && runtimeSha !== config.runtimeSha
        ? 'AGENT_PILOT_RUNTIME_MISMATCH'
        : 'AGENT_PILOT_RESPONSE_INVALID',
    );
  }
  return {
    answer,
    runtimeSha,
    latencyMs: latencyMs as number,
    roleCalls,
    criticUsed: body.critic_used,
    reconsiderationUsed: body.reconsideration_used,
    selectedEvidence,
    traceId,
    bridgeVersion,
    trace,
  };
}
