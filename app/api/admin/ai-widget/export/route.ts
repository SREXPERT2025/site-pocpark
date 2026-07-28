import { NextRequest } from 'next/server';
import { requireLeadAdmin } from '@/app/lib/lead-admin-api';
import {
  buildAiWidgetTurnsCsv,
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
  const auth = requireLeadAdmin(request, 'export');
  if ('response' in auth) return auth.response;
  if (!aiWidgetLoggingEnabled()) {
    return new Response('Журнал виджета отключён.', { status: 404 });
  }
  const db = getAiWidgetLogDatabase();
  const summaries = listAiWidgetSessions(db, { limit: 100 }).items;
  const sessions = summaries
    .map((item) => getAiWidgetSession(db, item.id))
    .filter(Boolean);
  const csv = buildAiWidgetTurnsCsv(
    sessions as NonNullable<(typeof sessions)[number]>[],
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition':
        `attachment; filename="rospark-ai-widget-${date}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
