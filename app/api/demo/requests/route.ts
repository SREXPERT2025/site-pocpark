import { NextRequest, NextResponse } from 'next/server';
import { createDemoRequest, listDemoRequests, type DemoRequestType } from '@/app/lib/demo-request-store';
import { readDemoSession } from '@/app/lib/demo-session';

function unauthorized() {
  return NextResponse.json({ error: 'Сначала войдите в demo-кабинет.' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const sessionId = readDemoSession(request);
  if (!sessionId) return unauthorized();
  return NextResponse.json({ requests: listDemoRequests(sessionId) });
}

export async function POST(request: NextRequest) {
  const sessionId = readDemoSession(request);
  if (!sessionId) return unauthorized();
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const guestName = typeof payload?.guestName === 'string' ? payload.guestName.trim().slice(0, 100) : '';
  const phone = typeof payload?.phone === 'string' ? payload.phone.replace(/\D/g, '') : '';
  const vehicleNumber = typeof payload?.vehicleNumber === 'string'
    ? payload.vehicleNumber.toUpperCase().replace(/\s+/g, '').slice(0, 16)
    : '';
  const note = typeof payload?.note === 'string' ? payload.note.trim().slice(0, 300) : '';
  const requestType: DemoRequestType = payload?.requestType === 'multiple' ? 'multiple' : 'single';
  const validFrom = typeof payload?.validFrom === 'string' ? new Date(payload.validFrom) : new Date('invalid');
  const validUntil = typeof payload?.validUntil === 'string' ? new Date(payload.validUntil) : new Date('invalid');
  if (
    !guestName || !/^7\d{10}$/.test(phone) || vehicleNumber.length < 6 ||
    Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime()) || validUntil <= validFrom
  ) {
    return NextResponse.json({ error: 'Проверьте имя, телефон, номер автомобиля и период заявки.' }, { status: 400 });
  }
  const created = createDemoRequest(sessionId, {
    guestName,
    phone,
    vehicleNumber,
    note,
    requestType,
    validFrom: validFrom.toISOString(),
    validUntil: validUntil.toISOString(),
  });
  return NextResponse.json({ request: created }, { status: 201 });
}
