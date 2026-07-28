import { NextResponse } from 'next/server';
import {
  aiWidgetHandoffMode,
  aiWidgetPilotEnabled,
} from '@/app/lib/ai-widget-pilot';
import { aiWidgetLoggingEnabled } from '@/app/lib/ai-widget-log-database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      enabled: aiWidgetPilotEnabled(),
      handoffMode: aiWidgetHandoffMode(),
      loggingEnabled: aiWidgetLoggingEnabled(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
