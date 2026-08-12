import { NextRequest } from 'next/server';
import {
  leadAdminJson,
  requireLeadAdmin,
} from '@/app/lib/lead-admin-api';
import {
  getAiWidgetSession,
  listAiWidgetSessions,
} from '@/app/lib/ai-widget-log-core';
import {
  aiWidgetLoggingEnabled,
  getAiWidgetLogDatabase,
} from '@/app/lib/ai-widget-log-database';
import { listAiTraceSummariesByTurnIds } from '@/app/lib/ai-trace-core';
import { leadAdminRoleHasPermission } from '@/app/lib/lead-admin-auth-core';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = requireLeadAdmin(request, 'view');
  if ('response' in auth) return auth.response;
  if (!aiWidgetLoggingEnabled()) {
    return leadAdminJson(
      { error: 'Журнал виджета отключён.', code: 'WIDGET_LOG_DISABLED' },
      { status: 404 },
    );
  }
  const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim();
  const db = getAiWidgetLogDatabase();
  if (sessionId) {
    const session = getAiWidgetSession(db, sessionId);
    let traceStorageAvailable = true;
    let summaries = new Map();
    if (session && leadAdminRoleHasPermission(auth.session.role, 'trace')) {
      try {
        summaries = listAiTraceSummariesByTurnIds(
          db,
          session.turns.map((turn) => turn.id),
        );
      } catch {
        traceStorageAvailable = false;
      }
    }
    return session
      ? leadAdminJson({
          session: {
            ...session,
            traceStorageAvailable,
            turns: session.turns.map((turn) => ({
              ...turn,
              traceSummary: summaries.get(turn.id) ?? null,
            })),
          },
          viewer: {
            displayName: auth.session.displayName,
            role: auth.session.role,
          },
        })
      : leadAdminJson(
          { error: 'Диалог не найден.', code: 'DIALOGUE_NOT_FOUND' },
          { status: 404 },
        );
  }
  return leadAdminJson({
    ...listAiWidgetSessions(db),
    viewer: {
      displayName: auth.session.displayName,
      role: auth.session.role,
    },
  });
}
