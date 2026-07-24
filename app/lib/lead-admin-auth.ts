import 'server-only';

import type { NextRequest } from 'next/server';
import {
  createLeadAdminSessionToken,
  hashLeadAdminPassword,
  type LeadAdminRole,
  type LeadAdminSession,
  verifyLeadAdminPassword,
  verifyLeadAdminSessionToken,
} from './lead-admin-auth-core';

export const LEAD_ADMIN_COOKIE_NAME = 'rospark_lead_admin';
const DUMMY_PASSWORD_HASH = hashLeadAdminPassword(
  'not-a-real-admin-password',
  Buffer.alloc(16, 1),
);

export type ConfiguredLeadAdminUser = {
  userId: string;
  username: string;
  displayName: string;
  role: LeadAdminRole;
  passwordHash: string;
};

export class LeadAdminConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadAdminConfigurationError';
  }
}

export function leadAdminEnabled() {
  return process.env.LEAD_ADMIN_ENABLED === 'true';
}

function configuredUser(
  role: LeadAdminRole,
  defaults: { userId: string; username: string; displayName: string },
  usernameValue: string | undefined,
  passwordHash: string | undefined,
): ConfiguredLeadAdminUser {
  const username = usernameValue?.trim().toLowerCase() || defaults.username;
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) {
    throw new LeadAdminConfigurationError(`Некорректный username роли ${role}.`);
  }
  if (!passwordHash?.trim()) {
    throw new LeadAdminConfigurationError(`Не задан password hash роли ${role}.`);
  }
  return {
    userId: defaults.userId,
    username,
    displayName: defaults.displayName,
    role,
    passwordHash: passwordHash.trim(),
  };
}

export function configuredLeadAdminUsers() {
  return [
    configuredUser(
      'director',
      { userId: 'andrey', username: 'andrey', displayName: 'Андрей' },
      process.env.LEAD_ADMIN_DIRECTOR_USERNAME,
      process.env.LEAD_ADMIN_DIRECTOR_PASSWORD_HASH,
    ),
    configuredUser(
      'sales_head',
      { userId: 'sergey', username: 'sergey', displayName: 'Сергей, РОП' },
      process.env.LEAD_ADMIN_SALES_USERNAME,
      process.env.LEAD_ADMIN_SALES_PASSWORD_HASH,
    ),
  ] satisfies ConfiguredLeadAdminUser[];
}

function sessionSecret() {
  const value = process.env.LEAD_ADMIN_SESSION_SECRET?.trim();
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new LeadAdminConfigurationError(
      'Не задан безопасный LEAD_ADMIN_SESSION_SECRET.',
    );
  }
  return value;
}

function sessionTtlMs() {
  const value = Number(process.env.LEAD_ADMIN_SESSION_TTL_HOURS ?? 8);
  if (!Number.isFinite(value) || value < 1 || value > 24) {
    throw new LeadAdminConfigurationError(
      'LEAD_ADMIN_SESSION_TTL_HOURS должен быть от 1 до 24.',
    );
  }
  return Math.trunc(value * 60 * 60 * 1000);
}

export function authenticateLeadAdmin(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const user = configuredLeadAdminUsers().find((item) => (
    item.username === normalizedUsername
  ));
  const passwordMatches = verifyLeadAdminPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !passwordMatches) {
    return null;
  }
  return user;
}

export function issueLeadAdminSession(user: ConfiguredLeadAdminUser) {
  const ttlMs = sessionTtlMs();
  return {
    token: createLeadAdminSessionToken({
      userId: user.userId,
      role: user.role,
      ttlMs,
    }, sessionSecret()),
    maxAge: Math.trunc(ttlMs / 1_000),
  };
}

export function verifyConfiguredLeadAdminSession(
  token: string | undefined,
): (LeadAdminSession & {
  displayName: string;
  username: string;
}) | null {
  const session = verifyLeadAdminSessionToken(token, sessionSecret());
  if (!session) return null;
  const user = configuredLeadAdminUsers().find((item) => (
    item.userId === session.userId && item.role === session.role
  ));
  if (!user) return null;
  return {
    ...session,
    displayName: user.displayName,
    username: user.username,
  };
}

export function readLeadAdminSession(request: NextRequest) {
  return verifyConfiguredLeadAdminSession(
    request.cookies.get(LEAD_ADMIN_COOKIE_NAME)?.value,
  );
}

export function leadAdminCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}
