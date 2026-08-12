import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import {
  leadAdminJson,
  requireLeadAdmin,
} from '@/app/lib/lead-admin-api';
import {
  AI_TRACE_ANNOTATION_CATEGORIES,
  addAiTraceAnnotation,
  getAiCoreTurnTrace,
  type AiTraceAnnotationCategory,
} from '@/app/lib/ai-trace-core';
import { getAiWidgetLogDatabase } from '@/app/lib/ai-widget-log-database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ turnId: string }> },
) {
  const auth = requireLeadAdmin(request, 'trace');
  if ('response' in auth) return auth.response;
  const { turnId } = await context.params;
  const result = getAiCoreTurnTrace(
    getAiWidgetLogDatabase(),
    decodeURIComponent(turnId),
  );
  if (!result) {
    return leadAdminJson(
      { error: 'Trace не найден.', code: 'AI_TRACE_NOT_FOUND' },
      { status: 404 },
    );
  }
  return leadAdminJson({
    ...result,
    retention: {
      fullPayloadDays: 14,
      aggregateMetadataDays: 90,
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ turnId: string }> },
) {
  const auth = requireLeadAdmin(request, 'trace', { requireSameOrigin: true });
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null) as
    | Record<string, unknown> | null;
  const category = typeof body?.category === 'string'
    ? body.category as AiTraceAnnotationCategory : null;
  const note = typeof body?.note === 'string' ? body.note : null;
  if (!category || !AI_TRACE_ANNOTATION_CATEGORIES.includes(category)) {
    return leadAdminJson(
      { error: 'Некорректная категория.', code: 'INVALID_CATEGORY' },
      { status: 400 },
    );
  }
  const { turnId } = await context.params;
  try {
    addAiTraceAnnotation(getAiWidgetLogDatabase(), {
      annotationId: `annotation:${randomUUID()}`,
      turnId: decodeURIComponent(turnId),
      category,
      note,
      authorUserId: `admin:${auth.session.userId}`,
    });
    return leadAdminJson({ success: true }, { status: 201 });
  } catch {
    return leadAdminJson(
      { error: 'Не удалось сохранить отметку.', code: 'ANNOTATION_FAILED' },
      { status: 409 },
    );
  }
}
