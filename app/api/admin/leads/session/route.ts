import { NextRequest } from 'next/server';
import {
  LEAD_ADMIN_COOKIE_NAME,
  LeadAdminConfigurationError,
  authenticateLeadAdmin,
  issueLeadAdminSession,
  leadAdminCookieOptions,
  leadAdminEnabled,
} from '@/app/lib/lead-admin-auth';
import {
  leadAdminJson,
  leadAdminRequestHasSameOrigin,
  requireLeadAdmin,
} from '@/app/lib/lead-admin-api';
import { recordLeadAdminAudit } from '@/app/lib/lead-admin-core';
import { getLeadRegistryDatabase } from '@/app/lib/lead-registry-database';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const loginBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function rateLimited(request: NextRequest) {
  const now = Date.now();
  const key = clientIp(request);
  const current = loginBuckets.get(key);
  if (!current || current.resetAt <= now) {
    loginBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  if (!leadAdminEnabled()) {
    return leadAdminJson(
      { error: 'Ресурс не найден.', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }
  if (!leadAdminRequestHasSameOrigin(request)) {
    return leadAdminJson(
      { error: 'Запрос отклонён.', code: 'ORIGIN_REJECTED' },
      { status: 403 },
    );
  }
  if (rateLimited(request)) {
    return leadAdminJson(
      { error: 'Слишком много попыток. Повторите позже.', code: 'RATE_LIMITED' },
      { status: 429 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;
  const username = typeof payload?.username === 'string'
    ? payload.username
    : '';
  const password = typeof payload?.password === 'string'
    ? payload.password
    : '';

  try {
    const user = authenticateLeadAdmin(username, password);
    if (!user) {
      return leadAdminJson(
        { error: 'Неверный логин или пароль.', code: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    const session = issueLeadAdminSession(user);
    recordLeadAdminAudit(getLeadRegistryDatabase(), {
      actor: { userId: user.userId, role: user.role },
      action: 'login_success',
    });
    const response = leadAdminJson({
      ok: true,
      user: {
        displayName: user.displayName,
        role: user.role,
      },
    });
    response.cookies.set(
      LEAD_ADMIN_COOKIE_NAME,
      session.token,
      leadAdminCookieOptions(session.maxAge),
    );
    return response;
  } catch (error) {
    if (error instanceof LeadAdminConfigurationError) {
      return leadAdminJson(
        { error: 'Admin-интерфейс не настроен.', code: 'MISCONFIGURED' },
        { status: 503 },
      );
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireLeadAdmin(request, 'view', { requireSameOrigin: true });
  if ('response' in auth) return auth.response;

  recordLeadAdminAudit(getLeadRegistryDatabase(), {
    actor: {
      userId: auth.session.userId,
      role: auth.session.role,
    },
    action: 'logout',
  });
  const response = leadAdminJson({ ok: true });
  response.cookies.set(
    LEAD_ADMIN_COOKIE_NAME,
    '',
    leadAdminCookieOptions(0),
  );
  return response;
}
