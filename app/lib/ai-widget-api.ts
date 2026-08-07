import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  aiWidgetEnabled,
  aiWidgetHandoffMode,
  aiWidgetOriginAllowed,
  aiWidgetRuntimeMode,
  requireAiWidgetGatewayUrl,
  validateAiWidgetChatPayload,
  type AiWidgetHandoffMode,
  type AiWidgetRuntimeMode,
} from './ai-widget-pilot';
import {
  beginAiWidgetTurn,
  completeAiWidgetTurn,
  consumeAiWidgetRateLimit,
  failAiWidgetTurn,
  getAiWidgetSession,
  registerAiWidgetProductionLead,
  registerAiWidgetTestLead,
} from './ai-widget-log-core';
import {
  aiWidgetLoggingEnabled,
  aiWidgetServerEventsEnabled,
  getAiWidgetLogDatabase,
} from './ai-widget-log-database';
import {
  tryRecordAiWidgetServerEvent,
  type AiWidgetServerEventName,
} from './ai-widget-server-events-core';
import {
  cookieValue,
  mapSiteIdentity,
  OWNER_AI_CANARY_COOKIE,
  OWNER_AI_CANARY_CONTRACT_VERSION,
  OWNER_AI_CANARY_MARKER,
  ownerAiCanaryEnabled,
  ownerCanaryPlaceholderDecision,
  selectOwnerCanaryAudience,
} from './owner-ai-canary-core';
import {
  ensureOwnerCanaryThread,
  ownerCanaryRequestId,
  ownerCanarySessionRevoked,
  registerOwnerCanaryMessage,
  runOwnerAiCanaryMigrations,
} from './owner-ai-canary-state';
import { LeadRegistryError } from './lead-registry-core';
import {
  leadRegistryEnabled,
  registerAiWidgetLead,
} from './lead-registry-service';

const CHAT_RATE_WINDOW_MS = 60_000;
const CHAT_RATE_LIMIT = 10;
const LEAD_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const LEAD_RATE_LIMIT = 10;
const memoryRateBuckets = new Map<
  string,
  { startedAt: number; count: number }
>();

const PRODUCTION_FALLBACK_ANSWER = [
  'Сейчас AI-консультант временно не может подготовить подробный ответ.',
  'Оставьте заявку — специалист РОСПАРК уточнит задачу и свяжется с вами.',
].join(' ');

function jsonError(
  status: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(
    { success: false, code, message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...extraHeaders,
      },
    },
  );
}

function clientAddress(request: Request): string {
  return (
    request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    || 'unknown'
  );
}

function addressHash(request: Request) {
  const salt = process.env.AI_WIDGET_RATE_LIMIT_SECRET
    || process.env.AI_WIDGET_GATEWAY_SECRET
    || 'rospark-ai-widget-preview';
  return createHash('sha256')
    .update(`${salt}\0${clientAddress(request)}`)
    .digest('hex');
}

