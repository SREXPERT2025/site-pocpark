import { NextResponse } from 'next/server';
import {
  aiWidgetHandoffMode,
  aiWidgetOriginAllowed,
  aiWidgetPilotEnabled,
} from '@/app/lib/ai-widget-pilot';
import {
  getAiWidgetSession,
  registerAiWidgetTestLead,
} from '@/app/lib/ai-widget-log-core';
import {
  aiWidgetLoggingEnabled,
  getAiWidgetLogDatabase,
} from '@/app/lib/ai-widget-log-database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_PER_ADDRESS = 10;
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

function clientAddress(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
  );
}

function rateAllowed(key: string, now = Date.now()) {
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT_PER_ADDRESS) return false;
  current.count += 1;
  return true;
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, code, message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

function cleanText(value: unknown, maximum: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\0/g, '').trim();
  if (!normalized || normalized.length > maximum) return null;
  return normalized;
}

function validIdentifier(value: string | null) {
  return Boolean(
    value
    && /^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(value),
  );
}

export async function POST(request: Request) {
  if (
    !aiWidgetPilotEnabled()
    || aiWidgetHandoffMode() !== 'test'
  ) {
    return jsonError(404, 'NOT_FOUND', 'Страница не найдена.');
  }
  if (!aiWidgetOriginAllowed(request.headers.get('origin'), request.url)) {
    return jsonError(403, 'ORIGIN_DENIED', 'Запрос отклонён.');
  }
  if (!aiWidgetLoggingEnabled()) {
    return jsonError(
      503,
      'TEST_LOG_UNAVAILABLE',
      'Тестовая заявка временно недоступна.',
    );
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) {
    return jsonError(413, 'PAYLOAD_TOO_LARGE', 'Данные слишком большие.');
  }
  if (!rateAllowed(clientAddress(request))) {
    return jsonError(
      429,
      'RATE_LIMITED',
      'Лимит тестовых заявок исчерпан.',
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body || Array.isArray(body)) {
    return jsonError(400, 'INVALID_BODY', 'Проверьте данные заявки.');
  }
  const sessionId = cleanText(body.sessionId, 128);
  const submissionId = cleanText(body.submissionId, 128);
  const sourcePage = cleanText(body.sourcePage, 240);
  const name = cleanText(body.name, 120);
  const contact = cleanText(body.contact, 160);
  const objectDescription = cleanText(body.objectDescription, 240);
  const taskDescription = cleanText(body.taskDescription, 800);
  const consent = body.consent === true;

  if (
    !validIdentifier(sessionId)
    || !validIdentifier(submissionId)
    || !sourcePage?.startsWith('/')
    || sourcePage.startsWith('//')
    || !name
    || !contact
    || !objectDescription
    || !taskDescription
    || !consent
  ) {
    return jsonError(400, 'INVALID_LEAD', 'Заполните все поля заявки.');
  }

  try {
    const db = getAiWidgetLogDatabase();
    const session = getAiWidgetSession(db, sessionId as string);
    if (!session || session.turns.length === 0) {
      return jsonError(
        409,
        'DIALOGUE_REQUIRED',
        'Сначала задайте вопрос AI-консультанту.',
      );
    }
    const registered = registerAiWidgetTestLead(db, {
      sessionId: sessionId as string,
      submissionId: submissionId as string,
      sourcePage,
      name,
      contact,
      objectDescription,
      taskDescription,
      consent,
      consentVersion: 'ai-widget-test-synthetic-v1',
    });
    return NextResponse.json(
      {
        success: true,
        mode: 'test',
        created: registered.created,
        publicId: registered.publicId,
        maxPreview: registered.maxPreview,
        deliveredToMax: false,
        registeredInProduction: false,
      },
      {
        status: registered.created ? 201 : 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'TEST_LEAD_IDEMPOTENCY_CONFLICT') {
      return jsonError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'Повторите создание тестовой заявки.',
      );
    }
    return jsonError(
      500,
      'TEST_LEAD_FAILED',
      'Не удалось сохранить тестовую заявку.',
    );
  }
}
