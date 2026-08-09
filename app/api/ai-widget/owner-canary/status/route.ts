import {
  cookieValue,
  OWNER_AI_CANARY_COOKIE,
  OWNER_AI_CANARY_MARKER,
  ownerAiCanaryEnabled,
  selectOwnerCanaryAudience,
} from '@/app/lib/owner-ai-canary-core';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
} from '@/app/lib/owner-ai-canary-adapter';
import {
  ownerCanarySessionRevoked,
  runOwnerAiCanaryMigrations,
} from '@/app/lib/owner-ai-canary-state';
import { getAiWidgetLogDatabase } from '@/app/lib/ai-widget-log-database';
import {
  ownerCanaryOriginFailureStatus,
  validateOwnerCanaryOrigin,
} from '@/app/lib/owner-canary-origin';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function response(value: Record<string, unknown>, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(request: Request) {
  const originDecision = validateOwnerCanaryOrigin({
    headers: request.headers,
  });
  if (!originDecision.allowed) {
    return response({
      enabled: ownerAiCanaryEnabled(),
      audience: 'legacy',
      route: 'legacy',
      code: originDecision.reason,
    }, ownerCanaryOriginFailureStatus(originDecision.reason));
  }

  if (!ownerAiCanaryEnabled()) {
    return response({ enabled: false, audience: 'legacy', route: 'legacy' });
  }

  const token = cookieValue(
    request.headers.get('cookie'),
    OWNER_AI_CANARY_COOKIE,
  );
  if (!token) {
    return response({ enabled: true, audience: 'legacy', route: 'legacy' });
  }

  try {
    const db = getAiWidgetLogDatabase();
    runOwnerAiCanaryMigrations(db);
    const selected = selectOwnerCanaryAudience({
      cookieToken: token,
      isRevoked: (jti) => ownerCanarySessionRevoked(db, jti),
    });
    if (selected.audience !== 'owner_canary') {
      return response({
        enabled: true,
        audience: 'legacy',
        route: 'legacy',
        code: 'OWNER_AUTH_DENIED',
      }, 401);
    }
    return response({
      enabled: true,
      audience: 'owner_canary',
      route: 'ai_core',
      runtimeSha: AI_CORE_RUNTIME_SHA,
      contractSha: AI_CORE_CONTRACT_SHA,
      marker: `${OWNER_AI_CANARY_MARKER} · Qwen · Runtime ${AI_CORE_RUNTIME_SHA.slice(0, 7)}`,
    });
  } catch {
    return response({
      enabled: true,
      audience: 'legacy',
      route: 'legacy',
      code: 'OWNER_CANARY_STATE_UNAVAILABLE',
    }, 503);
  }
}
