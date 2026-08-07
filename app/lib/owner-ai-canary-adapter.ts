import { createHash } from 'node:crypto';

const OWNER_AI_CANARY_CONTRACT_VERSION = 'AI_CORE_SITE_CONTRACT_V1';

type OwnerCanaryThreadState = {
  conversationThreadId: string;
  stateVersion: number;
  confirmedProjectFacts: unknown[];
  [key: string]: unknown;
};

type OwnerCanaryMutationProposal = {
  mutationId: string;
  expectedStateVersion: number;
  patch: Record<string, unknown>;
  [key: string]: unknown;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function decisionPackageHash(decisionPackage: unknown) {
  return createHash('sha256')
    .update(canonicalJson(decisionPackage))
    .digest('hex');
}

export type OwnerCanaryCoreRequest = Readonly<{
  contractVersion: typeof OWNER_AI_CANARY_CONTRACT_VERSION;
  aiCoreRequestId: string;
  idempotencyKey: string;
  conversationThreadId: string;
  messageId: string;
  currentMessage: string;
  sourcePage: string;
  pageContextIntentHint: unknown | null;
  stateVersion: number;
  state: OwnerCanaryThreadState;
  dryRun: true;
}>;

export function buildOwnerCanaryCoreRequest(input: {
  aiCoreRequestId: string;
  conversationThreadId: string;
  messageId: string;
  currentMessage: string;
  sourcePage: string;
  pageContextIntentHint?: unknown;
  state: OwnerCanaryThreadState;
}): OwnerCanaryCoreRequest {
  if (input.state.conversationThreadId !== input.conversationThreadId) {
    throw new Error('STATE_IDENTITY_MISMATCH');
  }
  return Object.freeze({
    contractVersion: OWNER_AI_CANARY_CONTRACT_VERSION,
    aiCoreRequestId: input.aiCoreRequestId,
    idempotencyKey: input.messageId,
    conversationThreadId: input.conversationThreadId,
    messageId: input.messageId,
    currentMessage: input.currentMessage,
    sourcePage: input.sourcePage,
    // Landing/demo/article context remains an unconfirmed intent hint.
    pageContextIntentHint: input.pageContextIntentHint ?? null,
    stateVersion: input.state.stateVersion,
    state: input.state,
    dryRun: true,
  });
}

export type OwnerCanaryCoreResponse = Readonly<{
  contractVersion: typeof OWNER_AI_CANARY_CONTRACT_VERSION;
  aiCoreRequestId: string;
  decisionPackage: Readonly<Record<string, unknown>>;
  decisionPackageHash: string;
  mutationProposal: OwnerCanaryMutationProposal | null;
}>;

export function validateOwnerCanaryCoreResponse(
  value: unknown,
): OwnerCanaryCoreResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('INVALID_AI_CORE_RESPONSE');
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.contractVersion !== OWNER_AI_CANARY_CONTRACT_VERSION) {
    throw new Error('AI_CORE_CONTRACT_VERSION_MISMATCH');
  }
  if (typeof candidate.aiCoreRequestId !== 'string') {
    throw new Error('INVALID_AI_CORE_REQUEST_ID');
  }
  if (!candidate.decisionPackage
    || typeof candidate.decisionPackage !== 'object'
    || Array.isArray(candidate.decisionPackage)) {
    throw new Error('INVALID_DECISION_PACKAGE');
  }
  const actualHash = decisionPackageHash(candidate.decisionPackage);
  if (candidate.decisionPackageHash !== actualHash) {
    throw new Error('DECISION_PACKAGE_HASH_MISMATCH');
  }
  const mutationProposal = candidate.mutationProposal ?? null;
  if (mutationProposal !== null
    && (typeof mutationProposal !== 'object'
      || Array.isArray(mutationProposal))) {
    throw new Error('INVALID_MUTATION_PROPOSAL');
  }
  return Object.freeze({
    contractVersion: OWNER_AI_CANARY_CONTRACT_VERSION,
    aiCoreRequestId: candidate.aiCoreRequestId,
    decisionPackage: Object.freeze({
      ...(candidate.decisionPackage as Record<string, unknown>),
    }),
    decisionPackageHash: actualHash,
    mutationProposal:
      mutationProposal as OwnerCanaryMutationProposal | null,
  });
}
