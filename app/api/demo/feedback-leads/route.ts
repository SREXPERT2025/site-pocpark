import { NextRequest, NextResponse } from 'next/server';
import {
  DEMO_FEEDBACK_CHANNELS,
  type DemoFeedbackChannel,
} from '@/app/lib/demo-feedback-consent';
import { createDemoFeedbackLead } from '@/app/lib/demo-feedback-lead-store';
import { readDemoSession } from '@/app/lib/demo-session';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

function responseError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

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

export async function POST(request: NextRequest) {
  const sessionId = readDemoSession(request);
  if (!sessionId) {
    return responseError('Сначала войдите в demo-кабинет.', 'UNAUTHORIZED', 401);
  }

  if (isRateLimited(sessionId)) {
    return responseError(
      'Слишком много попыток. Повторите через минуту.',
      'RATE_LIMITED',
      429,
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    requestId?: unknown;
    channel?: unknown;
    consent?: unknown;
  } | null;

  if (payload?.consent !== true) {
    return responseError(
      'Для сохранения контакта требуется отдельное согласие.',
      'CONSENT_REQUIRED',
      400,
    );
  }

  const requestId = typeof payload.requestId === 'string'
    ? payload.requestId.trim().toUpperCase()
    : '';
  const channel = typeof payload.channel === 'string'
    ? payload.channel.trim().toLowerCase()
    : '';

  if (
    !/^[A-F0-9]{16}$/.test(requestId) ||
    !DEMO_FEEDBACK_CHANNELS.includes(channel as DemoFeedbackChannel)
  ) {
    return responseError('Проверьте данные demo-заявки.', 'INVALID_REQUEST', 400);
  }

  try {
    const result = createDemoFeedbackLead(
      sessionId,
      requestId,
      channel as DemoFeedbackChannel,
    );
    if (!result) {
      return responseError(
        'Demo-заявка не найдена или недоступна в текущей сессии.',
        'REQUEST_NOT_FOUND',
        404,
      );
    }
    return NextResponse.json(
      { ok: true, created: result.created, expiresAt: result.expiresAt },
      { status: result.created ? 201 : 200 },
    );
  } catch {
    return responseError(
      'Не удалось сохранить контакт для обратной связи.',
      'INTERNAL_ERROR',
      500,
    );
  }
}