function memoryRateAllowed(
  key: string,
  windowMs: number,
  limit: number,
  nowMs = Date.now(),
) {
  const current = memoryRateBuckets.get(key);
  if (!current || nowMs - current.startedAt >= windowMs) {
    memoryRateBuckets.set(key, { startedAt: nowMs, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function rateAllowed(
  request: Request,
  scope: 'chat' | 'lead',
  windowMs: number,
  limit: number,
) {
  const keyHash = addressHash(request);
  if (aiWidgetLoggingEnabled()) {
    return consumeAiWidgetRateLimit(getAiWidgetLogDatabase(), {
      scope,
      keyHash,
      windowMs,
      limit,
    }).allowed;
  }
  return memoryRateAllowed(`${scope}:${keyHash}`, windowMs, limit);
}

function configuredGateway(
  runtimeMode: AiWidgetRuntimeMode,
) {
  const url = requireAiWidgetGatewayUrl(
    process.env.AI_WIDGET_GATEWAY_URL,
    runtimeMode,
  );
  const secret = process.env.AI_WIDGET_GATEWAY_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('AI_WIDGET_GATEWAY_SECRET_INVALID');
  }
  return { url, secret };
}

function productionReady() {
  if (
    !aiWidgetEnabled()
    || aiWidgetRuntimeMode() !== 'production'
    || aiWidgetHandoffMode() !== 'live'
    || !aiWidgetLoggingEnabled()
    || !leadRegistryEnabled()
  ) {
    return false;
  }
  try {
    configuredGateway('production');
    return true;
  } catch {
    return false;
  }
}

function publicWidgetEnabled() {
  if (!aiWidgetEnabled()) return false;
  return aiWidgetRuntimeMode() === 'production'
    ? productionReady()
    : true;
}

function leadIntentHeaders(
  handoffMode: AiWidgetHandoffMode,
) {
  if (handoffMode === 'live') {
    return { 'X-AI-Widget-Lead-Intent': 'live' };
  }
  if (handoffMode === 'test') {
    return { 'X-AI-Widget-Lead-Intent': 'test' };
  }
  return {};
}

function textResponse(
  answer: string,
  input: {
    route: string;
    requestId: string;
    handoffMode: AiWidgetHandoffMode;
    templateId?: string | null;
    fallback?: boolean;
  },
) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-AI-Widget-Route': input.route,
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': input.requestId,
    ...leadIntentHeaders(input.handoffMode),
  };
  if (input.templateId) {
    headers['X-AI-Widget-Template-Id'] = input.templateId;
  }
  if (input.fallback) {
    headers['X-AI-Widget-Fallback'] = 'true';
  }
  return new Response(answer, { status: 200, headers });
}

export async function handleAiWidgetStatus() {
  const runtimeMode = aiWidgetRuntimeMode();
  return NextResponse.json(
    {
      enabled: publicWidgetEnabled(),
      runtimeMode,
      handoffMode: aiWidgetHandoffMode(),
      loggingEnabled: aiWidgetLoggingEnabled(),
      serverEventsEnabled: aiWidgetServerEventsEnabled(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

export async function handleAiWidgetChat(request: Request) {
  const startedAt = Date.now();
  const runtimeMode = aiWidgetRuntimeMode();
  const handoffMode = aiWidgetHandoffMode();
  if (!publicWidgetEnabled()) {
    return jsonError(404, 'NOT_FOUND', 'Страница не найдена.');
  }
  if (
    !aiWidgetOriginAllowed(
      request.headers.get('origin'),
      request.url,
    )
  ) {
    return jsonError(403, 'ORIGIN_DENIED', 'Запрос отклонён.');
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 32_000) {
    return jsonError(413, 'PAYLOAD_TOO_LARGE', 'Сообщение слишком большое.');
  }
  try {
    if (
      !rateAllowed(
        request,
        'chat',
        CHAT_RATE_WINDOW_MS,
        CHAT_RATE_LIMIT,
      )
    ) {
      return jsonError(
        429,
        'RATE_LIMITED',
        'Слишком много сообщений. Попробуйте через минуту.',
      );
    }
  } catch {
    return jsonError(
      503,
      'LOG_UNAVAILABLE',
      'AI-консультант временно недоступен.',
    );
  }

  const parsed = validateAiWidgetChatPayload(
    await request.json().catch(() => null),
  );
  if ('code' in parsed) {
    return jsonError(400, parsed.code, 'Проверьте текст сообщения.');
  }

  const requestId = randomUUID();
  const lastUserMessage = parsed.payload.messages.at(-1)?.content ?? '';
  let ownerAudience: 'legacy' | 'owner_canary' = 'legacy';
  let ownerIdentity: ReturnType<typeof mapSiteIdentity> | null = null;
  if (ownerAiCanaryEnabled()) {
    const token = cookieValue(
      request.headers.get('cookie'),
      OWNER_AI_CANARY_COOKIE,
    );
    if (token) {
      try {
        if (!aiWidgetLoggingEnabled()) {
          throw new Error('OWNER_CANARY_STATE_UNAVAILABLE');
        }
        const db = getAiWidgetLogDatabase();
        runOwnerAiCanaryMigrations(db);
        const selection = selectOwnerCanaryAudience({
          cookieToken: token,
          isRevoked: (jti) => ownerCanarySessionRevoked(db, jti),
        });
        ownerAudience = selection.audience;
        if (ownerAudience === 'owner_canary') {
          ownerIdentity = mapSiteIdentity({
            sessionId: parsed.payload.sessionId,
            turnId: parsed.payload.turnId,
          });
          ensureOwnerCanaryThread(db, {
            conversationThreadId: ownerIdentity.conversationThreadId,
            siteSessionId: ownerIdentity.siteSessionId,
          });
          registerOwnerCanaryMessage(db, {
            conversationThreadId: ownerIdentity.conversationThreadId,
            messageId: ownerIdentity.messageId,
            siteTurnId: ownerIdentity.siteTurnId,
            requestPayload: parsed.payload,
          });
        }
      } catch {
        return jsonError(
          503,
          'OWNER_CANARY_STATE_UNAVAILABLE',
          'Owner AI Core test временно недоступен.',
        );
      }
    }
  }
  let loggingStarted = false;
  const recordServerEvent = (
    eventName: AiWidgetServerEventName,
    details: {
      route?: string | null;
      templateId?: string | null;
      errorCode?: string | null;
      elapsedMs?: number | null;
    } = {},
  ) => {
    tryRecordAiWidgetServerEvent({
      enabled: aiWidgetServerEventsEnabled(),
      database: getAiWidgetLogDatabase,
      event: {
        turnId: parsed.payload.turnId,
        eventName,
        ...details,
      },
    });
  };
  if (aiWidgetLoggingEnabled()) {
    try {
      const existing = beginAiWidgetTurn(getAiWidgetLogDatabase(), {
        turnId: parsed.payload.turnId,
        sessionId: parsed.payload.sessionId,
        requestId,
        sourcePage: parsed.payload.sourcePage,
        userContent: lastUserMessage,
        runtimeMode,
      });
      recordServerEvent('turn_accepted');
      if (
        existing.status === 'answered'
        && existing.assistantContent
      ) {
        if (ownerAudience === 'owner_canary') {
          recordServerEvent('answer_error', {
            errorCode: 'OWNER_CANARY_TURN_ALREADY_FINALIZED',
            elapsedMs: existing.elapsedMs,
          });
          return jsonError(
            409,
            'OWNER_CANARY_TURN_ALREADY_FINALIZED',
            'Этот тестовый turn уже завершён в другом контуре.',
          );
        }
        recordServerEvent('answer_completed', {
          route: existing.route,
          templateId: existing.templateId,
          elapsedMs: existing.elapsedMs,
        });
        return textResponse(existing.assistantContent, {
          route: existing.route ?? 'cached',
          requestId: existing.requestId,
          handoffMode,
          templateId: existing.templateId,
        });
      }
      if (existing.status !== 'pending') {
        recordServerEvent('answer_error', {
          errorCode: existing.errorCode,
          elapsedMs: existing.elapsedMs,
        });
        return jsonError(
          409,
          'TURN_ALREADY_FAILED',
          'Повторите отправку сообщения.',
        );
      }
      loggingStarted = true;
    } catch {
      return jsonError(
        503,
        'LOG_UNAVAILABLE',
        'Журнал диалога временно недоступен.',
      );
    }
  }

  const failLoggedTurn = (code: string) => {
    if (!loggingStarted) return;
    try {
      const elapsedMs = Date.now() - startedAt;
      failAiWidgetTurn(getAiWidgetLogDatabase(), {
        turnId: parsed.payload.turnId,
        errorCode: code,
        elapsedMs,
      });
      recordServerEvent('answer_error', {
        errorCode: code,
        elapsedMs,
      });
    } catch {
      // The original safe error remains the client response.
    }
  };

  const completeLoggedAnswer = (
    answer: string,
    route: string,
    templateId?: string | null,
  ) => {
    if (!loggingStarted) return true;
    try {
      const elapsedMs = Date.now() - startedAt;
      completeAiWidgetTurn(getAiWidgetLogDatabase(), {
        turnId: parsed.payload.turnId,
        assistantContent: answer,
        route,
        templateId,
        elapsedMs,
      });
      recordServerEvent('answer_completed', {
        route,
        templateId,
        elapsedMs,
      });
      return true;
    } catch {
      failLoggedTurn('LOG_WRITE_FAILED');
      return false;
    }
  };

  const fallback = (failureCode: string) => {
    if (runtimeMode !== 'production') {
      failLoggedTurn(failureCode);
      return null;
    }
    if (!completeLoggedAnswer(PRODUCTION_FALLBACK_ANSWER, 'fallback')) {
      return jsonError(
        503,
        'LOG_UNAVAILABLE',
        'Журнал диалога временно недоступен.',
      );
    }
    return textResponse(PRODUCTION_FALLBACK_ANSWER, {
      route: 'fallback',
      requestId,
      handoffMode,
      fallback: true,
    });
  };

  if (ownerAudience === 'owner_canary' && ownerIdentity) {
    const placeholder = ownerCanaryPlaceholderDecision();
    failLoggedTurn(placeholder.errorCode);
    return jsonError(
      503,
      placeholder.errorCode,
      'AI Core Owner Test подготовлен, но Runtime пока не подключён.',
      {
        'X-AI-Widget-Audience': 'owner_canary',
        'X-AI-Core-Contract-Version': OWNER_AI_CANARY_CONTRACT_VERSION,
        'X-AI-Core-Conversation-Thread-Id':
          ownerIdentity.conversationThreadId,
        'X-AI-Core-Message-Id': ownerIdentity.messageId,
        'X-AI-Core-Request-Id': ownerCanaryRequestId(),
        'X-AI-Core-Owner-Marker': `${OWNER_AI_CANARY_MARKER} · not_connected`,
      },
    );
  }

  let gateway: ReturnType<typeof configuredGateway>;
  try {
    gateway = configuredGateway(runtimeMode);
  } catch {
    failLoggedTurn('WIDGET_MISCONFIGURED');
    return jsonError(
      503,
      'WIDGET_MISCONFIGURED',
      'AI-консультант временно недоступен.',
    );
  }

  try {
    const upstream = await fetch(`${gateway.url}/v1/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gateway.secret}`,
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-AI-Widget-Turn-Persisted': loggingStarted ? 'true' : 'false',
      },
      body: JSON.stringify(parsed.payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    });
    if (!upstream.ok || !upstream.body) {
      return fallback('GATEWAY_ERROR') ?? jsonError(
        502,
        'GATEWAY_ERROR',
        'Не удалось получить ответ. Попробуйте ещё раз.',
      );
    }
    const answer = (await upstream.text()).trim();
    if (!answer) {
      return fallback('EMPTY_GATEWAY_RESPONSE') ?? jsonError(
        502,
        'GATEWAY_ERROR',
        'Не удалось получить ответ. Попробуйте ещё раз.',
      );
    }
    const route = upstream.headers.get('x-ai-widget-route') || 'unknown';
    const templateId = upstream.headers.get(
      'x-ai-widget-template-id',
    );
    if (!completeLoggedAnswer(answer, route, templateId)) {
      return jsonError(
        503,
        'LOG_UNAVAILABLE',
        'Журнал диалога временно недоступен.',
      );
    }
    return textResponse(answer, {
      route,
      requestId,
      handoffMode,
      templateId,
    });
  } catch {
    return fallback('GATEWAY_TIMEOUT') ?? jsonError(
      504,
      'GATEWAY_TIMEOUT',
      'Ответ занял слишком много времени. Попробуйте ещё раз.',
    );
  }
}

function cleanText(value: unknown, maximum: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\0/g, '').trim();
  if (!normalized || normalized.length > maximum) return null;
  return normalized;
}

function validIdentifier(value: string | null) {
  return Boolean(
    value
    && /^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(value),
  );
}

export async function handleAiWidgetLead(request: Request) {
  const runtimeMode = aiWidgetRuntimeMode();
  const handoffMode = aiWidgetHandoffMode();
  if (
    !publicWidgetEnabled()
    || handoffMode === 'off'
  ) {
    return jsonError(404, 'NOT_FOUND', 'Страница не найдена.');
  }
  if (!aiWidgetOriginAllowed(request.headers.get('origin'), request.url)) {
    return jsonError(403, 'ORIGIN_DENIED', 'Запрос отклонён.');
  }
  if (!aiWidgetLoggingEnabled()) {
    return jsonError(
      503,
      'LOG_UNAVAILABLE',
      'Заявка временно недоступна.',
    );
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) {
    return jsonError(413, 'PAYLOAD_TOO_LARGE', 'Данные слишком большие.');
  }
  try {
    if (
      !rateAllowed(
        request,
        'lead',
        LEAD_RATE_WINDOW_MS,
        LEAD_RATE_LIMIT,
      )
    ) {
      return jsonError(
        429,
        'RATE_LIMITED',
        'Слишком много заявок. Попробуйте позднее.',
      );
    }
  } catch {
    return jsonError(
      503,
      'LOG_UNAVAILABLE',
      'Заявка временно недоступна.',
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body || Array.isArray(body)) {
    return jsonError(400, 'INVALID_BODY', 'Проверьте данные заявки.');
  }
  const sessionId = cleanText(body.sessionId, 128);
  const submissionId = cleanText(body.submissionId, 128);
  const sourcePage = cleanText(body.sourcePage, 240);
  const name = cleanText(body.name, 120);
  const contact = cleanText(body.contact, 160);
  const objectDescription = cleanText(body.objectDescription, 240);
  const taskDescription = cleanText(body.taskDescription, 800);
  const consent = body.consent === true;
  if (
    !validIdentifier(sessionId)
    || !validIdentifier(submissionId)
    || !sourcePage?.startsWith('/')
    || sourcePage.startsWith('//')
    || !name
    || !contact
    || !objectDescription
    || !taskDescription
    || !consent
  ) {
    return jsonError(400, 'INVALID_LEAD', 'Заполните все поля заявки.');
  }

  try {
    const db = getAiWidgetLogDatabase();
    const session = getAiWidgetSession(db, sessionId as string);
    if (
      !session
      || session.turns.length === 0
      || session.mode !== runtimeMode
    ) {
      return jsonError(
        409,
        'DIALOGUE_REQUIRED',
        'Сначала задайте вопрос AI-консультанту.',
      );
    }

    if (handoffMode === 'test') {
      const registered = registerAiWidgetTestLead(db, {
        sessionId: sessionId as string,
        submissionId: submissionId as string,
        sourcePage,
        name,
        contact,
        objectDescription,
        taskDescription,
        consent,
        consentVersion: 'ai-widget-test-synthetic-v1',
      });
      return NextResponse.json(
        {
          success: true,
          mode: 'test',
          created: registered.created,
          publicId: registered.publicId,
          maxPreview: registered.maxPreview,
          deliveredToMax: false,
          registeredInProduction: false,
        },
        {
          status: registered.created ? 201 : 200,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        },
      );
    }

    if (!leadRegistryEnabled()) {
      return jsonError(
        503,
        'LEAD_REGISTRY_UNAVAILABLE',
        'Заявка временно недоступна.',
      );
    }
    const registry = registerAiWidgetLead({
      sessionId: sessionId as string,
      submissionId: submissionId as string,
      sourcePage,
      name,
      phone: contact,
      objectDescription,
      taskDescription,
      consentGranted: consent,
    });
    const publicId = `RSP-${registry.leadId.slice(0, 8).toUpperCase()}`;
    registerAiWidgetProductionLead(db, {
      sessionId: sessionId as string,
      submissionId: submissionId as string,
      sourcePage,
      registryLeadId: registry.leadId,
      publicId,
    });
    return NextResponse.json(
      {
        success: true,
        mode: 'production',
        created: !registry.idempotent,
        duplicate: registry.duplicate,
        publicId,
        registeredInProduction: true,
      },
      {
        status: registry.idempotent ? 200 : 201,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    if (error instanceof LeadRegistryError) {
      const status = error.code === 'IDEMPOTENCY_CONFLICT' ? 409 : 400;
      return jsonError(status, error.code, error.message);
    }
    const code = error instanceof Error ? error.message : '';
    if (
      code === 'TEST_LEAD_IDEMPOTENCY_CONFLICT'
      || code === 'PRODUCTION_LEAD_IDEMPOTENCY_CONFLICT'
    ) {
      return jsonError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'Повторите создание заявки.',
      );
    }
    return jsonError(
      500,
      'LEAD_FAILED',
      'Не удалось сохранить заявку.',
    );
  }
}
