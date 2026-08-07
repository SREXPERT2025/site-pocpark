import {
  issueOwnerCanarySession,
  ownerCanaryCookieHeader,
} from '@/app/lib/owner-ai-canary-core';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { success: false, code: 'ORIGIN_DENIED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const body = await request.json().catch(() => null) as {
    credential?: unknown;
  } | null;
  if (typeof body?.credential !== 'string') {
    return NextResponse.json(
      { success: false, code: 'AUTH_DENIED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  try {
    const session = issueOwnerCanarySession({
      credential: body.credential,
    });
    return NextResponse.json(
      { success: true, expiresIn: session.ttlSeconds },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': ownerCanaryCookieHeader(
            session.token,
            session.ttlSeconds,
          ),
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, code: 'AUTH_DENIED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
