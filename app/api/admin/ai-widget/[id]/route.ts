import { NextRequest } from 'next/server';
import {
  leadAdminJson,
  requireLeadAdmin,
} from '@/app/lib/lead-admin-api';
import { deleteAiWidgetSession } from '@/app/lib/ai-widget-log-core';
import {
  aiWidgetLoggingEnabled,
  getAiWidgetLogDatabase,
} from '@/app/lib/ai-widget-log-database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireLeadAdmin(
    request,
    'delete',
    { requireSameOrigin: true },
  );
  if ('response' in auth) return auth.response;
  if (!aiWidgetLoggingEnabled()) {
    return leadAdminJson(
      { error: 'Журнал виджета отключён.', code: 'WIDGET_LOG_DISABLED' },
      { status: 404 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    confirmation?: unknown;
  } | null;
  if (body?.confirmation !== params.id) {
    return leadAdminJson(
      { error: 'Удаление не подтверждено.', code: 'CONFIRMATION_REQUIRED' },
      { status: 400 },
    );
  }
  const deleted = deleteAiWidgetSession(
    getAiWidgetLogDatabase(),
    params.id,
  );
  return deleted
    ? leadAdminJson({ ok: true })
    : leadAdminJson(
        { error: 'Диалог не найден.', code: 'DIALOGUE_NOT_FOUND' },
        { status: 404 },
      );
}
