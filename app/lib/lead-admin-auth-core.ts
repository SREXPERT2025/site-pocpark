import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

export const LEAD_ADMIN_ROLES = ['director', 'sales_head'] as const;
export type LeadAdminRole = (typeof LEAD_ADMIN_ROLES)[number];

export type LeadAdminPermission =
  | 'view'
  | 'process'
  | 'export'
  | 'delete';

export type LeadAdminSession = {
  userId: string;
  role: LeadAdminRole;
  issuedAt: number;
  expiresAt: number;
};

export const LEAD_ADMIN_ROLE_PERMISSIONS: Record<
  LeadAdminRole,
  readonly LeadAdminPermission[]
> = {
  director: ['view', 'process', 'export', 'delete'],
  sales_head: ['view', 'process', 'export'],
};

const PASSWORD_HASH_PREFIX = 'scrypt-v1';
const PASSWORD_KEY_LENGTH = 64;
const SESSION_VERSION = 1;

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function safeEqual(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function leadAdminRoleHasPermission(
  role: LeadAdminRole,
  permission: LeadAdminPermission,
) {
  return LEAD_ADMIN_ROLE_PERMISSIONS[role].includes(permission);
}

export function hashLeadAdminPassword(
  password: string,
  salt = randomBytes(16),
) {
  if (password.length < 12 || password.length > 256) {
    throw new Error('Пароль admin должен содержать от 12 до 256 символов.');
  }
  const digest = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  return [
    PASSWORD_HASH_PREFIX,
    salt.toString('base64url'),
    digest.toString('base64url'),
  ].join('$');
}

export function verifyLeadAdminPassword(password: string, encodedHash: string) {
  if (password.length === 0 || password.length > 256) return false;
  const [prefix, saltValue, digestValue, extra] = encodedHash.split('$');
  if (
    prefix !== PASSWORD_HASH_PREFIX ||
    !saltValue ||
    !digestValue ||
    extra !== undefined
  ) {
    return false;
  }
  try {
    const salt = Buffer.from(saltValue, 'base64url');
    const expected = Buffer.from(digestValue, 'base64url');
    if (salt.length < 16 || expected.length !== PASSWORD_KEY_LENGTH) return false;
    return safeEqual(
      scryptSync(password, salt, expected.length),
      expected,
    );
  } catch {
    return false;
  }
}

function validateSessionSecret(secret: string) {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('LEAD_ADMIN_SESSION_SECRET должен быть не короче 32 байт.');
  }
}

function signSessionPayload(payload: string, secret: string) {
  validateSessionSecret(secret);
  return createHmac('sha256', secret).update(payload).digest();
}

export function createLeadAdminSessionToken(
  input: {
    userId: string;
    role: LeadAdminRole;
    nowMs?: number;
    ttlMs?: number;
  },
  secret: string,
) {
  const nowMs = input.nowMs ?? Date.now();
  const ttlMs = input.ttlMs ?? 8 * 60 * 60 * 1000;
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(input.userId)) {
    throw new Error('Некорректный userId admin.');
  }
  if (!LEAD_ADMIN_ROLES.includes(input.role)) {
    throw new Error('Некорректная роль admin.');
  }
  if (ttlMs < 60_000 || ttlMs > 24 * 60 * 60 * 1000) {
    throw new Error('Некорректный срок admin-сессии.');
  }

  const payload = base64Url(JSON.stringify({
    v: SESSION_VERSION,
    sub: input.userId,
    role: input.role,
    iat: nowMs,
    exp: nowMs + ttlMs,
  }));
  const signature = signSessionPayload(payload, secret).toString('base64url');
  return `${payload}.${signature}`;
}

export function verifyLeadAdminSessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now(),
): LeadAdminSession | null {
  if (!token || token.length > 2_048) return null;
  const [payload, signatureValue, extra] = token.split('.');
  if (!payload || !signatureValue || extra !== undefined) return null;

  try {
    const expected = signSessionPayload(payload, secret);
    const actual = Buffer.from(signatureValue, 'base64url');
    if (!safeEqual(actual, expected)) return null;

    const value = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    if (
      value.v !== SESSION_VERSION ||
      typeof value.sub !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(value.sub) ||
      typeof value.role !== 'string' ||
      !LEAD_ADMIN_ROLES.includes(value.role as LeadAdminRole) ||
      typeof value.iat !== 'number' ||
      typeof value.exp !== 'number' ||
      value.iat > nowMs + 60_000 ||
      value.exp <= nowMs ||
      value.exp - value.iat > 24 * 60 * 60 * 1000
    ) {
      return null;
    }
    return {
      userId: value.sub,
      role: value.role as LeadAdminRole,
      issuedAt: value.iat,
      expiresAt: value.exp,
    };
  } catch {
    return null;
  }
}
