import type {
  AiCoreRuntimeObservabilityTrace,
  AiCoreTransportEvidence,
} from './owner-ai-canary-adapter.ts';

const SAFE_CODE = /^[A-Z][A-Z0-9_]{2,127}$/;
const SAFE_STAGE = /^[a-z][a-z0-9_]{1,79}$/;

function safeCode(value: unknown, fallback: string) {
  return typeof value === 'string' && SAFE_CODE.test(value)
    ? value
    : fallback;
}

function safeStage(value: unknown, fallback: string) {
  return typeof value === 'string' && SAFE_STAGE.test(value)
    ? value
    : fallback;
}

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function aiCorePrimaryFailureDiagnostic(input: {
  error: unknown;
  runtimeTrace: AiCoreRuntimeObservabilityTrace | null;
  transportEvidence: AiCoreTransportEvidence | null;
  fallbackCode: string;
}) {
  const errorCode = safeCode(
    input.error instanceof Error ? input.error.message : null,
    input.fallbackCode,
  );
  const runtimeError = record(input.runtimeTrace?.runtime_error);
  const failedStage = input.runtimeTrace?.pipeline.find((stage) => {
    const status = record(stage)?.status;
    return status === 'blocked' || status === 'error';
  });
  const failedStageRecord = record(failedStage);
  const runtimeStage = runtimeError?.stage ?? failedStageRecord?.name;
  const stage = runtimeStage
    ? safeStage(runtimeStage, 'runtime_unknown')
    : input.transportEvidence?.outcome === 'http_response_rejected'
      ? 'site_response_validation'
      : input.transportEvidence
        ? 'runtime_transport'
        : 'site_pre_runtime_gate';
  const runtimeErrorCode = runtimeError?.code ?? runtimeError?.error_code;
  return Object.freeze({
    error_code: errorCode,
    stage,
    origin: runtimeStage
      ? 'runtime' as const
      : input.transportEvidence?.outcome === 'http_response_rejected'
        ? 'site_adapter' as const
        : input.transportEvidence
          ? 'runtime_transport' as const
          : 'site' as const,
    runtime_error_code: typeof runtimeErrorCode === 'string'
      ? runtimeErrorCode.slice(0, 160)
      : null,
  });
}

export function aiCoreSecondaryFailureDiagnostic(input: {
  source: 'owner_pre_gate_telemetry' | 'owner_restricted_forensic';
  error: unknown;
  fallbackStage: string;
}) {
  const failure = record(input.error);
  const errorCode = safeCode(
    failure?.code
      ?? (input.error instanceof Error ? input.error.message : null),
    input.source === 'owner_restricted_forensic'
      ? 'OWNER_RESTRICTED_FORENSIC_STORAGE_ERROR'
      : 'OWNER_PRE_GATE_TELEMETRY_STORAGE_ERROR',
  );
  const storageCode = typeof failure?.storageCode === 'string'
    ? failure.storageCode.slice(0, 80)
    : typeof failure?.causeCode === 'string'
      ? failure.causeCode.slice(0, 80)
      : null;
  const storageMessage = typeof failure?.storageMessage === 'string'
    ? failure.storageMessage.slice(0, 500)
    : null;
  return Object.freeze({
    source: input.source,
    error_code: errorCode,
    stage: safeStage(failure?.stage, input.fallbackStage),
    storage_code: storageCode,
    storage_message: storageMessage,
  });
}
