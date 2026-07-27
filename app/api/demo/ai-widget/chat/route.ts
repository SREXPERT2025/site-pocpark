import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  aiWidgetOriginAllowed,
  aiWidgetPilotEnabled,
  requireLoopbackGatewayUrl,
  validateAiWidgetChatPayload,
} from '@/app/lib/ai-widget-pilot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

function clientAddress(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
  );
}

function rateAllowed(key: string, now = Date.now()): boolean {
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
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

export async function POST(request: Request) {
  if (!aiWidgetPilotEnabled()) {
    return jsonError(404, 'NOT_FOUND', 'Страница не найдена.');
  }
  if (
    !aiWidgetOriginAllowed(
      request.headers.get('origin'),
      request.url,
    )
  ) {
    return jsonError(403, 'ORIGIN_DENIED', 'Запрос отклонён.');
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 32_000) {
    return jsonError(413, 'PAYLOAD_TOO_LARGE', 'Сообщение слишком большое.');
  }
  if (!rateAllowed(clientAddress(request))) {
    return jsonError(
      429,
      'RATE_LIMITED',
      'Слишком много сообщений. Попробуйте через минуту.',
    );
  }
  const parsed = validateAiWidgetChatPayload(
    await request.json().catch(() => null),
  );
  if ('code' in parsed) {
    return jsonError(400, parsed.code, 'Проверьте текст сообщения.');
  }

  let gatewayUrl: string;
  try {
    gatewayUrl = requireLoopbackGatewayUrl(process.env.AI_WIDGET_GATEWAY_URL);
  } catch {
    return jsonError(
      503,
      'PILOT_UNAVAILABLE',
      'AI-консультант временно недоступен.',
    );
  }
  const gatewaySecret = process.env.AI_WIDGET_GATEWAY_SECRET;
  if (!gatewaySecret || gatewaySecret.length < 32) {
    return jsonError(
      503,
      'PILOT_UNAVAILABLE',
      'AI-консультант временно недоступен.',
    );
  }

  const requestId = randomUUID();
  try {
    const upstream = await fetch(`${gatewayUrl}/v1/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gatewaySecret}`,
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(parsed.payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    });
    if (!upstream.ok || !upstream.body) {
      return jsonError(
        502,
        'GATEWAY_ERROR',
        'Не удалось получить ответ. Попробуйте ещё раз.',
      );
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': requestId,
      },
    });
  } catch {
    return jsonError(
      504,
      'GATEWAY_TIMEOUT',
      'Ответ занял слишком много времени. Попробуйте ещё раз.',
    );
  }
}
