import { NextRequest, NextResponse } from 'next/server';
import { cancelDemoRequest } from '@/app/lib/demo-request-store';
import { readDemoSession } from '@/app/lib/demo-session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = readDemoSession(request);
  if (!sessionId) return NextResponse.json({ error: 'Сессия demo-кабинета не найдена.' }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (payload?.action !== 'cancel') {
    return NextResponse.json({ error: 'Неизвестное действие.' }, { status: 400 });
  }
  const updated = cancelDemoRequest(sessionId, id.toUpperCase());
  if (!updated) return NextResponse.json({ error: 'Заявку нельзя отменить.' }, { status: 409 });
  return NextResponse.json({ request: updated });
}
