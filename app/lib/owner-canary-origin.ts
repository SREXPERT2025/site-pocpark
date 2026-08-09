export const OWNER_CANARY_PUBLIC_ORIGIN_ENV =
  'OWNER_CANARY_PUBLIC_ORIGIN' as const;

export type OwnerCanaryOriginReason =
  | 'OWNER_ORIGIN_ALLOWED'
  | 'OWNER_PUBLIC_ORIGIN_CONFIG_INVALID'
  | 'OWNER_ORIGIN_MISSING'
  | 'OWNER_ORIGIN_NULL'
  | 'OWNER_ORIGIN_AMBIGUOUS'
  | 'OWNER_ORIGIN_INVALID'
  | 'OWNER_ORIGIN_SCHEME_MISMATCH'
  | 'OWNER_ORIGIN_MISMATCH'
  | 'OWNER_HOST_MISSING'
  | 'OWNER_HOST_AMBIGUOUS'
  | 'OWNER_HOST_INVALID'
  | 'OWNER_HOST_MISMATCH'
  | 'OWNER_FORWARDED_HOST_AMBIGUOUS'
  | 'OWNER_FORWARDED_HOST_INVALID'
  | 'OWNER_FORWARDED_HOST_MISMATCH'
  | 'OWNER_FORWARDED_PROTO_MISSING'
  | 'OWNER_FORWARDED_PROTO_AMBIGUOUS'
  | 'OWNER_FORWARDED_PROTO_MISMATCH'
  | 'OWNER_HEADER_CONTROL_CHARACTER';

export type OwnerCanaryOriginDecision = {
  allowed: boolean;
  reason: OwnerCanaryOriginReason;
  canonicalOrigin: string | null;
};

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function denied(
  reason: Exclude<OwnerCanaryOriginReason, 'OWNER_ORIGIN_ALLOWED'>,
  canonicalOrigin: string | null,
): OwnerCanaryOriginDecision {
  return { allowed: false, reason, canonicalOrigin };
}

function canonicalPublicOrigin(env: NodeJS.ProcessEnv) {
  const raw = env[OWNER_CANARY_PUBLIC_ORIGIN_ENV];
  if (!raw || raw !== raw.trim() || CONTROL_CHARACTER.test(raw)) {
    return null;
  }
  try {
    const value = new URL(raw);
    if (
      value.protocol !== 'https:'
      || value.username
      || value.password
      || value.pathname !== '/'
      || value.search
      || value.hash
    ) {
      return null;
    }
    return value.origin;
  } catch {
    return null;
  }
}

function ambiguous(value: string) {
  return value.includes(',');
}

function normalizedOrigin(raw: string) {
  if (raw !== raw.trim() || CONTROL_CHARACTER.test(raw)) return null;
  try {
    const value = new URL(raw);
    if (
      value.username
      || value.password
      || value.pathname !== '/'
      || value.search
      || value.hash
    ) {
      return null;
    }
    return value.origin;
  } catch {
    return null;
  }
}

function normalizedAuthority(raw: string, protocol: string) {
  if (
    !raw
    || raw !== raw.trim()
    || ambiguous(raw)
    || CONTROL_CHARACTER.test(raw)
    || /[/?#@]/.test(raw)
  ) {
    return null;
  }
  try {
    const value = new URL(`${protocol}//${raw}`);
    if (
      value.username
      || value.password
      || value.pathname !== '/'
      || value.search
      || value.hash
    ) {
      return null;
    }
    return value.host;
  } catch {
    return null;
  }
}

export function validateOwnerCanaryOrigin(input: {
  headers: Headers;
  env?: NodeJS.ProcessEnv;
}): OwnerCanaryOriginDecision {
  const env = input.env ?? process.env;
  const canonicalOrigin = canonicalPublicOrigin(env);
  if (!canonicalOrigin) {
    return denied('OWNER_PUBLIC_ORIGIN_CONFIG_INVALID', null);
  }
  const canonical = new URL(canonicalOrigin);
  const origin = input.headers.get('origin');
  if (!origin) return denied('OWNER_ORIGIN_MISSING', canonicalOrigin);
  if (CONTROL_CHARACTER.test(origin)) {
    return denied('OWNER_HEADER_CONTROL_CHARACTER', canonicalOrigin);
  }
  if (origin === 'null') return denied('OWNER_ORIGIN_NULL', canonicalOrigin);
  if (ambiguous(origin)) {
    return denied('OWNER_ORIGIN_AMBIGUOUS', canonicalOrigin);
  }
  const normalized = normalizedOrigin(origin);
  if (!normalized) return denied('OWNER_ORIGIN_INVALID', canonicalOrigin);
  if (new URL(normalized).protocol !== canonical.protocol) {
    return denied('OWNER_ORIGIN_SCHEME_MISMATCH', canonicalOrigin);
  }
  if (normalized !== canonicalOrigin) {
    return denied('OWNER_ORIGIN_MISMATCH', canonicalOrigin);
  }

  const host = input.headers.get('host');
  if (!host) return denied('OWNER_HOST_MISSING', canonicalOrigin);
  if (CONTROL_CHARACTER.test(host)) {
    return denied('OWNER_HEADER_CONTROL_CHARACTER', canonicalOrigin);
  }
  if (ambiguous(host)) return denied('OWNER_HOST_AMBIGUOUS', canonicalOrigin);
  const normalizedHost = normalizedAuthority(host, canonical.protocol);
  if (!normalizedHost) return denied('OWNER_HOST_INVALID', canonicalOrigin);
  if (normalizedHost !== canonical.host) {
    return denied('OWNER_HOST_MISMATCH', canonicalOrigin);
  }

  const forwardedHost = input.headers.get('x-forwarded-host');
  if (forwardedHost !== null) {
    if (CONTROL_CHARACTER.test(forwardedHost)) {
      return denied('OWNER_HEADER_CONTROL_CHARACTER', canonicalOrigin);
    }
    if (ambiguous(forwardedHost)) {
      return denied('OWNER_FORWARDED_HOST_AMBIGUOUS', canonicalOrigin);
    }
    const normalizedForwardedHost = normalizedAuthority(
      forwardedHost,
      canonical.protocol,
    );
    if (!normalizedForwardedHost) {
      return denied('OWNER_FORWARDED_HOST_INVALID', canonicalOrigin);
    }
    if (normalizedForwardedHost !== canonical.host) {
      return denied('OWNER_FORWARDED_HOST_MISMATCH', canonicalOrigin);
    }
  }

  const forwardedProto = input.headers.get('x-forwarded-proto');
  if (!forwardedProto) {
    return denied('OWNER_FORWARDED_PROTO_MISSING', canonicalOrigin);
  }
  if (CONTROL_CHARACTER.test(forwardedProto)) {
    return denied('OWNER_HEADER_CONTROL_CHARACTER', canonicalOrigin);
  }
  if (ambiguous(forwardedProto)) {
    return denied('OWNER_FORWARDED_PROTO_AMBIGUOUS', canonicalOrigin);
  }
  if (`${forwardedProto.toLowerCase()}:` !== canonical.protocol) {
    return denied('OWNER_FORWARDED_PROTO_MISMATCH', canonicalOrigin);
  }

  return {
    allowed: true,
    reason: 'OWNER_ORIGIN_ALLOWED',
    canonicalOrigin,
  };
}

export function ownerCanaryOriginFailureStatus(
  reason: OwnerCanaryOriginReason,
) {
  return reason === 'OWNER_PUBLIC_ORIGIN_CONFIG_INVALID' ? 503 : 403;
}
