import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireLeadAdmin } from '@/app/lib/lead-admin-api';
import { getAiCoreTurnTrace } from '@/app/lib/ai-trace-core';
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
  if (!result?.trace) {
    return NextResponse.json(
      { error: 'Полный trace недоступен.', code: 'AI_TRACE_PAYLOAD_EXPIRED' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return new NextResponse(`${JSON.stringify(result.trace, null, 2)}\n`, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="ai-trace-${turnId}.json"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
