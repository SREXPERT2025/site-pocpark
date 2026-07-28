import { handleAiWidgetChat } from '@/app/lib/ai-widget-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleAiWidgetChat(request);
}
