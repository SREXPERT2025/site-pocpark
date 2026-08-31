import { handleAiWidgetChat } from '@/app/lib/ai-widget-api';
import {
  acceptsAiWidgetProgressStream,
  streamAiWidgetChatResponse,
} from '@/app/lib/ai-widget-response-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = handleAiWidgetChat(request);
  return acceptsAiWidgetProgressStream(request)
    ? streamAiWidgetChatResponse(response)
    : response;
}
