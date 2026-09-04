import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export const AI_WIDGET_TRANSCRIPT_RETENTION_MS =
  7 * 24 * 60 * 60 * 1000;
export const AI_WIDGET_TEST_TRANSCRIPT_RETENTION_MS =
  AI_WIDGET_TRANSCRIPT_RETENTION_MS;
export const AI_WIDGET_OPERATIONAL_LOG_RETENTION_MS =
  14 * 24 * 60 * 60 * 1000;

export const AI_WIDGET_SESSION_MODES = [
  'preview',
  'production',
] as const;
export type AiWidgetSessionMode =
  (typeof AI_WIDGET_SESSION_MODES)[number];

export const AI_WIDGET_TURN_STATUSES = [
  'pending',
  'answered',
  'error',
] as const;

export type AiWidgetTurnStatus =
  (typeof AI_WIDGET_TURN_STATUSES)[number];

export type AiWidgetTurnRow = {
  id: string;
  sessionId: string;
  requestId: string;
  sourcePage: string;
  userContent: string;
  assistantContent: string | null;
  route: string | null;
  templateId: string | null;
  status: AiWidgetTurnStatus;
  errorCode: string | null;
  elapsedMs: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAtMs: number;
};

export type AiWidgetTestLeadRow = {
  id: string;
  sessionId: string;
  submissionId: string;
  name: string;
  contact: string;
  objectDescription: string;
  taskDescription: string;
  consentVersion: string;
  consentAt: string;
  status: 'simulated';
  maxPreview: string;
  createdAt: string;
  expiresAtMs: number;
};

export type AiWidgetProductionLeadRow = {
  id: string;
  sessionId: string;
  submissionId: string;
  registryLeadId: string;
  publicId: string;
  status: 'registered';
  createdAt: string;
  expiresAtMs: number;
};

export type AiWidgetSessionDetails = {
  id: string;
  mode: AiWidgetSessionMode;
  sourcePage: string;
  createdAt: string;
  updatedAt: string;
  expiresAtMs: number;
  turns: AiWidgetTurnRow[];
  testLeads: AiWidgetTestLeadRow[];
  productionLeads: AiWidgetProductionLeadRow[];
};

export type AiWidgetSessionSummary = {
  id: string;
  mode: AiWidgetSessionMode;
  sourcePage: string;
  createdAt: string;
  updatedAt: string;
  expiresAtMs: number;
  turnCount: number;
  answeredCount: number;
  errorCount: number;
  testLeadCount: number;
  productionLeadCount: number;
  latestQuestion: string | null;
};

function iso(nowMs: number) {
  return new Date(nowMs).toISOString();
}

