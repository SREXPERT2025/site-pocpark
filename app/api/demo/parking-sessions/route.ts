import { NextRequest, NextResponse } from 'next/server';
import {
  listDemoParkingSessions,
  MAX_DEMO_PAGE_SIZE,
} from '@/app/lib/demo-parking-store';
import type { DemoParkingSessionStatus } from '@/app/lib/demo-domain';
import { readDemoSession } from '@/app/lib/demo-session';

function unauthorized() {
  return NextResponse.json({ error: 'Сначала войдите в demo-кабинет.', code: 'UNAUTHORIZED' }, { status: 401 });
}

function positiveInteger(value: string | null, fallback: number, maximum?: number) {
  if (value === null || value === '') return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum && parsed > maximum)) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const sessionId = readDemoSession(request);
  if (!sessionId) return unauthorized();

  const page = positiveInteger(request.nextUrl.searchParams.get('page'), 1);
  const pageSize = positiveInteger(request.nextUrl.searchParams.get('pageSize'), 12, MAX_DEMO_PAGE_SIZE);
  if (!page || !pageSize) {
    return NextResponse.json({ error: `page и pageSize должны быть положительными числами; pageSize не более ${MAX_DEMO_PAGE_SIZE}.`, code: 'INVALID_REQUEST' }, { status: 400 });
  }

  const ticket = request.nextUrl.searchParams.get('ticket')?.trim() ?? '';
  const vehicle = request.nextUrl.searchParams.get('vehicle')?.trim() ?? '';
  if (ticket.length > 64 || vehicle.length > 32) {
    return NextResponse.json({ error: 'Слишком длинный поисковый запрос.', code: 'INVALID_REQUEST' }, { status: 400 });
  }
  const statusValue = request.nextUrl.searchParams.get('status')?.trim() ?? '';
  if (statusValue && statusValue !== 'active' && statusValue !== 'completed') {
    return NextResponse.json({ error: 'Неизвестный статус парковочной сессии.', code: 'INVALID_REQUEST' }, { status: 400 });
  }

  try {
    return NextResponse.json(listDemoParkingSessions(sessionId, {
      ticket: ticket || undefined,
      vehicle: vehicle || undefined,
      status: (statusValue || undefined) as DemoParkingSessionStatus | undefined,
      page,
      pageSize,
    }));
  } catch {
    return NextResponse.json({ error: 'Не удалось получить demo-парковочные сессии.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
