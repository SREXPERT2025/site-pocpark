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
  recordAiWidgetServerEvent,
  tryRecordAiWidgetServerEvent,
  type AiWidgetServerEventName,
} from './ai-widget-server-events-core';
import {
  cookieValue,
  mapSiteIdentity,
  OWNER_AI_CANARY_COOKIE,
  OWNER_AI_CANARY_MARKER,
  ownerAiCanaryEnabled,
  selectOwnerCanaryAudience,
} from './owner-ai-canary-core';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_CONTRACT_VERSION,
  AI_CORE_OWNER_MODEL,
  AI_CORE_RUNTIME_SHA,
  CANONICALIZATION_VERSION,
  acknowledgePublicAiCoreMutations,
  acknowledgeOwnerCanaryMutations,
  buildPublicAiCoreRequest,
  buildOwnerCanaryCoreRequest,
  callPublicAiCoreRuntime,
  callOwnerCanaryRuntime,
  ownerCanaryIdempotencyKey,
  preGateTelemetryFromError,
  publicBlockedSafeForensicFromError,
  restrictedForensicFromError,
} from './owner-ai-canary-adapter';
import { recordOwnerCanaryRestrictedForensic } from
  './owner-canary-restricted-forensic-core';
import { getOwnerCanaryRestrictedForensicDatabase } from
  './owner-canary-restricted-forensic-database';
import { recordPublicBlockedSafeForensic } from
  './public-blocked-safe-forensic-core';
import { getPublicBlockedSafeForensicDatabase } from
  './public-blocked-safe-forensic-database';
