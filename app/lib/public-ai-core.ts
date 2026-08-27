import { DEPLOYED_SITE_SHA } from './site-release-provenance.ts';

export const PUBLIC_AI_CORE_RUNTIME_SHA =
  '5606a1fc4698666ba01e93d5ab25958f026833e8';
export const PUBLIC_AI_CORE_CONTRACT_SHA =
  '4d75773d60f3453279cbfcee1453f54b15b66567';
export const PUBLIC_AI_CORE_GATEWAY_SHA =
  'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9';

const SHA_PATTERN = /^[a-f0-9]{40}$/;

export type PublicAiCoreReleasePinReasonCode =
  | 'AI_CORE_PUBLIC_SITE_PIN_MISMATCH'
  | 'AI_CORE_DEPLOYED_SITE_PIN_MISMATCH'
  | 'AI_CORE_PUBLIC_GATEWAY_PIN_MISMATCH'
  | 'AI_CORE_PUBLIC_RUNTIME_PIN_MISMATCH'
  | 'AI_CORE_PUBLIC_CONTRACT_PIN_MISMATCH';

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
  return validatePublicAiCoreReleasePins({
    env,
    deployedSiteSha: DEPLOYED_SITE_SHA,
  });
}

/**
 * Test-only dependency injection for invalid immutable build provenance.
 * Production callers must use requirePublicAiCoreReleasePins(), whose deployed
 * Site identity is the build-time DEPLOYED_SITE_SHA constant.
 */
export function testOnlyRequirePublicAiCoreReleasePins(input: {
  env: NodeJS.ProcessEnv;
  deployedSiteSha: string;
}) {
  return validatePublicAiCoreReleasePins(input);
}

function validatePublicAiCoreReleasePins(input: {
  env: NodeJS.ProcessEnv;
  deployedSiteSha: string;
}) {
  const { env } = input;
  const siteRelease = env.AI_CORE_PUBLIC_SITE_SHA ?? '';
  const actualDeployedSiteRelease = input.deployedSiteSha;
  const gatewayRelease = env.AI_CORE_PUBLIC_GATEWAY_SHA ?? '';
  if (!SHA_PATTERN.test(actualDeployedSiteRelease)) {
    throw new Error('AI_CORE_DEPLOYED_SITE_PIN_MISMATCH');
  }
  if (!SHA_PATTERN.test(siteRelease)
    || siteRelease !== actualDeployedSiteRelease) {
    throw new Error('AI_CORE_PUBLIC_SITE_PIN_MISMATCH');
  }
  if (gatewayRelease !== PUBLIC_AI_CORE_GATEWAY_SHA) {
    throw new Error('AI_CORE_PUBLIC_GATEWAY_PIN_MISMATCH');
  }
  if (env.AI_CORE_PUBLIC_RUNTIME_SHA !== PUBLIC_AI_CORE_RUNTIME_SHA) {
    throw new Error('AI_CORE_PUBLIC_RUNTIME_PIN_MISMATCH');
  }
  if (env.AI_CORE_PUBLIC_CONTRACT_SHA !== PUBLIC_AI_CORE_CONTRACT_SHA) {
    throw new Error('AI_CORE_PUBLIC_CONTRACT_PIN_MISMATCH');
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
