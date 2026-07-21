import { NextRequest, NextResponse } from 'next/server';
import {
  applyDemoWebDiscount,
  DemoParkingStoreError,
  listDemoWebDiscounts,
  MAX_DEMO_PAGE_SIZE,
} from '@/app/lib/demo-parking-store';
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
  const pageSize = positiveInteger(request.nextUrl.searchParams.get('pageSize'), 20, MAX_DEMO_PAGE_SIZE);
  if (!page || !pageSize) {
    return NextResponse.json({ error: `page и pageSize должны быть положительными числами; pageSize не более ${MAX_DEMO_PAGE_SIZE}.`, code: 'INVALID_REQUEST' }, { status: 400 });
  }
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() ?? '';
  if (tenantId.length > 100) {
    return NextResponse.json({ error: 'Слишком длинный идентификатор арендатора.', code: 'INVALID_REQUEST' }, { status: 400 });
  }
  try {
    return NextResponse.json(listDemoWebDiscounts(sessionId, {
      tenantId: tenantId || undefined,
      page,
      pageSize,
    }));
  } catch {
    return NextResponse.json({ error: 'Не удалось получить WEB-скидки.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionId = readDemoSession(request);
  if (!sessionId) return unauthorized();
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Некорректный JSON.', code: 'INVALID_REQUEST' }, { status: 400 });
  }
  const parkingSessionId = typeof payload.parkingSessionId === 'string' ? payload.parkingSessionId.trim() : '';
  if (!parkingSessionId || parkingSessionId.length > 100) {
    return NextResponse.json({ error: 'Укажите корректную парковочную сессию.', code: 'INVALID_REQUEST' }, { status: 400 });
  }
  if (payload.comment !== undefined && typeof payload.comment !== 'string') {
    return NextResponse.json({ error: 'Комментарий должен быть строкой.', code: 'INVALID_REQUEST' }, { status: 400 });
  }
  const comment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
  if (comment.length > 300) {
    return NextResponse.json({ error: 'Комментарий не должен превышать 300 символов.', code: 'INVALID_REQUEST' }, { status: 400 });
  }

  try {
    const discount = applyDemoWebDiscount(sessionId, parkingSessionId, comment);
    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    if (error instanceof DemoParkingStoreError) {
      const status = error.code === 'not_found' ? 404 : 409;
      const code = error.code === 'not_found'
        ? 'PARKING_SESSION_NOT_FOUND'
        : error.code === 'session_completed'
          ? 'SESSION_ALREADY_COMPLETED'
          : 'DISCOUNT_ALREADY_APPLIED';
      return NextResponse.json({ error: error.message, code }, { status });
    }
    return NextResponse.json({ error: 'Не удалось применить WEB-скидку.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
