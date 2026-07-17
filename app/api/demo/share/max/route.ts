import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  if (process.env.DEMO_MAX_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Серверная отправка MAX отключена.' }, { status: 503 });
  }

  const apiUrl = process.env.GREEN_API_API_URL;
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;
  if (!apiUrl || !idInstance || !apiTokenInstance) {
    return NextResponse.json({ error: 'Интеграция MAX не настроена.' }, { status: 503 });
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientKey = forwardedFor || request.headers.get('x-real-ip') || 'local';
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ error: 'Слишком много попыток. Повторите через минуту.' }, { status: 429 });
  }

  const payload = (await request.json().catch(() => null)) as { phone?: unknown; message?: unknown } | null;
  const phone = typeof payload?.phone === 'string' ? payload.phone.replace(/\D/g, '') : '';
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  if (!/^7\d{10}$/.test(phone) || !message || message.length > 1000) {
    return NextResponse.json({ error: 'Некорректный телефон или текст сообщения.' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${normalizeApiUrl(apiUrl)}/waInstance${encodeURIComponent(idInstance)}/sendMessage/${encodeURIComponent(apiTokenInstance)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      return NextResponse.json({ error: 'MAX-провайдер отклонил отправку.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'MAX-провайдер временно недоступен.' }, { status: 502 });
  }
}
