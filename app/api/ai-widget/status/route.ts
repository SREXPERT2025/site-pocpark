import { handleAiWidgetStatus } from '@/app/lib/ai-widget-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handleAiWidgetStatus();
}
