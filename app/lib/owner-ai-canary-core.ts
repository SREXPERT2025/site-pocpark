import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

export const OWNER_AI_CANARY_COOKIE =
  '__Host-rospark-owner-ai-canary';
export const OWNER_AI_CANARY_CONTRACT_VERSION =
  'AI_CORE_SITE_CONTRACT_V1';
export const OWNER_AI_CANARY_MARKER = 'AI Core Owner Test';

type OwnerSessionPayload = {
  v: string;
  jti: string;
  iat: number;
  exp: number;
};

function requiredSecret(
  value: string | undefined,
  field: string,
) {
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${field}_INVALID`);
  }
  return value;
}

function safeEqual(left: string, right: string) {
  const leftDigest = createHmac('sha256', 'owner-canary-compare')
    .update(left)
    .digest();
  const rightDigest = createHmac('sha256', 'owner-canary-compare')
    .update(right)
    .digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function signPayload(payload: string, key: string) {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function ownerAiCanaryEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.AI_CORE_OWNER_CANARY_ENABLED === 'true';
}

export function issueOwnerCanarySession(input: {
  credential: string;
  env?: NodeJS.ProcessEnv;
  nowMs?: number;
  ttlSeconds?: number;
  idFactory?: () => string;
}) {
  const env = input.env ?? process.env;
  const expected = requiredSecret(
    env.AI_CORE_OWNER_CANARY_CREDENTIAL,
    'AI_CORE_OWNER_CANARY_CREDENTIAL',
  );
  if (!safeEqual(input.credential, expected)) {
    throw new Error('OWNER_CANARY_AUTH_DENIED');
  }
  const key = requiredSecret(
    env.AI_CORE_OWNER_CANARY_COOKIE_KEY,
    'AI_CORE_OWNER_CANARY_COOKIE_KEY',
  );
  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const ttlSeconds = Math.min(
    Math.max(input.ttlSeconds ?? 3_600, 60),
    86_400,
  );
  const payload: OwnerSessionPayload = {
    v: env.AI_CORE_OWNER_CANARY_SESSION_VERSION?.trim() || 'v1',
    jti: input.idFactory?.() ?? randomUUID(),
    iat: now,
    exp: now + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return {
    token: `${encoded}.${signPayload(encoded, key)}`,
    payload,
    ttlSeconds,
  };
}

export function verifyOwnerCanarySession(input: {
  token: string | null | undefined;
  env?: NodeJS.ProcessEnv;
  nowMs?: number;
  isRevoked?: (jti: string) => boolean;
}) {
  if (!input.token) return null;
  const env = input.env ?? process.env;
  let key: string;
  try {
    key = requiredSecret(
      env.AI_CORE_OWNER_CANARY_COOKIE_KEY,
      'AI_CORE_OWNER_CANARY_COOKIE_KEY',
    );
  } catch {
    return null;
  }
  const parts = input.token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = signPayload(encoded, key);
  if (!safeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as OwnerSessionPayload;
    const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
    const version =
      env.AI_CORE_OWNER_CANARY_SESSION_VERSION?.trim() || 'v1';
    if (
      payload.v !== version
      || !/^[a-z0-9-]{16,128}$/i.test(payload.jti)
      || !Number.isInteger(payload.iat)
      || !Number.isInteger(payload.exp)
      || payload.iat > now + 30
      || payload.exp <= now
      || payload.exp - payload.iat > 86_400
      || input.isRevoked?.(payload.jti)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function ownerCanaryCookieHeader(
  token: string,
  ttlSeconds: number,
) {
  return [
    `${OWNER_AI_CANARY_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${ttlSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

export function clearOwnerCanaryCookieHeader() {
  return [
    `${OWNER_AI_CANARY_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

export function cookieValue(
  cookieHeader: string | null,
  name: string,
) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return rawValue.join('=') || null;
  }
  return null;
}

function identityKey(env: NodeJS.ProcessEnv) {
  return requiredSecret(
    env.AI_CORE_IDENTITY_HMAC_KEY,
    'AI_CORE_IDENTITY_HMAC_KEY',
  );
}

function validSiteIdentifier(value: string, field: string) {
  const normalized = value.replace(/\0/g, '').trim();
  if (!/^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(normalized)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function derivedId(prefix: string, value: string, key: string) {
  return `${prefix}_${createHmac('sha256', key)
    .update(value)
    .digest('base64url')}`;
}

export function mapSiteIdentity(input: {
  sessionId: string;
  turnId: string;
  env?: NodeJS.ProcessEnv;
}) {
  const env = input.env ?? process.env;
  const key = identityKey(env);
  const sessionId = validSiteIdentifier(input.sessionId, 'session_id');
  const turnId = validSiteIdentifier(input.turnId, 'turn_id');
  const conversationThreadId = derivedId(
    'cth_v1',
    sessionId,
    key,
  );
  const messageId = derivedId(
    'msg_v1',
    `${conversationThreadId}\0${turnId}`,
    key,
  );
  return {
    siteSessionId: sessionId,
    siteTurnId: turnId,
    conversationThreadId,
    messageId,
  };
}

export type OwnerCanaryAudience = 'legacy' | 'owner_canary';

export function selectOwnerCanaryAudience(input: {
  cookieToken: string | null | undefined;
  env?: NodeJS.ProcessEnv;
  nowMs?: number;
  isRevoked?: (jti: string) => boolean;
}): {
  audience: OwnerCanaryAudience;
  session: OwnerSessionPayload | null;
} {
  const env = input.env ?? process.env;
  if (!ownerAiCanaryEnabled(env)) {
    return { audience: 'legacy', session: null };
  }
  const session = verifyOwnerCanarySession({
    token: input.cookieToken,
    env,
    nowMs: input.nowMs,
    isRevoked: input.isRevoked,
  });
  return session
    ? { audience: 'owner_canary', session }
    : { audience: 'legacy', session: null };
}

export function ownerCanaryPlaceholderDecision() {
  return {
    route: 'owner_ai_core_placeholder' as const,
    runtimeConnected: false,
    fallbackToLegacyAllowed: false,
    errorCode: 'OWNER_AI_CORE_NOT_CONNECTED' as const,
  };
}
