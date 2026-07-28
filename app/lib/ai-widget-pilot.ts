export const AI_WIDGET_MAX_MESSAGE_LENGTH = 1_200;
export const AI_WIDGET_MAX_HISTORY_ITEMS = 12;
export const AI_WIDGET_MAX_HISTORY_MESSAGE_LENGTH = 2_000;

export type AiWidgetChatRole = 'user' | 'assistant';

export type AiWidgetChatMessage = {
  role: AiWidgetChatRole;
  content: string;
};

export type AiWidgetChatPayload = {
  sessionId: string;
  turnId: string;
  sourcePage: string;
  messages: AiWidgetChatMessage[];
};

export type AiWidgetValidationResult =
  | { ok: true; payload: AiWidgetChatPayload }
  | { ok: false; code: string };

export type AiWidgetRuntimeMode = 'preview' | 'production';

export function aiWidgetRuntimeMode(
  env: NodeJS.ProcessEnv = process.env,
): AiWidgetRuntimeMode {
  return env.AI_WIDGET_RUNTIME_MODE === 'production'
    ? 'production'
    : 'preview';
}

export function aiWidgetEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AI_WIDGET_ENABLED === 'true'
    || env.AI_WIDGET_PILOT_ENABLED === 'true'
  );
}

export function aiWidgetPilotEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return aiWidgetEnabled(env);
}

export type AiWidgetHandoffMode = 'off' | 'test' | 'live';

export function aiWidgetHandoffMode(
  env: NodeJS.ProcessEnv = process.env,
): AiWidgetHandoffMode {
  const configured = env.AI_WIDGET_HANDOFF_MODE;
  const runtimeMode = aiWidgetRuntimeMode(env);
  if (runtimeMode === 'production') {
    return configured === 'live' ? 'live' : 'off';
  }
  return configured === 'test' ? 'test' : 'off';
}

export function requireLoopbackGatewayUrl(value: string | undefined): string {
  if (!value) throw new Error('AI_WIDGET_GATEWAY_URL_MISSING');
  const url = new URL(value);
  if (
    url.protocol !== 'http:'
    || !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error('AI_WIDGET_GATEWAY_URL_NOT_LOOPBACK');
  }
  return url.toString().replace(/\/$/, '');
}

export function requireAiWidgetGatewayUrl(
  value: string | undefined,
  runtimeMode: AiWidgetRuntimeMode,
): string {
  if (runtimeMode === 'preview') {
    return requireLoopbackGatewayUrl(value);
  }
  if (!value) throw new Error('AI_WIDGET_GATEWAY_URL_MISSING');
  const url = new URL(value);
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname.includes('..')
  ) {
    throw new Error('AI_WIDGET_GATEWAY_URL_NOT_PRODUCTION_HTTPS');
  }
  return url.toString().replace(/\/$/, '');
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\u0000/g, '').trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

export function validateAiWidgetChatPayload(
  value: unknown,
): AiWidgetValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, code: 'INVALID_BODY' };
  }
  const body = value as Record<string, unknown>;
  const sessionId = cleanText(body.sessionId, 128);
  const turnId = cleanText(body.turnId, 128);
  if (
    !sessionId
    || !turnId
    || !/^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(sessionId)
    || !/^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(turnId)
  ) {
    return { ok: false, code: 'INVALID_SESSION' };
  }
  const sourcePage = cleanText(body.sourcePage, 240);
  if (!sourcePage || !sourcePage.startsWith('/') || sourcePage.startsWith('//')) {
    return { ok: false, code: 'INVALID_SOURCE_PAGE' };
  }
  if (
    !Array.isArray(body.messages)
    || body.messages.length < 1
    || body.messages.length > AI_WIDGET_MAX_HISTORY_ITEMS
  ) {
    return { ok: false, code: 'INVALID_MESSAGES' };
  }
  const messages: AiWidgetChatMessage[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, code: 'INVALID_MESSAGE' };
    }
    const message = item as Record<string, unknown>;
    if (message.role !== 'user' && message.role !== 'assistant') {
      return { ok: false, code: 'INVALID_ROLE' };
    }
    const maxLength = message.role === 'user'
      ? AI_WIDGET_MAX_MESSAGE_LENGTH
      : AI_WIDGET_MAX_HISTORY_MESSAGE_LENGTH;
    const content = cleanText(message.content, maxLength);
    if (!content) return { ok: false, code: 'INVALID_CONTENT' };
    messages.push({ role: message.role, content });
  }
  if (messages.at(-1)?.role !== 'user') {
    return { ok: false, code: 'LAST_MESSAGE_MUST_BE_USER' };
  }
  return {
    ok: true,
    payload: {
      sessionId,
      turnId,
      sourcePage,
      messages,
    },
  };
}

export function allowedAiWidgetOrigins(
  requestUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): Set<string> {
  const values = new Set<string>();
  const configured = [
    env.NEXT_PUBLIC_SITE_URL,
    ...(env.AI_WIDGET_ALLOWED_ORIGINS || '').split(','),
    ...(env.AI_WIDGET_PILOT_ORIGINS || '').split(','),
  ];
  for (const candidate of configured) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      values.add(new URL(value).origin);
    } catch {
      // Invalid optional origin is ignored; no broad wildcard is introduced.
    }
  }
  if (aiWidgetRuntimeMode(env) === 'preview') {
    values.add(new URL(requestUrl).origin);
  }
  return values;
}

export function aiWidgetOriginAllowed(
  origin: string | null,
  requestUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!origin) return false;
  try {
    return allowedAiWidgetOrigins(requestUrl, env).has(
      new URL(origin).origin,
    );
  } catch {
    return false;
  }
}
