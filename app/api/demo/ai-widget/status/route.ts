import { NextResponse } from 'next/server';
import { aiWidgetPilotEnabled } from '@/app/lib/ai-widget-pilot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { enabled: aiWidgetPilotEnabled() },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