import {
  appendOwnerCanaryHistory,
  applyOwnerCanaryMutationBatch,
  ensureOwnerCanaryThread,
  getOwnerCanaryRuntimeResponse,
  listOwnerCanaryHistory,
  ownerCanaryRequestId,
  ownerCanarySessionRevoked,
  recordOwnerCanaryRuntimeTelemetry,
  recordOwnerCanaryPreGateTelemetry,
  recordOwnerCanaryTelemetry,
  recordPublicAiCoreRouteTelemetry,
  registerOwnerCanaryMessage,
  runOwnerAiCanaryMigrations,
  saveOwnerCanaryRuntimeResponse,
} from './owner-ai-canary-state';
import { requireOwnerCanarySiteRelease } from './site-release-provenance';
import {
  publicAiCoreEnabled,
  publicAiCoreFallbackReason,
  publicAiCoreRouteHeaders,
  requirePublicAiCoreReleasePins,
  selectAiCoreSiteAudience,
} from './public-ai-core';
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
    extraHeaders?: Record<string, string>;
  },
) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-AI-Widget-Route': input.route,
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': input.requestId,
    ...leadIntentHeaders(input.handoffMode),
    ...(input.extraHeaders ?? {}),
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
      publicAiCoreEnabled: publicAiCoreEnabled(),
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
        if (!aiWidgetLoggingEnabled() || !aiWidgetServerEventsEnabled()) {
          throw new Error('OWNER_CANARY_STATE_UNAVAILABLE');
        }
        const db = getAiWidgetLogDatabase();
        runOwnerAiCanaryMigrations(db);
        const selection = selectOwnerCanaryAudience({
          cookieToken: token,
          isRevoked: (jti) => ownerCanarySessionRevoked(db, jti),
        });
        ownerAudience = selection.audience;
      } catch {
        return jsonError(
          503,
          'OWNER_CANARY_STATE_UNAVAILABLE',
          'Owner AI Core test временно недоступен.',
        );
      }
    }
  }
  const aiCoreAudience = selectAiCoreSiteAudience({
    publicEnabled: publicAiCoreEnabled(),
    ownerAudience,
  });
  if (aiCoreAudience !== 'legacy') {
    try {
      if (!aiWidgetLoggingEnabled() || !aiWidgetServerEventsEnabled()) {
        throw new Error('AI_CORE_STATE_UNAVAILABLE');
      }
      const db = getAiWidgetLogDatabase();
      runOwnerAiCanaryMigrations(db);
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
    } catch {
      const isPublic = aiCoreAudience === 'public_ai_core';
      return jsonError(
        503,
        isPublic ? 'AI_CORE_PUBLIC_STATE_UNAVAILABLE' : 'OWNER_CANARY_STATE_UNAVAILABLE',
        isPublic
          ? 'AI-консультант временно недоступен.'
          : 'Owner AI Core test временно недоступен.',
      );
    }
  }
  const aiCoreBaseHeaders = ownerIdentity ? {
    'X-AI-Widget-Audience': aiCoreAudience,
    'X-AI-Core-Contract-Version': AI_CORE_CONTRACT_VERSION,
    'X-AI-Core-Contract-SHA': AI_CORE_CONTRACT_SHA,
    'X-AI-Core-Canonicalization-Version': CANONICALIZATION_VERSION,
    'X-AI-Core-Runtime-SHA': AI_CORE_RUNTIME_SHA,
    'X-AI-Core-Conversation-Thread-Id': ownerIdentity.conversationThreadId,
    'X-AI-Core-Message-Id': ownerIdentity.messageId,
    ...(aiCoreAudience === 'owner_canary' ? {
      'X-AI-Core-Owner-Marker':
        `${OWNER_AI_CANARY_MARKER} · Qwen · Runtime ${AI_CORE_RUNTIME_SHA.slice(0, 7)}`,
    } : {}),
  } : {};
  let loggingStarted = false;
  const recordServerEvent = (
    eventName: AiWidgetServerEventName,
    details: {
      route?: string | null;
      templateId?: string | null;
      errorCode?: string | null;
      elapsedMs?: number | null;
      conversationThreadId?: string | null;
      messageId?: string | null;
      aiCoreRequestId?: string | null;
      runtimeTelemetryRef?: string | null;
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
        if (aiCoreAudience !== 'legacy') {
          if (!ownerIdentity) {
            return jsonError(
              503,
              'AI_CORE_IDENTITY_MISSING',
              'AI-консультант временно недоступен.',
            );
          }
          const cached = getOwnerCanaryRuntimeResponse(
            getAiWidgetLogDatabase(),
            {
              conversationThreadId: ownerIdentity.conversationThreadId,
              messageId: ownerIdentity.messageId,
              idempotencyKey: ownerCanaryIdempotencyKey(
                ownerIdentity.conversationThreadId,
                ownerIdentity.messageId,
              ),
            },
          );
          if (!cached || cached.visibleAnswer !== existing.assistantContent) {
            return jsonError(
              409,
              'AI_CORE_IDEMPOTENCY_EVIDENCE_MISSING',
              'Этот запрос уже завершён, но его evidence недоступен.',
            );
          }
          return textResponse(cached.visibleAnswer, {
            route: aiCoreAudience === 'public_ai_core'
              ? 'public_ai_core_cached'
              : 'owner_ai_core_cached',
            requestId: existing.requestId,
            handoffMode,
            extraHeaders: {
              ...aiCoreBaseHeaders,
              ...(aiCoreAudience === 'public_ai_core'
                ? publicAiCoreRouteHeaders({ actualRoute: 'ai_core' })
                : {}),
            },
          });
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

  const failLoggedTurn = (
    code: string,
    correlation: {
      route?: 'public_ai_core' | 'owner_ai_core' | 'legacy';
      conversationThreadId?: string | null;
      messageId?: string | null;
      aiCoreRequestId?: string | null;
      runtimeTelemetryRef?: string | null;
    } = {},
  ) => {
    if (!loggingStarted) return;
    try {
      const elapsedMs = Date.now() - startedAt;
      failAiWidgetTurn(getAiWidgetLogDatabase(), {
        turnId: parsed.payload.turnId,
        errorCode: code,
        elapsedMs,
      });
      recordServerEvent('answer_error', {
        route: correlation.route,
        errorCode: code,
        elapsedMs,
        ...correlation,
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

  let publicFallbackContext: {
    reason: string;
    aiCoreRequestId: string;
  } | null = null;
  const recordPublicFallback = (
    actualRoute: 'legacy' | 'fallback',
    suffix?: string,
  ) => {
    if (!publicFallbackContext || !ownerIdentity) return;
    const fallbackReason = suffix
      ? `${publicFallbackContext.reason}_${suffix}`
      : publicFallbackContext.reason;
    recordPublicAiCoreRouteTelemetry(getAiWidgetLogDatabase(), {
      turnId: parsed.payload.turnId,
      conversationThreadId: ownerIdentity.conversationThreadId,
      messageId: ownerIdentity.messageId,
      aiCoreRequestId: publicFallbackContext.aiCoreRequestId,
      runtimeSha: AI_CORE_RUNTIME_SHA,
      contractSha: AI_CORE_CONTRACT_SHA,
      actualRoute,
      fallbackReason,
      mutationStarted: false,
    });
    publicFallbackContext = null;
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
    const publicHeaders = publicFallbackContext
      ? publicAiCoreRouteHeaders({
        actualRoute: 'fallback',
        fallbackReason: `${publicFallbackContext.reason}_${failureCode}`,
      })
      : undefined;
    recordPublicFallback('fallback', failureCode);
    return textResponse(PRODUCTION_FALLBACK_ANSWER, {
      route: 'fallback',
      requestId,
      handoffMode,
      fallback: true,
      extraHeaders: publicHeaders,
    });
  };

  if (aiCoreAudience !== 'legacy' && ownerIdentity) {
    const aiCoreRequestId = ownerCanaryRequestId();
    let aiCoreMutationStarted = false;
    let preGateTelemetryRef: string | null = null;
    const ownerHeaders = {
      ...aiCoreBaseHeaders,
      'X-AI-Core-Request-Id': aiCoreRequestId,
      ...(aiCoreAudience === 'public_ai_core'
        ? publicAiCoreRouteHeaders({ actualRoute: 'ai_core' })
        : {}),
    };
    try {
      const { siteRelease, gatewayRelease } = aiCoreAudience === 'public_ai_core'
        ? requirePublicAiCoreReleasePins()
        : {
          siteRelease: requireOwnerCanarySiteRelease(),
          gatewayRelease: process.env.AI_CORE_OWNER_CANARY_GATEWAY_SHA ?? '',
        };
      if (!/^[a-f0-9]{40}$/.test(siteRelease)
        || !/^[a-f0-9]{40}$/.test(gatewayRelease)) {
        throw new Error('AI_CORE_RELEASE_PIN_INVALID');
      }
      const db = getAiWidgetLogDatabase();
      const state = ensureOwnerCanaryThread(db, {
        conversationThreadId: ownerIdentity.conversationThreadId,
        siteSessionId: ownerIdentity.siteSessionId,
      });
      const history = listOwnerCanaryHistory(
        db,
        ownerIdentity.conversationThreadId,
      );
      const coreRequest = (aiCoreAudience === 'public_ai_core'
        ? buildPublicAiCoreRequest
        : buildOwnerCanaryCoreRequest)({
        aiCoreRequestId,
        conversationThreadId: ownerIdentity.conversationThreadId,
        messageId: ownerIdentity.messageId,
        parentMessageId: history.at(-1)?.message_id ?? null,
        currentMessage: lastUserMessage,
        sourcePage: parsed.payload.sourcePage,
        pageContextIntentHint: parsed.payload.pageContext,
        recentMessages: history,
        state,
        siteRelease,
        gatewayRelease,
      });
      const cached = getOwnerCanaryRuntimeResponse(db, {
        conversationThreadId: ownerIdentity.conversationThreadId,
        messageId: ownerIdentity.messageId,
        idempotencyKey: coreRequest.idempotency_key,
      });
      if (cached) {
        if (cached.requestPayloadHash !== coreRequest.request_payload_hash) {
          throw new Error('OWNER_CANARY_CACHE_IDEMPOTENCY_CONFLICT');
        }
        return textResponse(cached.visibleAnswer, {
          route: 'owner_ai_core_cached',
          requestId,
          handoffMode,
          extraHeaders: ownerHeaders,
        });
      }
      appendOwnerCanaryHistory(db, {
        conversationThreadId: ownerIdentity.conversationThreadId,
        messageId: ownerIdentity.messageId,
        role: 'user',
        content: lastUserMessage,
      });
      const envelope = aiCoreAudience === 'public_ai_core'
        ? await callPublicAiCoreRuntime(coreRequest)
        : await callOwnerCanaryRuntime(coreRequest);
      if (aiCoreAudience === 'owner_canary') {
        preGateTelemetryRef = recordOwnerCanaryPreGateTelemetry(db, {
          turnId: parsed.payload.turnId,
          conversationThreadId: ownerIdentity.conversationThreadId,
          messageId: ownerIdentity.messageId,
          telemetry: envelope.preGateTelemetry,
        }).telemetryRef;
      }
      const response = envelope.response;
      const responseId = String(response.response_id);
      const mutations = response.state_mutations as Parameters<
        typeof applyOwnerCanaryMutationBatch
      >[1]['mutations'];
      aiCoreMutationStarted = mutations.length > 0;
      const applied = applyOwnerCanaryMutationBatch(db, {
        conversationThreadId: ownerIdentity.conversationThreadId,
        messageId: ownerIdentity.messageId,
        requestId: coreRequest.request_id,
        responseId,
        mutations,
      });
      if (mutations.length > 0) {
        if (aiCoreAudience === 'public_ai_core') {
          await acknowledgePublicAiCoreMutations(applied.acknowledgement);
        } else {
          await acknowledgeOwnerCanaryMutations(applied.acknowledgement);
        }
      }
      if (!applied.accepted) {
        throw new Error('OWNER_CANARY_STATE_VERSION_CONFLICT');
      }
      const answer = String(response.answer).trim();
      const telemetry = response.telemetry as Record<string, unknown>;
      const executorTrace = response.executor_trace as Record<string, unknown>;
      const evaluation = response.evaluation_result as Record<string, unknown>;
      const repair = response.repair_result as Record<string, unknown>;
      const latency = telemetry.latency as Record<string, unknown> | undefined;
      const evaluationTelemetry = telemetry.evaluation as
        | Record<string, unknown> | undefined;
      const elapsedMs = Date.now() - startedAt;
      const responseRoute = aiCoreAudience === 'public_ai_core'
        ? 'public_ai_core'
        : 'owner_ai_core';
      db.transaction(() => {
        completeAiWidgetTurn(db, {
          turnId: parsed.payload.turnId,
          assistantContent: answer,
          route: responseRoute,
          elapsedMs,
        });
        const terminalEvent = recordAiWidgetServerEvent(db, {
          turnId: parsed.payload.turnId,
          eventName: 'answer_completed',
          route: responseRoute,
          elapsedMs,
          ...(aiCoreAudience === 'owner_canary' ? {
            conversationThreadId: ownerIdentity.conversationThreadId,
            messageId: ownerIdentity.messageId,
            aiCoreRequestId,
            runtimeTelemetryRef: preGateTelemetryRef,
          } : {}),
        });
        if (aiCoreAudience === 'public_ai_core') {
          recordPublicAiCoreRouteTelemetry(db, {
            turnId: parsed.payload.turnId,
            conversationThreadId: ownerIdentity.conversationThreadId,
            messageId: ownerIdentity.messageId,
            aiCoreRequestId,
            runtimeSha: AI_CORE_RUNTIME_SHA,
            contractSha: AI_CORE_CONTRACT_SHA,
            actualRoute: 'ai_core',
            mutationStarted: aiCoreMutationStarted,
            stateVersionBefore: Number(response.state_version_before),
            stateVersionAfter: applied.state.stateVersion,
            response: envelope,
            componentVersions: response.component_versions as Record<string, unknown>,
          });
        } else {
          recordOwnerCanaryTelemetry(db, {
            turnId: parsed.payload.turnId,
            conversationThreadId: ownerIdentity.conversationThreadId,
            messageId: ownerIdentity.messageId,
            aiCoreRequestId,
            contractVersion: AI_CORE_CONTRACT_VERSION,
            runtimeSha: AI_CORE_RUNTIME_SHA,
            decisionPackageHash: String(response.decision_package_hash),
            plannedExecutor: String(executorTrace.planned_executor),
            finalExecutor: String(executorTrace.final_executor),
            evaluationStatus: String(evaluation.status),
            repairStatus: repair.applied ? 'applied' : 'not_applied',
            stateVersionBefore: Number(response.state_version_before),
            stateVersionAfter: applied.state.stateVersion,
            latencyMs: Number(latency?.total_ms ?? elapsedMs),
            siteTerminalEventId: terminalEvent.id,
          });
          recordOwnerCanaryRuntimeTelemetry(db, {
            turnId: parsed.payload.turnId,
            runtimeSha: AI_CORE_RUNTIME_SHA,
            rawStatus: String(evaluationTelemetry?.raw_status),
            repairApplied: Boolean(repair.applied),
            finalStatus: String(evaluationTelemetry?.final_status),
            blockingReasonCodes: Array.isArray(evaluation.reason_codes)
              ? evaluation.reason_codes.map(String) : [],
            componentVersions: response.component_versions as Record<string, unknown>,
          });
        }
        appendOwnerCanaryHistory(db, {
          conversationThreadId: ownerIdentity.conversationThreadId,
          messageId: responseId,
          role: 'assistant',
          content: answer,
        });
        saveOwnerCanaryRuntimeResponse(db, {
          conversationThreadId: ownerIdentity.conversationThreadId,
          messageId: ownerIdentity.messageId,
          idempotencyKey: coreRequest.idempotency_key,
          requestPayloadHash: coreRequest.request_payload_hash,
          response: envelope,
          visibleAnswer: answer,
        });
      })();
      return textResponse(answer, {
        route: responseRoute,
        requestId,
        handoffMode,
        extraHeaders: {
          ...ownerHeaders,
          'X-AI-Core-Model': AI_CORE_OWNER_MODEL,
          'X-AI-Core-State-Version': String(applied.state.stateVersion),
          'X-AI-Core-Raw-Status': String(evaluationTelemetry?.raw_status),
          'X-AI-Core-Repair-Applied': String(Boolean(repair.applied)),
          'X-AI-Core-Final-Status': String(evaluationTelemetry?.final_status),
        },
      });
    } catch (error) {
      let telemetryWriteFailed = false;
      let restrictedForensicWriteFailed = false;
      let publicBlockedForensicWriteFailed = false;
      let publicBlockedForensicRef: string | null = null;
      if (aiCoreAudience === 'owner_canary' && !preGateTelemetryRef) {
        const telemetry = preGateTelemetryFromError(error);
        const restrictedForensic = restrictedForensicFromError(error);
        if (telemetry) {
          try {
            preGateTelemetryRef = recordOwnerCanaryPreGateTelemetry(
              getAiWidgetLogDatabase(),
              {
                turnId: parsed.payload.turnId,
                conversationThreadId: ownerIdentity.conversationThreadId,
                messageId: ownerIdentity.messageId,
                telemetry,
              },
            ).telemetryRef;
          } catch {
            telemetryWriteFailed = true;
          }
        }
        if (restrictedForensic) {
          try {
            recordOwnerCanaryRestrictedForensic(
              getOwnerCanaryRestrictedForensicDatabase(),
              {
                turnId: parsed.payload.turnId,
                conversationThreadId: ownerIdentity.conversationThreadId,
                messageId: ownerIdentity.messageId,
                aiCoreRequestId,
                evidence: restrictedForensic,
              },
            );
          } catch {
            restrictedForensicWriteFailed = true;
          }
        }
      }
      if (aiCoreAudience === 'public_ai_core') {
        const publicSafeForensic = publicBlockedSafeForensicFromError(error);
        if (publicSafeForensic) {
          try {
            publicBlockedForensicRef = recordPublicBlockedSafeForensic(
              getPublicBlockedSafeForensicDatabase(),
              {
                turnId: parsed.payload.turnId,
                aiCoreRequestId,
                evidence: publicSafeForensic,
              },
            ).forensicRef;
          } catch (forensicError) {
            const storageFailureCode = forensicError instanceof Error
              ? forensicError.message.replace(/[^A-Z0-9_]/gi, '_')
                .toUpperCase().slice(0, 100)
              : 'UNKNOWN';
            console.error(
              'PUBLIC_BLOCKED_SAFE_FORENSIC_WRITE_FAILED',
              storageFailureCode,
            );
            publicBlockedForensicWriteFailed = true;
          }
        }
      }
      const errorCorrelation = {
        route: aiCoreAudience === 'public_ai_core'
          ? 'public_ai_core' as const
          : 'owner_ai_core' as const,
        conversationThreadId: ownerIdentity.conversationThreadId,
        messageId: ownerIdentity.messageId,
        aiCoreRequestId,
        runtimeTelemetryRef: publicBlockedForensicRef ?? preGateTelemetryRef,
      };
      if (aiCoreAudience === 'public_ai_core') {
        const reason = publicAiCoreFallbackReason(
          error,
          aiCoreMutationStarted,
        );
        if (reason) {
          publicFallbackContext = { reason, aiCoreRequestId };
        } else {
          const code = publicBlockedForensicWriteFailed
            ? 'PUBLIC_BLOCKED_FORENSIC_WRITE_FAILED'
            : error instanceof Error
              ? error.message.replace(/[^A-Z0-9_]/gi, '_')
                .toUpperCase().slice(0, 100)
              : 'PUBLIC_AI_CORE_ERROR';
          failLoggedTurn(code || 'PUBLIC_AI_CORE_ERROR', errorCorrelation);
          return jsonError(
            503,
            code || 'PUBLIC_AI_CORE_ERROR',
            'AI-консультант завершился безопасной ошибкой.',
            ownerHeaders,
          );
        }
      } else {
        const code = restrictedForensicWriteFailed
          ? 'OWNER_RESTRICTED_FORENSIC_WRITE_FAILED'
          : telemetryWriteFailed
            ? 'OWNER_PRE_GATE_TELEMETRY_WRITE_FAILED'
          : error instanceof Error
            ? error.message.replace(/[^A-Z0-9_]/gi, '_')
              .toUpperCase().slice(0, 100)
            : 'OWNER_AI_CORE_ERROR';
        failLoggedTurn(code || 'OWNER_AI_CORE_ERROR', errorCorrelation);
        return jsonError(
          503,
          code || 'OWNER_AI_CORE_ERROR',
          'Owner AI Core test завершился безопасной ошибкой. Legacy-маршрут не использован.',
          ownerHeaders,
        );
      }
    }
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
    const publicHeaders = publicFallbackContext
      ? publicAiCoreRouteHeaders({
        actualRoute: 'legacy',
        fallbackReason: publicFallbackContext.reason,
      })
      : undefined;
    recordPublicFallback('legacy');
    return textResponse(answer, {
      route,
      requestId,
      handoffMode,
      templateId,
      extraHeaders: publicHeaders,
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
