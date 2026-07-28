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
    return session
      ? leadAdminJson({
          session,
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
