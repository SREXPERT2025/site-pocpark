export const PUBLIC_AI_CORE_RUNTIME_SHA =
  'bdaaf16215b2066659c37ca6094e5e2f0a3c1bea';
export const PUBLIC_AI_CORE_CONTRACT_SHA =
  '6cd71a5596346925ecdd2ffeb9d45262d881ee93';

export type AiCoreSiteAudience =
  | 'legacy'
  | 'owner_canary'
  | 'public_ai_core';

export function publicAiCoreEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.AI_CORE_PUBLIC_ENABLED === 'true';
}

export function selectAiCoreSiteAudience(input: {
  publicEnabled: boolean;
  ownerAudience: 'legacy' | 'owner_canary';
}): AiCoreSiteAudience {
  if (input.publicEnabled) return 'public_ai_core';
  return input.ownerAudience;
}

export function requirePublicAiCoreReleasePins(
  env: NodeJS.ProcessEnv = process.env,
) {
  const siteRelease = env.AI_CORE_PUBLIC_SITE_SHA ?? '';
  const gatewayRelease = env.AI_CORE_PUBLIC_GATEWAY_SHA ?? '';
  if (!/^[a-f0-9]{40}$/.test(siteRelease)
    || !/^[a-f0-9]{40}$/.test(gatewayRelease)
    || env.AI_CORE_PUBLIC_RUNTIME_SHA !== PUBLIC_AI_CORE_RUNTIME_SHA
    || env.AI_CORE_PUBLIC_CONTRACT_SHA !== PUBLIC_AI_CORE_CONTRACT_SHA) {
    throw new Error('AI_CORE_PUBLIC_RELEASE_PIN_INVALID');
  }
  return { siteRelease, gatewayRelease };
}

export function publicAiCoreFallbackReason(
  error: unknown,
  mutationStarted: boolean,
) {
  if (mutationStarted) return null;
  if (!(error instanceof Error)) return null;
  const status = Number(
    (error as Error & { status?: number }).status,
  );
  if (error.message === 'AI_CORE_PUBLIC_UPSTREAM_ERROR'
    && [502, 503, 504].includes(status)) {
    return `AI_CORE_UPSTREAM_${status}`;
  }
  if (error.message === 'AI_CORE_PUBLIC_TRANSPORT_TIMEOUT') {
    return 'AI_CORE_TRANSPORT_TIMEOUT';
  }
  if (error.message === 'AI_CORE_PUBLIC_TRANSPORT_UNAVAILABLE') {
    return 'AI_CORE_TRANSPORT_UNAVAILABLE';
  }
  return null;
}

export function publicAiCoreRouteHeaders(input: {
  actualRoute: 'ai_core' | 'legacy' | 'fallback';
  fallbackReason?: string | null;
}) {
  return {
    'X-AI-Core-Planned-Route': 'ai_core',
    'X-AI-Core-Actual-Route': input.actualRoute,
    ...(input.fallbackReason ? {
      'X-AI-Core-Fallback-Reason': input.fallbackReason,
    } : {}),
  };
}
