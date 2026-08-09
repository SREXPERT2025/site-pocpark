import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export const AI_WIDGET_SERVER_EVENT_NAMES = [
  'turn_accepted',
  'answer_completed',
  'answer_error',
] as const;

export type AiWidgetServerEventName =
  (typeof AI_WIDGET_SERVER_EVENT_NAMES)[number];

export type AiWidgetServerEventRow = {
  id: string;
  turnId: string;
  sessionId: string;
  requestId: string;
  sourcePage: string;
  eventName: AiWidgetServerEventName;
  route: string | null;
  templateId: string | null;
  errorCode: string | null;
  elapsedMs: number | null;
  conversationThreadId: string | null;
  messageId: string | null;
  aiCoreRequestId: string | null;
  runtimeTelemetryRef: string | null;
  createdAt: string;
};

function requiredIdentifier(value: string, field: string) {
  const normalized = value.replace(/\0/g, '').trim();
  if (!/^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(normalized)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function requiredSourcePage(value: string) {
  const normalized = value.replace(/\0/g, '').trim();
  if (
    !normalized.startsWith('/')
    || normalized.startsWith('//')
    || normalized.length > 240
  ) {
    throw new Error('INVALID_SOURCE_PAGE');
  }
  return normalized;
}

function optionalValue(
  value: string | null | undefined,
  maximum: number,
) {
  if (value === null || value === undefined) return null;
  const normalized = value.replace(/\0/g, '').trim();
  if (!normalized) return null;
  if (normalized.length > maximum) {
    throw new Error('INVALID_EVENT_VALUE');
  }
  return normalized;
}

function rowToEvent(row: {
  id: string;
  turn_id: string;
  session_id: string;
  request_id: string;
  source_page: string;
  event_name: AiWidgetServerEventName;
  route: string | null;
  template_id: string | null;
  error_code: string | null;
  elapsed_ms: number | null;
  conversation_thread_id: string | null;
  message_id: string | null;
  ai_core_request_id: string | null;
  runtime_telemetry_ref: string | null;
  created_at: string;
}): AiWidgetServerEventRow {
  return {
    id: row.id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    requestId: row.request_id,
    sourcePage: row.source_page,
    eventName: row.event_name,
    route: row.route,
    templateId: row.template_id,
    errorCode: row.error_code,
    elapsedMs: row.elapsed_ms,
    conversationThreadId: row.conversation_thread_id,
    messageId: row.message_id,
    aiCoreRequestId: row.ai_core_request_id,
    runtimeTelemetryRef: row.runtime_telemetry_ref,
    createdAt: row.created_at,
  };
}

export function recordAiWidgetServerEvent(
  db: Database.Database,
  input: {
    turnId: string;
    eventName: AiWidgetServerEventName;
    route?: string | null;
    templateId?: string | null;
    errorCode?: string | null;
    elapsedMs?: number | null;
    conversationThreadId?: string | null;
    messageId?: string | null;
    aiCoreRequestId?: string | null;
    runtimeTelemetryRef?: string | null;
    nowMs?: number;
    idFactory?: () => string;
  },
) {
  if (!AI_WIDGET_SERVER_EVENT_NAMES.includes(input.eventName)) {
    throw new Error('INVALID_EVENT_NAME');
  }
  const turnId = requiredIdentifier(input.turnId, 'turn_id');
  const turn = db.prepare(`
    SELECT id, session_id, request_id, source_page, status
    FROM ai_widget_turns
    WHERE id = ?
  `).get(turnId) as {
    id: string;
    session_id: string;
    request_id: string;
    source_page: string;
    status: 'pending' | 'answered' | 'error';
  } | undefined;
  if (!turn) throw new Error('EVENT_TURN_NOT_FOUND');
  if (
    input.eventName === 'answer_completed'
    && turn.status !== 'answered'
  ) {
    throw new Error('EVENT_TURN_NOT_ANSWERED');
  }
  if (
    input.eventName === 'answer_error'
    && turn.status !== 'error'
  ) {
    throw new Error('EVENT_TURN_NOT_FAILED');
  }

  const sessionId = requiredIdentifier(turn.session_id, 'session_id');
  const requestId = requiredIdentifier(turn.request_id, 'request_id');
  const sourcePage = requiredSourcePage(turn.source_page);
  const route = optionalValue(input.route, 80);
  const templateId = optionalValue(input.templateId, 80);
  const errorCode = optionalValue(input.errorCode, 120);
  const conversationThreadId = input.conversationThreadId
    ? requiredIdentifier(input.conversationThreadId, 'conversation_thread_id')
    : null;
  const messageId = input.messageId
    ? requiredIdentifier(input.messageId, 'message_id')
    : null;
  const aiCoreRequestId = input.aiCoreRequestId
    ? requiredIdentifier(input.aiCoreRequestId, 'ai_core_request_id')
    : null;
  const runtimeTelemetryRef = input.runtimeTelemetryRef
    ? requiredIdentifier(input.runtimeTelemetryRef, 'runtime_telemetry_ref')
    : null;
  const elapsedMs = input.elapsedMs === null || input.elapsedMs === undefined
    ? null
    : Math.max(0, Math.trunc(input.elapsedMs));
  const nowMs = input.nowMs ?? Date.now();
  const createdAt = new Date(nowMs).toISOString();

  const result = db.prepare(`
    INSERT OR IGNORE INTO ai_widget_server_events (
      id, turn_id, session_id, request_id, source_page,
      event_name, route, template_id, error_code, elapsed_ms,
      conversation_thread_id, message_id, ai_core_request_id,
      runtime_telemetry_ref, created_at, created_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.idFactory?.() ?? randomUUID(),
    turnId,
    sessionId,
    requestId,
    sourcePage,
    input.eventName,
    route,
    templateId,
    errorCode,
    elapsedMs,
    conversationThreadId,
    messageId,
    aiCoreRequestId,
    runtimeTelemetryRef,
    createdAt,
    nowMs,
  );

  const existing = db.prepare(`
    SELECT *
    FROM ai_widget_server_events
    WHERE turn_id = ?
      AND event_name = ?
  `).get(turnId, input.eventName) as Parameters<typeof rowToEvent>[0]
    | undefined;
  if (!existing) {
    const terminal = db.prepare(`
      SELECT event_name
      FROM ai_widget_server_events
      WHERE turn_id = ?
        AND event_name IN ('answer_completed', 'answer_error')
    `).get(turnId) as { event_name: AiWidgetServerEventName } | undefined;
    if (terminal) throw new Error('EVENT_TERMINAL_CONFLICT');
    throw new Error('EVENT_WRITE_FAILED');
  }

  if (
    result.changes === 0
    && (
      existing.session_id !== sessionId
      || existing.request_id !== requestId
      || existing.source_page !== sourcePage
      || existing.route !== route
      || existing.template_id !== templateId
      || existing.error_code !== errorCode
      || existing.elapsed_ms !== elapsedMs
      || existing.conversation_thread_id !== conversationThreadId
      || existing.message_id !== messageId
      || existing.ai_core_request_id !== aiCoreRequestId
      || existing.runtime_telemetry_ref !== runtimeTelemetryRef
    )
  ) {
    throw new Error('EVENT_IDEMPOTENCY_CONFLICT');
  }
  return { ...rowToEvent(existing), created: result.changes === 1 };
}

export function tryRecordAiWidgetServerEvent(input: {
  enabled: boolean;
  database: () => Database.Database;
  event: Parameters<typeof recordAiWidgetServerEvent>[1];
}) {
  if (!input.enabled) return false;
  try {
    recordAiWidgetServerEvent(input.database(), input.event);
    return true;
  } catch {
    return false;
  }
}

export function listAiWidgetServerEvents(
  db: Database.Database,
  turnId: string,
) {
  const normalized = requiredIdentifier(turnId, 'turn_id');
  return (db.prepare(`
    SELECT *
    FROM ai_widget_server_events
    WHERE turn_id = ?
    ORDER BY created_at_ms, event_name
  `).all(normalized) as Array<Parameters<typeof rowToEvent>[0]>)
    .map(rowToEvent);
}
