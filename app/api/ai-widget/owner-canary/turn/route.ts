import {
  failAiWidgetTurn,
  getAiWidgetTurn,
} from '@/app/lib/ai-widget-log-core';
import {
  aiWidgetLoggingEnabled,
  getAiWidgetLogDatabase,
} from '@/app/lib/ai-widget-log-database';
import {
  cookieValue,
  OWNER_AI_CANARY_COOKIE,
  ownerCanaryAuthEnabled,
  selectOwnerCanaryAudience,
} from '@/app/lib/owner-ai-canary-core';
import {
  ownerCanarySessionRevoked,
  runOwnerAiCanaryMigrations,
} from '@/app/lib/owner-ai-canary-state';
import {
  ownerCanaryOriginFailureStatus,
  validateOwnerCanaryOrigin,
} from '@/app/lib/owner-canary-origin';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STALE_PENDING_MS = 330_000;

function response(value: Record<string, unknown>, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: Request) {
  const originDecision = validateOwnerCanaryOrigin({
    headers: request.headers,
  });
  if (!originDecision.allowed) {
    return response(
      { success: false, status: 'error', code: originDecision.reason },
      ownerCanaryOriginFailureStatus(originDecision.reason),
    );
  }
  if (!ownerCanaryAuthEnabled() || !aiWidgetLoggingEnabled()) {
    return response(
      { success: false, status: 'error', code: 'OWNER_RECOVERY_DISABLED' },
      404,
    );
  }
  const token = cookieValue(
    request.headers.get('cookie'),
    OWNER_AI_CANARY_COOKIE,
  );
  if (!token) {
    return response(
      { success: false, status: 'error', code: 'OWNER_AUTH_REQUIRED' },
      401,
    );
  }

  const body = await request.json().catch(() => null) as {
    sessionId?: unknown;
    turnId?: unknown;
  } | null;
  if (
    typeof body?.sessionId !== 'string'
    || typeof body.turnId !== 'string'
  ) {
    return response(
      { success: false, status: 'error', code: 'INVALID_RECOVERY_REQUEST' },
      400,
    );
  }

  try {
    const db = getAiWidgetLogDatabase();
    runOwnerAiCanaryMigrations(db);
    const selected = selectOwnerCanaryAudience({
      cookieToken: token,
      isRevoked: (jti) => ownerCanarySessionRevoked(db, jti),
    });
    if (selected.audience !== 'owner_canary') {
      return response(
        { success: false, status: 'error', code: 'OWNER_AUTH_DENIED' },
        401,
      );
    }
    let turn = getAiWidgetTurn(db, body.turnId);
    if (!turn || turn.sessionId !== body.sessionId) {
      return response(
        { success: false, status: 'error', code: 'TURN_NOT_FOUND' },
        404,
      );
    }
    if (
      turn.status === 'pending'
      && Date.now() - Date.parse(turn.updatedAt) >= STALE_PENDING_MS
    ) {
      turn = failAiWidgetTurn(db, {
        turnId: turn.id,
        errorCode: 'OWNER_TURN_STALE_PENDING',
        elapsedMs: STALE_PENDING_MS,
      });
    }
    if (turn?.status === 'answered' && turn.assistantContent) {
      return response({
        success: true,
        status: 'answered',
        answer: turn.assistantContent,
        route: turn.route,
        elapsedMs: turn.elapsedMs,
      });
    }
    if (turn?.status === 'pending') {
      return response({ success: true, status: 'pending' });
    }
    return response({
      success: false,
      status: 'error',
      message: 'Не удалось получить ответ. Попробуйте отправить сообщение ещё раз.',
    });
  } catch {
    return response(
      { success: false, status: 'error', code: 'OWNER_RECOVERY_UNAVAILABLE' },
      503,
    );
  }
}
