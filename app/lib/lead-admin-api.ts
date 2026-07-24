import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import type { LeadAdminPermission } from './lead-admin-auth-core';
import { leadAdminRoleHasPermission } from './lead-admin-auth-core';
import {
  LeadAdminConfigurationError,
  leadAdminEnabled,
  readLeadAdminSession,
} from './lead-admin-auth';

export function leadAdminJson(
  body: unknown,
  init?: { status?: number; headers?: HeadersInit },
) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export function leadAdminRequestHasSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const allowedOrigins = new Set([request.nextUrl.origin]);
  const host = request.headers.get('host')?.trim();
  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  const protocols = new Set([
    request.nextUrl.protocol.replace(':', '').toLowerCase(),
    forwardedProtocol,
  ]);

  if (host) {
    for (const protocol of protocols) {
      if (protocol !== 'http' && protocol !== 'https') continue;
      try {
        allowedOrigins.add(new URL(`${protocol}://${host}`).origin);
      } catch {
        // A malformed Host must never broaden the origin allowlist.
      }
    }
  }

  return allowedOrigins.has(origin);
}

export function requireLeadAdmin(
  request: NextRequest,
  permission: LeadAdminPermission,
  options: { requireSameOrigin?: boolean } = {},
) {
  if (!leadAdminEnabled()) {
    return {
      response: leadAdminJson(
        { error: 'Ресурс не найден.', code: 'NOT_FOUND' },
        { status: 404 },
      ),
    } as const;
  }
  if (options.requireSameOrigin && !leadAdminRequestHasSameOrigin(request)) {
    return {
      response: leadAdminJson(
        { error: 'Запрос отклонён.', code: 'ORIGIN_REJECTED' },
        { status: 403 },
      ),
    } as const;
  }

  try {
    const session = readLeadAdminSession(request);
    if (!session) {
      return {
        response: leadAdminJson(
          { error: 'Требуется вход.', code: 'UNAUTHORIZED' },
          { status: 401 },
        ),
      } as const;
    }
    if (!leadAdminRoleHasPermission(session.role, permission)) {
      return {
        response: leadAdminJson(
          { error: 'Недостаточно прав.', code: 'FORBIDDEN' },
          { status: 403 },
        ),
      } as const;
    }
    return { session } as const;
  } catch (error) {
    if (error instanceof LeadAdminConfigurationError) {
      return {
        response: leadAdminJson(
          { error: 'Admin-интерфейс не настроен.', code: 'MISCONFIGURED' },
          { status: 503 },
        ),
      } as const;
    }
    throw error;
  }
}
