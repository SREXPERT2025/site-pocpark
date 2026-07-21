import { NextRequest, NextResponse } from 'next/server';
import { createDemoSessionId, demoSessionCookie } from '@/app/lib/demo-session';

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { login?: unknown; password?: unknown } | null;
  const login = typeof payload?.login === 'string' ? payload.login.trim().toUpperCase() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';
  if (login !== 'TEST' || password !== 'TEST') {
    return NextResponse.json({ error: 'Неверный demo-логин или пароль.' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  response.cookies.set(demoSessionCookie(createDemoSessionId(), secure));
  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  response.cookies.set(demoSessionCookie('', secure, 0));
  return response;
}
