import {
  issueOwnerCanarySession,
  ownerCanaryCookieHeader,
} from '@/app/lib/owner-ai-canary-core';
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