function requiredText(
  value: string,
  field: string,
  maximum: number,
) {
  const normalized = value.replace(/\0/g, '').trim();
  if (!normalized || normalized.length > maximum) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function optionalText(
  value: string | null | undefined,
  maximum: number,
) {
  if (value === null || value === undefined) return null;
  const normalized = value.replace(/\0/g, '').trim();
  if (!normalized) return null;
  if (normalized.length > maximum) {
    throw new Error('INVALID_OPTIONAL_TEXT');
  }
  return normalized;
}

function validIdentifier(value: string, field: string) {
  const normalized = requiredText(value, field, 128);
  if (!/^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(normalized)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function validSourcePage(value: string) {
  const normalized = requiredText(value, 'source_page', 240);
  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    throw new Error('INVALID_SOURCE_PAGE');
  }
  return normalized;
}

function rowToTurn(row: {
  id: string;
  session_id: string;
  request_id: string;
  source_page: string;
  user_content: string;
  assistant_content: string | null;
  route: string | null;
  template_id: string | null;
  status: AiWidgetTurnStatus;
  error_code: string | null;
  elapsed_ms: number | null;
  created_at: string;
  updated_at: string;
  expires_at_ms: number;
}): AiWidgetTurnRow {
  return {
    id: row.id,
    sessionId: row.session_id,
    requestId: row.request_id,
    sourcePage: row.source_page,
    userContent: row.user_content,
    assistantContent: row.assistant_content,
    route: row.route,
    templateId: row.template_id,
    status: row.status,
    errorCode: row.error_code,
    elapsedMs: row.elapsed_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAtMs: row.expires_at_ms,
  };
}

function rowToTestLead(row: {
  id: string;
  session_id: string;
  submission_id: string;
  name: string;
  contact: string;
  object_description: string;
  task_description: string;
  consent_version: string;
  consent_at: string;
  status: 'simulated';
  max_preview: string;
  created_at: string;
  expires_at_ms: number;
}): AiWidgetTestLeadRow {
  return {
    id: row.id,
    sessionId: row.session_id,
    submissionId: row.submission_id,
    name: row.name,
    contact: row.contact,
    objectDescription: row.object_description,
    taskDescription: row.task_description,
    consentVersion: row.consent_version,
    consentAt: row.consent_at,
    status: row.status,
    maxPreview: row.max_preview,
    createdAt: row.created_at,
    expiresAtMs: row.expires_at_ms,
  };
}

function rowToProductionLead(row: {
  id: string;
  session_id: string;
  submission_id: string;
  registry_lead_id: string;
  public_id: string;
  status: 'registered';
  created_at: string;
  expires_at_ms: number;
}): AiWidgetProductionLeadRow {
  return {
    id: row.id,
    sessionId: row.session_id,
    submissionId: row.submission_id,
    registryLeadId: row.registry_lead_id,
    publicId: row.public_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAtMs: row.expires_at_ms,
  };
}

export function runAiWidgetLogMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_widget_log_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare(`
      SELECT version
      FROM ai_widget_log_migrations
      ORDER BY version
    `).all() as Array<{ version: number }>).map((item) => item.version),
  );

  if (!applied.has(1)) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE ai_widget_sessions (
          id TEXT PRIMARY KEY,
          mode TEXT NOT NULL DEFAULT 'test' CHECK (mode = 'test'),
          source_page TEXT NOT NULL,
          created_at TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          updated_at_ms INTEGER NOT NULL,
          expires_at_ms INTEGER NOT NULL
        );

        CREATE TABLE ai_widget_turns (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          request_id TEXT NOT NULL UNIQUE,
          source_page TEXT NOT NULL,
          user_content TEXT NOT NULL,
          assistant_content TEXT,
          route TEXT,
          template_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'answered', 'error')),
          error_code TEXT,
          elapsed_ms INTEGER CHECK (elapsed_ms IS NULL OR elapsed_ms >= 0),
          created_at TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          updated_at_ms INTEGER NOT NULL,
          expires_at_ms INTEGER NOT NULL,
          FOREIGN KEY (session_id)
            REFERENCES ai_widget_sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE ai_widget_test_leads (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          submission_id TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          contact TEXT NOT NULL,
          object_description TEXT NOT NULL,
          task_description TEXT NOT NULL,
          consent_version TEXT NOT NULL,
          consent_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'simulated'
            CHECK (status = 'simulated'),
          max_preview TEXT NOT NULL,
          created_at TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          expires_at_ms INTEGER NOT NULL,
          FOREIGN KEY (session_id)
            REFERENCES ai_widget_sessions(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_ai_widget_sessions_updated
          ON ai_widget_sessions(updated_at_ms DESC);
        CREATE INDEX idx_ai_widget_sessions_expiry
          ON ai_widget_sessions(expires_at_ms);
        CREATE INDEX idx_ai_widget_turns_session
          ON ai_widget_turns(session_id, created_at_ms);
        CREATE INDEX idx_ai_widget_turns_expiry
          ON ai_widget_turns(expires_at_ms);
        CREATE INDEX idx_ai_widget_test_leads_session
          ON ai_widget_test_leads(session_id, created_at_ms);
        CREATE INDEX idx_ai_widget_test_leads_expiry
          ON ai_widget_test_leads(expires_at_ms);
      `);
      db.prepare(`
        INSERT INTO ai_widget_log_migrations (
          version, name, applied_at
        ) VALUES (1, 'test_transcript_foundation', ?)
      `).run(new Date().toISOString());
    })();
  }

  if (!applied.has(2)) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE ai_widget_sessions
          ADD COLUMN runtime_mode TEXT NOT NULL DEFAULT 'preview'
            CHECK (runtime_mode IN ('preview', 'production'));

        CREATE TABLE ai_widget_production_leads (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          submission_id TEXT NOT NULL UNIQUE,
          registry_lead_id TEXT NOT NULL,
          public_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'registered'
            CHECK (status = 'registered'),
          created_at TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          expires_at_ms INTEGER NOT NULL,
          FOREIGN KEY (session_id)
            REFERENCES ai_widget_sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE ai_widget_rate_limits (
          scope TEXT NOT NULL,
          key_hash TEXT NOT NULL,
          window_started_ms INTEGER NOT NULL,
          request_count INTEGER NOT NULL DEFAULT 0
            CHECK (request_count >= 0),
          expires_at_ms INTEGER NOT NULL,
          PRIMARY KEY (scope, key_hash)
        );

        CREATE INDEX idx_ai_widget_production_leads_session
          ON ai_widget_production_leads(session_id, created_at_ms);
        CREATE INDEX idx_ai_widget_production_leads_expiry
          ON ai_widget_production_leads(expires_at_ms);
        CREATE INDEX idx_ai_widget_rate_limits_expiry
          ON ai_widget_rate_limits(expires_at_ms);
      `);
      db.prepare(`
        INSERT INTO ai_widget_log_migrations (
          version, name, applied_at
        ) VALUES (2, 'production_runtime_and_lead_links', ?)
      `).run(new Date().toISOString());
    })();
  }

  if (!applied.has(3)) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE ai_widget_server_events (
          id TEXT PRIMARY KEY,
          turn_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          request_id TEXT NOT NULL,
          source_page TEXT NOT NULL,
          event_name TEXT NOT NULL
            CHECK (
              event_name IN (
                'turn_accepted',
                'answer_completed',
                'answer_error'
              )
            ),
          route TEXT,
          template_id TEXT,
          error_code TEXT,
          elapsed_ms INTEGER
            CHECK (elapsed_ms IS NULL OR elapsed_ms >= 0),
          created_at TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL,
          FOREIGN KEY (turn_id)
            REFERENCES ai_widget_turns(id) ON DELETE CASCADE,
          UNIQUE (turn_id, event_name)
        );

        CREATE UNIQUE INDEX idx_ai_widget_server_events_terminal
          ON ai_widget_server_events(turn_id)
          WHERE event_name IN ('answer_completed', 'answer_error');

        CREATE INDEX idx_ai_widget_server_events_created
          ON ai_widget_server_events(created_at_ms DESC);
      `);
      db.prepare(`
        INSERT INTO ai_widget_log_migrations (
          version, name, applied_at
        ) VALUES (3, 'server_confirmed_foundation_events', ?)
      `).run(new Date().toISOString());
    })();
  }

  if (!applied.has(4)) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE ai_widget_server_events
          ADD COLUMN conversation_thread_id TEXT;
        ALTER TABLE ai_widget_server_events
          ADD COLUMN message_id TEXT;
        ALTER TABLE ai_widget_server_events
          ADD COLUMN ai_core_request_id TEXT;
        ALTER TABLE ai_widget_server_events
          ADD COLUMN runtime_telemetry_ref TEXT;

        CREATE INDEX idx_ai_widget_server_events_ai_core_request
          ON ai_widget_server_events(ai_core_request_id)
          WHERE ai_core_request_id IS NOT NULL;
      `);
      db.prepare(`
        INSERT INTO ai_widget_log_migrations (
          version, name, applied_at
        ) VALUES (4, 'server_event_ai_core_correlation_v1', ?)
      `).run(new Date().toISOString());
    })();
  }

  if (!applied.has(5)) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE ai_widget_legacy_memory (
          session_id TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          snapshot_json TEXT NOT NULL,
          source_turn_count INTEGER NOT NULL
            CHECK (source_turn_count >= 0),
          transcript_sha256 TEXT NOT NULL
            CHECK (length(transcript_sha256) = 64),
          updated_at TEXT NOT NULL,
          updated_at_ms INTEGER NOT NULL,
          expires_at_ms INTEGER NOT NULL,
          FOREIGN KEY (session_id)
            REFERENCES ai_widget_sessions(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_ai_widget_legacy_memory_expiry
          ON ai_widget_legacy_memory(expires_at_ms);
      `);
      db.prepare(`
        INSERT INTO ai_widget_log_migrations (
          version, name, applied_at
        ) VALUES (5, 'legacy_conversation_memory_v1', ?)
      `).run(new Date().toISOString());
    })();
  }
}

function touchSession(
  db: Database.Database,
  input: {
    sessionId: string;
    sourcePage: string;
    runtimeMode: AiWidgetSessionMode;
    nowMs: number;
    expiresAtMs: number;
  },
) {
  const sessionId = validIdentifier(input.sessionId, 'session_id');
  const sourcePage = validSourcePage(input.sourcePage);
  if (!AI_WIDGET_SESSION_MODES.includes(input.runtimeMode)) {
    throw new Error('INVALID_RUNTIME_MODE');
  }
  const now = iso(input.nowMs);
  db.prepare(`
    INSERT INTO ai_widget_sessions (
      id, mode, source_page, created_at, created_at_ms,
      updated_at, updated_at_ms, expires_at_ms, runtime_mode
    ) VALUES (?, 'test', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_page = excluded.source_page,
      runtime_mode = excluded.runtime_mode,
      updated_at = excluded.updated_at,
      updated_at_ms = excluded.updated_at_ms,
      expires_at_ms = MAX(
        ai_widget_sessions.expires_at_ms,
        excluded.expires_at_ms
      )
  `).run(
    sessionId,
    sourcePage,
    now,
    input.nowMs,
    now,
    input.nowMs,
    input.expiresAtMs,
    input.runtimeMode,
  );
}

export function beginAiWidgetTurn(
  db: Database.Database,
  input: {
    turnId: string;
    sessionId: string;
    requestId: string;
    sourcePage: string;
    userContent: string;
    runtimeMode?: AiWidgetSessionMode;
    nowMs?: number;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  cleanupExpiredAiWidgetLogs(db, nowMs);
  const expiresAtMs = nowMs + AI_WIDGET_TEST_TRANSCRIPT_RETENTION_MS;
  const turnId = validIdentifier(input.turnId, 'turn_id');
  const requestId = validIdentifier(input.requestId, 'request_id');
  const sessionId = validIdentifier(input.sessionId, 'session_id');
  const sourcePage = validSourcePage(input.sourcePage);
  const userContent = requiredText(input.userContent, 'user_content', 1_200);
  const now = iso(nowMs);
  const runtimeMode = input.runtimeMode ?? 'preview';

  return db.transaction(() => {
    touchSession(db, {
      sessionId,
      sourcePage,
      runtimeMode,
      nowMs,
      expiresAtMs,
    });
    const existing = db.prepare(`
      SELECT *
      FROM ai_widget_turns
      WHERE id = ?
    `).get(turnId) as Parameters<typeof rowToTurn>[0] | undefined;
    if (existing) {
      if (
        existing.session_id !== sessionId
        || existing.source_page !== sourcePage
        || existing.user_content !== userContent
      ) {
        throw new Error('TURN_IDEMPOTENCY_CONFLICT');
      }
      return rowToTurn(existing);
    }
    db.prepare(`
      INSERT INTO ai_widget_turns (
        id, session_id, request_id, source_page, user_content,
        status, created_at, created_at_ms, updated_at, updated_at_ms,
        expires_at_ms
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `).run(
      turnId,
      sessionId,
      requestId,
      sourcePage,
      userContent,
      now,
      nowMs,
      now,
      nowMs,
      expiresAtMs,
    );
    return rowToTurn(
      db.prepare(`
        SELECT *
        FROM ai_widget_turns
        WHERE id = ?
      `).get(turnId) as Parameters<typeof rowToTurn>[0],
    );
  })();
}

export function completeAiWidgetTurn(
  db: Database.Database,
  input: {
    turnId: string;
    assistantContent: string;
    route: string;
    templateId?: string | null;
    elapsedMs: number;
    nowMs?: number;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  const turnId = validIdentifier(input.turnId, 'turn_id');
  const assistantContent = requiredText(
    input.assistantContent,
    'assistant_content',
    4_000,
  );
  const route = requiredText(input.route, 'route', 80);
  const templateId = optionalText(input.templateId, 80);
  const elapsedMs = Math.max(0, Math.trunc(input.elapsedMs));
  const now = iso(nowMs);
  const result = db.prepare(`
    UPDATE ai_widget_turns
    SET
      assistant_content = ?,
      route = ?,
      template_id = ?,
      status = 'answered',
      error_code = NULL,
      elapsed_ms = ?,
      updated_at = ?,
      updated_at_ms = ?
    WHERE id = ?
      AND status = 'pending'
  `).run(
    assistantContent,
    route,
    templateId,
    elapsedMs,
    now,
    nowMs,
    turnId,
  );
  if (result.changes !== 1) {
    const existing = getAiWidgetTurn(db, turnId);
    if (
      existing?.status === 'answered'
      && existing.assistantContent === assistantContent
    ) {
      return existing;
    }
    throw new Error('TURN_NOT_PENDING');
  }
  return getAiWidgetTurn(db, turnId) as AiWidgetTurnRow;
}

export function failAiWidgetTurn(
  db: Database.Database,
  input: {
    turnId: string;
    errorCode: string;
    elapsedMs: number;
    nowMs?: number;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  const turnId = validIdentifier(input.turnId, 'turn_id');
  const errorCode = requiredText(input.errorCode, 'error_code', 120)
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, '_');
  const now = iso(nowMs);
  db.prepare(`
    UPDATE ai_widget_turns
    SET
      status = 'error',
      error_code = ?,
      elapsed_ms = ?,
      updated_at = ?,
      updated_at_ms = ?
    WHERE id = ?
      AND status = 'pending'
  `).run(
    errorCode,
    Math.max(0, Math.trunc(input.elapsedMs)),
    now,
    nowMs,
    turnId,
  );
  return getAiWidgetTurn(db, turnId);
}

export function getAiWidgetTurn(
  db: Database.Database,
  turnId: string,
) {
  const row = db.prepare(`
    SELECT *
    FROM ai_widget_turns
    WHERE id = ?
  `).get(turnId) as Parameters<typeof rowToTurn>[0] | undefined;
  return row ? rowToTurn(row) : null;
}

function testLeadPublicId(id: string) {
  return `TEST-WGT-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function buildTestMaxPreview(input: {
  id: string;
  name: string;
  contact: string;
  objectDescription: string;
  taskDescription: string;
  sourcePage: string;
  sessionId: string;
  createdAt: string;
}) {
  return [
    'ТЕСТ — AI-ВИДЖЕТ РОСПАРК',
    'Не является реальным обращением клиента.',
    '',
    `Лид: ${testLeadPublicId(input.id)}`,
    `Имя: ${input.name}`,
    `Контакт: ${input.contact}`,
    `Объект: ${input.objectDescription}`,
    `Что интересует: ${input.taskDescription}`,
    '',
    'Источник: AI-виджет',
    `Страница: ${input.sourcePage}`,
    `Диалог: ${input.sessionId}`,
    `Время: ${input.createdAt}`,
  ].join('\n');
}

export function registerAiWidgetTestLead(
  db: Database.Database,
  input: {
    sessionId: string;
    submissionId: string;
    sourcePage: string;
    name: string;
    contact: string;
    objectDescription: string;
    taskDescription: string;
    consent: boolean;
    consentVersion: string;
    nowMs?: number;
    idFactory?: () => string;
  },
) {
  if (input.consent !== true) throw new Error('TEST_CONSENT_REQUIRED');
  const nowMs = input.nowMs ?? Date.now();
  cleanupExpiredAiWidgetLogs(db, nowMs);
  const expiresAtMs = nowMs + AI_WIDGET_TEST_TRANSCRIPT_RETENTION_MS;
  const sessionId = validIdentifier(input.sessionId, 'session_id');
  const submissionId = validIdentifier(input.submissionId, 'submission_id');
  const sourcePage = validSourcePage(input.sourcePage);
  const name = requiredText(input.name, 'name', 120);
  const contact = requiredText(input.contact, 'contact', 160);
  const objectDescription = requiredText(
    input.objectDescription,
    'object_description',
    240,
  );
  const taskDescription = requiredText(
    input.taskDescription,
    'task_description',
    800,
  );
  const consentVersion = requiredText(
    input.consentVersion,
    'consent_version',
    120,
  );
  const createdAt = iso(nowMs);

  return db.transaction(() => {
    touchSession(db, {
      sessionId,
      sourcePage,
      runtimeMode: 'preview',
      nowMs,
      expiresAtMs,
    });
    const existing = db.prepare(`
      SELECT *
      FROM ai_widget_test_leads
      WHERE submission_id = ?
    `).get(submissionId) as Parameters<typeof rowToTestLead>[0] | undefined;
    if (existing) {
      if (
        existing.session_id !== sessionId
        || existing.name !== name
        || existing.contact !== contact
        || existing.object_description !== objectDescription
        || existing.task_description !== taskDescription
      ) {
        throw new Error('TEST_LEAD_IDEMPOTENCY_CONFLICT');
      }
      return {
        ...rowToTestLead(existing),
        created: false,
        publicId: testLeadPublicId(existing.id),
      };
    }
    const id = input.idFactory?.() ?? randomUUID();
    const maxPreview = buildTestMaxPreview({
      id,
      name,
      contact,
      objectDescription,
      taskDescription,
      sourcePage,
      sessionId,
      createdAt,
    });
    db.prepare(`
      INSERT INTO ai_widget_test_leads (
        id, session_id, submission_id, name, contact,
        object_description, task_description, consent_version,
        consent_at, status, max_preview, created_at, created_at_ms,
        expires_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'simulated', ?, ?, ?, ?)
    `).run(
      id,
      sessionId,
      submissionId,
      name,
      contact,
      objectDescription,
      taskDescription,
      consentVersion,
      createdAt,
      maxPreview,
      createdAt,
      nowMs,
      expiresAtMs,
    );
    return {
      ...rowToTestLead(
        db.prepare(`
          SELECT *
          FROM ai_widget_test_leads
          WHERE id = ?
        `).get(id) as Parameters<typeof rowToTestLead>[0],
      ),
      created: true,
      publicId: testLeadPublicId(id),
    };
  })();
}

export function registerAiWidgetProductionLead(
  db: Database.Database,
  input: {
    sessionId: string;
    submissionId: string;
    sourcePage: string;
    registryLeadId: string;
    publicId: string;
    nowMs?: number;
    idFactory?: () => string;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  cleanupExpiredAiWidgetLogs(db, nowMs);
  const expiresAtMs = nowMs + AI_WIDGET_TRANSCRIPT_RETENTION_MS;
  const sessionId = validIdentifier(input.sessionId, 'session_id');
  const submissionId = validIdentifier(input.submissionId, 'submission_id');
  const sourcePage = validSourcePage(input.sourcePage);
  const registryLeadId = requiredText(
    input.registryLeadId,
    'registry_lead_id',
    128,
  );
  const publicId = requiredText(input.publicId, 'public_id', 32);
  if (!/^RSP-[A-F0-9]{8}$/.test(publicId)) {
    throw new Error('INVALID_PUBLIC_ID');
  }
  const createdAt = iso(nowMs);

  return db.transaction(() => {
    touchSession(db, {
      sessionId,
      sourcePage,
      runtimeMode: 'production',
      nowMs,
      expiresAtMs,
    });
    const existing = db.prepare(`
      SELECT *
      FROM ai_widget_production_leads
      WHERE submission_id = ?
    `).get(submissionId) as
      | Parameters<typeof rowToProductionLead>[0]
      | undefined;
    if (existing) {
      if (
        existing.session_id !== sessionId
        || existing.registry_lead_id !== registryLeadId
        || existing.public_id !== publicId
      ) {
        throw new Error('PRODUCTION_LEAD_IDEMPOTENCY_CONFLICT');
      }
      return {
        ...rowToProductionLead(existing),
        created: false,
      };
    }
    const id = input.idFactory?.() ?? randomUUID();
    db.prepare(`
      INSERT INTO ai_widget_production_leads (
        id, session_id, submission_id, registry_lead_id, public_id,
        status, created_at, created_at_ms, expires_at_ms
      ) VALUES (?, ?, ?, ?, ?, 'registered', ?, ?, ?)
    `).run(
      id,
      sessionId,
      submissionId,
      registryLeadId,
      publicId,
      createdAt,
      nowMs,
      expiresAtMs,
    );
    return {
      ...rowToProductionLead(
        db.prepare(`
          SELECT *
          FROM ai_widget_production_leads
          WHERE id = ?
        `).get(id) as Parameters<typeof rowToProductionLead>[0],
      ),
      created: true,
    };
  })();
}

export function consumeAiWidgetRateLimit(
  db: Database.Database,
  input: {
    scope: string;
    keyHash: string;
    windowMs: number;
    limit: number;
    nowMs?: number;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  const scope = requiredText(input.scope, 'scope', 80);
  const keyHash = requiredText(input.keyHash, 'key_hash', 128);
  if (!/^[a-f0-9]{64}$/i.test(keyHash)) {
    throw new Error('INVALID_RATE_LIMIT_KEY');
  }
  const windowMs = Math.trunc(input.windowMs);
  const limit = Math.trunc(input.limit);
  if (windowMs < 1_000 || windowMs > 7 * 24 * 60 * 60 * 1000) {
    throw new Error('INVALID_RATE_LIMIT_WINDOW');
  }
  if (limit < 1 || limit > 10_000) {
    throw new Error('INVALID_RATE_LIMIT');
  }

  return db.transaction(() => {
    db.prepare(`
      DELETE FROM ai_widget_rate_limits
      WHERE expires_at_ms <= ?
    `).run(nowMs);
    const existing = db.prepare(`
      SELECT window_started_ms, request_count
      FROM ai_widget_rate_limits
      WHERE scope = ? AND key_hash = ?
    `).get(scope, keyHash) as {
      window_started_ms: number;
      request_count: number;
    } | undefined;
    if (!existing || nowMs - existing.window_started_ms >= windowMs) {
      db.prepare(`
        INSERT INTO ai_widget_rate_limits (
          scope, key_hash, window_started_ms, request_count, expires_at_ms
        ) VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(scope, key_hash) DO UPDATE SET
          window_started_ms = excluded.window_started_ms,
          request_count = 1,
          expires_at_ms = excluded.expires_at_ms
      `).run(scope, keyHash, nowMs, nowMs + windowMs);
      return { allowed: true, remaining: limit - 1 };
    }
    if (existing.request_count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    db.prepare(`
      UPDATE ai_widget_rate_limits
      SET
        request_count = request_count + 1,
        expires_at_ms = ?
      WHERE scope = ? AND key_hash = ?
    `).run(
      existing.window_started_ms + windowMs,
      scope,
      keyHash,
    );
    return {
      allowed: true,
      remaining: Math.max(0, limit - existing.request_count - 1),
    };
  })();
}

export function listAiWidgetSessions(
  db: Database.Database,
  options: { limit?: number; offset?: number } = {},
) {
  cleanupExpiredAiWidgetLogs(db);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const total = (db.prepare(`
    SELECT COUNT(*) AS count
    FROM ai_widget_sessions
  `).get() as { count: number }).count;
  const rows = db.prepare(`
    SELECT
      ai_widget_sessions.*,
      COUNT(DISTINCT ai_widget_turns.id) AS turn_count,
      COUNT(DISTINCT CASE
        WHEN ai_widget_turns.status = 'answered' THEN ai_widget_turns.id
      END) AS answered_count,
      COUNT(DISTINCT CASE
        WHEN ai_widget_turns.status = 'error' THEN ai_widget_turns.id
      END) AS error_count,
      COUNT(DISTINCT ai_widget_test_leads.id) AS test_lead_count,
      COUNT(DISTINCT ai_widget_production_leads.id)
        AS production_lead_count,
      (
        SELECT latest_turn.user_content
        FROM ai_widget_turns AS latest_turn
        WHERE latest_turn.session_id = ai_widget_sessions.id
        ORDER BY latest_turn.created_at_ms DESC
        LIMIT 1
      ) AS latest_question
    FROM ai_widget_sessions
    LEFT JOIN ai_widget_turns
      ON ai_widget_turns.session_id = ai_widget_sessions.id
    LEFT JOIN ai_widget_test_leads
      ON ai_widget_test_leads.session_id = ai_widget_sessions.id
    LEFT JOIN ai_widget_production_leads
      ON ai_widget_production_leads.session_id = ai_widget_sessions.id
    GROUP BY ai_widget_sessions.id
    ORDER BY ai_widget_sessions.updated_at_ms DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Array<{
    id: string;
    runtime_mode: AiWidgetSessionMode;
    source_page: string;
    created_at: string;
    updated_at: string;
    expires_at_ms: number;
    turn_count: number;
    answered_count: number | null;
    error_count: number | null;
    test_lead_count: number;
    production_lead_count: number;
    latest_question: string | null;
  }>;
  const items: AiWidgetSessionSummary[] = rows.map((row) => ({
    id: row.id,
    mode: row.runtime_mode,
    sourcePage: row.source_page,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAtMs: row.expires_at_ms,
    turnCount: row.turn_count,
    answeredCount: row.answered_count ?? 0,
    errorCount: row.error_count ?? 0,
    testLeadCount: row.test_lead_count,
    productionLeadCount: row.production_lead_count,
    latestQuestion: row.latest_question,
  }));
  return {
    total,
    items,
    limit,
    offset,
  };
}

export function getAiWidgetSession(
  db: Database.Database,
  sessionId: string,
): AiWidgetSessionDetails | null {
  const session = db.prepare(`
    SELECT *
    FROM ai_widget_sessions
    WHERE id = ?
  `).get(sessionId) as {
    id: string;
    runtime_mode: AiWidgetSessionMode;
    source_page: string;
    created_at: string;
    updated_at: string;
    expires_at_ms: number;
  } | undefined;
  if (!session) return null;
  const turns = (db.prepare(`
    SELECT *
    FROM ai_widget_turns
    WHERE session_id = ?
    ORDER BY created_at_ms, id
  `).all(sessionId) as Array<Parameters<typeof rowToTurn>[0]>)
    .map(rowToTurn);
  const testLeads = (db.prepare(`
    SELECT *
    FROM ai_widget_test_leads
    WHERE session_id = ?
    ORDER BY created_at_ms, id
  `).all(sessionId) as Array<Parameters<typeof rowToTestLead>[0]>)
    .map(rowToTestLead);
  const productionLeads = (db.prepare(`
    SELECT *
    FROM ai_widget_production_leads
    WHERE session_id = ?
    ORDER BY created_at_ms, id
  `).all(sessionId) as Array<Parameters<typeof rowToProductionLead>[0]>)
    .map(rowToProductionLead);
  return {
    id: session.id,
    mode: session.runtime_mode,
    sourcePage: session.source_page,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    expiresAtMs: session.expires_at_ms,
    turns,
    testLeads,
    productionLeads,
  };
}

export function deleteAiWidgetSession(
  db: Database.Database,
  sessionId: string,
) {
  return db.prepare(`
    DELETE FROM ai_widget_sessions
    WHERE id = ?
  `).run(sessionId).changes === 1;
}

export function cleanupExpiredAiWidgetLogs(
  db: Database.Database,
  nowMs = Date.now(),
) {
  return db.transaction(() => {
    const expiredLegacyMemory = db.prepare(`
      DELETE FROM ai_widget_legacy_memory
      WHERE expires_at_ms <= ?
    `).run(nowMs).changes;
    const expiredTurns = db.prepare(`
      DELETE FROM ai_widget_turns
      WHERE expires_at_ms <= ?
    `).run(nowMs).changes;
    const expiredTestLeads = db.prepare(`
      DELETE FROM ai_widget_test_leads
      WHERE expires_at_ms <= ?
    `).run(nowMs).changes;
    const expiredProductionLeads = db.prepare(`
      DELETE FROM ai_widget_production_leads
      WHERE expires_at_ms <= ?
    `).run(nowMs).changes;
    db.prepare(`
      DELETE FROM ai_widget_rate_limits
      WHERE expires_at_ms <= ?
    `).run(nowMs);
    const expiredSessions = db.prepare(`
      DELETE FROM ai_widget_sessions
      WHERE expires_at_ms <= ?
        OR (
          NOT EXISTS (
            SELECT 1
            FROM ai_widget_turns
            WHERE ai_widget_turns.session_id = ai_widget_sessions.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM ai_widget_test_leads
            WHERE ai_widget_test_leads.session_id = ai_widget_sessions.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM ai_widget_production_leads
            WHERE ai_widget_production_leads.session_id =
              ai_widget_sessions.id
          )
        )
    `).run(nowMs).changes;
    return {
      expiredTurns,
      expiredTestLeads,
      expiredProductionLeads,
      expiredLegacyMemory,
      expiredSessions,
    };
  })();
}

function csvCell(value: string | number | null | undefined) {
  let output = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(output)) output = `'${output}`;
  return `"${output.replace(/"/g, '""')}"`;
}

export function buildAiWidgetTurnsCsv(
  sessions: AiWidgetSessionDetails[],
) {
  const rows = [[
    'Диалог',
    'Создан',
    'Страница',
    'Статус',
    'Маршрут',
    'Шаблон',
    'Вопрос',
    'Ответ',
    'Ошибка',
    'Задержка, мс',
  ]];
  for (const session of sessions) {
    for (const turn of session.turns) {
      rows.push([
        session.id,
        turn.createdAt,
        turn.sourcePage,
        turn.status,
        turn.route ?? '',
        turn.templateId ?? '',
        turn.userContent,
        turn.assistantContent ?? '',
        turn.errorCode ?? '',
        String(turn.elapsedMs ?? ''),
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
