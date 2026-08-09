import {
  clearOwnerCanaryCookieHeader,
  cookieValue,
  OWNER_AI_CANARY_COOKIE,
  verifyOwnerCanarySession,
} from '@/app/lib/owner-ai-canary-core';
import {
  ownerCanarySessionRevoked,
  revokeOwnerCanarySession,
  runOwnerAiCanaryMigrations,
} from '@/app/lib/owner-ai-canary-state';
import { getAiWidgetLogDatabase } from '@/app/lib/ai-widget-log-database';
import {
  ownerCanaryOriginFailureStatus,
  validateOwnerCanaryOrigin,
} from '@/app/lib/owner-canary-origin';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const originDecision = validateOwnerCanaryOrigin({
    headers: request.headers,
  });
  if (!originDecision.allowed) {
    return NextResponse.json(
      { success: false, code: originDecision.reason },
      {
        status: ownerCanaryOriginFailureStatus(originDecision.reason),
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
  const token = cookieValue(
    request.headers.get('cookie'),
    OWNER_AI_CANARY_COOKIE,
  );
  let revocationFailed = false;
  if (token) {
    try {
      const db = getAiWidgetLogDatabase();
      runOwnerAiCanaryMigrations(db);
      const session = verifyOwnerCanarySession({
        token,
        isRevoked: (jti) => ownerCanarySessionRevoked(db, jti),
      });
      if (session) {
        revokeOwnerCanarySession(db, {
          jti: session.jti,
          expiresAtMs: session.exp * 1000,
        });
      }
    } catch {
      revocationFailed = true;
    }
  }
  return NextResponse.json(
    revocationFailed
      ? { success: false, code: 'LOGOUT_REVOCATION_FAILED' }
      : { success: true },
    {
      status: revocationFailed ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': clearOwnerCanaryCookieHeader(),
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
