export const AI_WIDGET_BROWSER_HISTORY_VERSION = 1;
const AI_WIDGET_BROWSER_HISTORY_PREFIX = 'rospark_ai_widget_history_v1:';
const AI_WIDGET_BROWSER_HISTORY_LIMIT = 20;

export type StoredAiWidgetMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelVisible?: boolean;
};

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function aiWidgetBrowserHistoryKey(sessionId: string) {
  return `${AI_WIDGET_BROWSER_HISTORY_PREFIX}${sessionId}`;
}

function validMessage(value: unknown): value is StoredAiWidgetMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === 'string'
    && message.id.length >= 1
    && message.id.length <= 128
    && (message.role === 'user' || message.role === 'assistant')
    && typeof message.content === 'string'
    && message.content.trim().length >= 1
    && message.content.length <= 4_000
    && (
      message.modelVisible === undefined
      || typeof message.modelVisible === 'boolean'
    )
  );
}

export function readAiWidgetBrowserHistory(
  storage: SessionStorageLike,
  sessionId: string,
) {
  try {
    const raw = storage.getItem(aiWidgetBrowserHistoryKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      messages?: unknown;
    };
    if (
      parsed.version !== AI_WIDGET_BROWSER_HISTORY_VERSION
      || !Array.isArray(parsed.messages)
    ) return [];
    return parsed.messages
      .filter(validMessage)
      .slice(-AI_WIDGET_BROWSER_HISTORY_LIMIT)
      .map((message) => ({ ...message, content: message.content.trim() }));
  } catch {
    return [];
  }
}

export function writeAiWidgetBrowserHistory(
  storage: SessionStorageLike,
  sessionId: string,
  messages: StoredAiWidgetMessage[],
) {
  const safeMessages = messages
    .filter(validMessage)
    .slice(-AI_WIDGET_BROWSER_HISTORY_LIMIT)
    .map((message) => ({ ...message, content: message.content.trim() }));
  storage.setItem(
    aiWidgetBrowserHistoryKey(sessionId),
    JSON.stringify({
      version: AI_WIDGET_BROWSER_HISTORY_VERSION,
      messages: safeMessages,
    }),
  );
}

export function clearAiWidgetBrowserHistory(
  storage: SessionStorageLike,
  sessionId: string,
) {
  storage.removeItem(aiWidgetBrowserHistoryKey(sessionId));
}
