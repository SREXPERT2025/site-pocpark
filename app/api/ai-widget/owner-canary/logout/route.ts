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
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { success: false, code: 'ORIGIN_DENIED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
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
