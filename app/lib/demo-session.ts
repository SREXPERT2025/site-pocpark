import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const DEMO_SESSION_COOKIE = 'rospark_demo_session';
export const DEMO_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export function createDemoSessionId() {
  return randomBytes(24).toString('hex');
}

export function readDemoSession(request: NextRequest) {
  const value = request.cookies.get(DEMO_SESSION_COOKIE)?.value ?? '';
  return /^[a-f0-9]{48}$/.test(value) ? value : null;
}

export function demoSessionCookie(value: string, secure: boolean, maxAge = DEMO_SESSION_MAX_AGE_SECONDS) {
  return {
    name: DEMO_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge,
  };
}
