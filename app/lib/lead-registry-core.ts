import { createHash, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';

export const LEAD_REGISTRY_TIMEZONE = 'Europe/Moscow';
export const LEAD_REGISTRY_WORKDAYS = [1, 2, 3, 4, 5] as const;
export const LEAD_REGISTRY_WORKDAY_START = '10:00';
export const LEAD_REGISTRY_WORKDAY_END = '18:00';
export const LEAD_REGISTRY_SLA_MINUTES = 60;
export const LEAD_DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SITE_LEAD_RETENTION_MS = 60 * 24 * 60 * 60 * 1000;
export const DEMO_FEEDBACK_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const LEAD_KINDS = ['site_form', 'demo_feedback'] as const;
export const LEAD_STATUSES = ['new', 'assigned', 'contacted', 'closed'] as const;
export const LEAD_CLOSE_OUTCOMES = [
  'processed',
  'no_contact',
  'not_target',
  'duplicate',
  'test',
] as const;
export const LEAD_NOTIFICATION_CHANNELS = ['max', 'email'] as const;
export const LEAD_OUTBOX_STATUSES = [
  'pending',
  'processing',
  'sent',
  'failed',
  'dead',
] as const;
export const LEAD_OUTBOX_MAX_ATTEMPTS = 8;
export const LEAD_OUTBOX_LEASE_MS = 5 * 60 * 1000;
export const LEAD_OUTBOX_BACKOFF_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  3 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
] as const;
export const LEAD_CONTEXT_KEYS = [
  'company',
  'object_type',
  'city',
  'access_points',
  'project_stage',
  'request_goal',
  'current_system',
  'project_interests',
  'message',
  'intent',
  'product',
  'package_name',
  'source_url_path',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'yclid',
  'gclid',
  'fbclid',
  'channel',
  'request_id',
  'demo_name',
] as const;

export type LeadKind = (typeof LEAD_KINDS)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadCloseOutcome = (typeof LEAD_CLOSE_OUTCOMES)[number];
export type LeadNotificationChannel = (typeof LEAD_NOTIFICATION_CHANNELS)[number];
export type LeadOutboxStatus = (typeof LEAD_OUTBOX_STATUSES)[number];

export type LeadRegistrationInput = {
  submissionId: string;
  kind: LeadKind;
  name?: string;
  phone: string;
  source: string;
  sourcePage?: string;
  sourceSection?: string;
  consentGranted: boolean;
  consentVersion: string;
  consentAt?: string;
  context?: Record<string, string | string[] | undefined>;
};

export type RegisterLeadOptions = {
  nowMs?: number;
  idFactory?: () => string;
  outboxChannels?: LeadNotificationChannel[];
};

export type LeadStatusTransitionInput = {
  leadId: string;
  toStatus: Exclude<LeadStatus, 'new'>;
  actor: string;
  assignedTo?: string;
  closeOutcome?: LeadCloseOutcome;
  nowMs?: number;
  eventIdFactory?: () => string;
};

type LeadRegistryMigration = {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
};

type LeadRecordRow = {
  id: string;
  phone: string;
  phone_hash: string;
  name: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  first_contact_at: string | null;
  closed_at: string | null;
  close_outcome: LeadCloseOutcome | null;
  created_at: string;
  created_at_ms: number;
  updated_at: string;
  updated_at_ms: number;
  expires_at: number;
};

type LeadSubmissionRow = {
  submission_id: string;
  lead_id: string;
  payload_fingerprint: string;
  is_duplicate: number;
  submission_expires_at: number;
};

type LeadOutboxRow = {
  id: string;
  submission_id: string;
  lead_id: string;
  channel: LeadNotificationChannel;
  status: LeadOutboxStatus;
  attempt_count: number;
  available_at_ms: number;
  lock_token: string | null;
};

export type ClaimedLeadNotification = {
  id: string;
  submissionId: string;
  leadId: string;
  channel: LeadNotificationChannel;
  attemptCount: number;
  lockToken: string;
  duplicate: boolean;
  kind: LeadKind;
  name: string | null;
  phone: string;
  source: string;
  sourcePage: string | null;
  sourceSection: string | null;
  context: Record<string, string | string[]>;
  receivedAt: string;
};

export type ProcessLeadOutboxResult = {
  claimed: number;
  sent: number;
  failed: number;
  dead: number;
};

export class LeadRegistryError extends Error {
  public readonly code: string;

  constructor(
    code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LeadRegistryError';
    this.code = code;
  }
}

function createLeadRegistryFoundation(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_records (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL CHECK (
        length(phone) = 11 AND phone GLOB '7[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
      ),
      phone_hash TEXT NOT NULL,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'assigned', 'contacted', 'closed')),
      assigned_to TEXT,
      assigned_at TEXT,
      first_contact_at TEXT,
      closed_at TEXT,
      close_outcome TEXT CHECK (
        close_outcome IS NULL OR close_outcome IN (
          'processed', 'no_contact', 'not_target', 'duplicate', 'test'
        )
      ),
      created_at TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      updated_at_ms INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lead_submissions (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL UNIQUE,
      lead_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('site_form', 'demo_feedback')),
      name TEXT,
      source TEXT NOT NULL,
      source_page TEXT,
      source_section TEXT,
      consent INTEGER NOT NULL CHECK (consent = 1),
      consent_version TEXT NOT NULL,
      consent_at TEXT NOT NULL,
      context_json TEXT NOT NULL DEFAULT '{}',
      payload_fingerprint TEXT NOT NULL,
      received_at TEXT NOT NULL,
      received_at_ms INTEGER NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES lead_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lead_status_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      from_status TEXT CHECK (
        from_status IS NULL OR from_status IN ('new', 'assigned', 'contacted', 'closed')
      ),
      to_status TEXT NOT NULL
        CHECK (to_status IN ('new', 'assigned', 'contacted', 'closed')),
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES lead_records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_lead_records_phone_open
      ON lead_records(phone_hash, status, updated_at_ms);
    CREATE INDEX IF NOT EXISTS idx_lead_records_status
      ON lead_records(status, created_at_ms);
    CREATE INDEX IF NOT EXISTS idx_lead_records_expiry
      ON lead_records(expires_at);
    CREATE INDEX IF NOT EXISTS idx_lead_submissions_lead
      ON lead_submissions(lead_id, received_at_ms);
    CREATE INDEX IF NOT EXISTS idx_lead_status_events_lead
      ON lead_status_events(lead_id, created_at_ms);
  `);
}

function hasColumn(db: Database.Database, tableName: string, columnName: string) {
  const columns = db.pragma(`table_info(${tableName})`) as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function createLeadNotificationOutbox(db: Database.Database) {
  if (!hasColumn(db, 'lead_submissions', 'is_duplicate')) {
    db.exec(`
      ALTER TABLE lead_submissions
      ADD COLUMN is_duplicate INTEGER NOT NULL DEFAULT 0
        CHECK (is_duplicate IN (0, 1));
    `);
  }
  if (!hasColumn(db, 'lead_submissions', 'expires_at')) {
    db.exec(`
      ALTER TABLE lead_submissions
      ADD COLUMN expires_at INTEGER
        CHECK (expires_at IS NULL OR expires_at > 0);
    `);
    db.prepare(`
      UPDATE lead_submissions
      SET expires_at = received_at_ms + CASE kind
        WHEN 'demo_feedback' THEN ?
        ELSE ?
      END
      WHERE expires_at IS NULL
    `).run(DEMO_FEEDBACK_RETENTION_MS, SITE_LEAD_RETENTION_MS);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_notification_outbox (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL CHECK (channel IN ('max', 'email')),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      available_at_ms INTEGER NOT NULL,
      locked_at_ms INTEGER,
      lock_token TEXT,
      last_error_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sent_at TEXT,
      UNIQUE (submission_id, channel),
      FOREIGN KEY (submission_id)
        REFERENCES lead_submissions(submission_id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id)
        REFERENCES lead_records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_lead_outbox_ready
      ON lead_notification_outbox(status, available_at_ms);
    CREATE INDEX IF NOT EXISTS idx_lead_outbox_lead
      ON lead_notification_outbox(lead_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_lead_submissions_expiry
      ON lead_submissions(expires_at);
  `);
}

const migrations: LeadRegistryMigration[] = [
  {
    version: 1,
    name: 'lead_registry_foundation',
    up: createLeadRegistryFoundation,
  },
  {
    version: 2,
    name: 'lead_notification_outbox',
    up: createLeadNotificationOutbox,
  },
];

function text(value: string | undefined, field: string, maxLength: number, required = false) {
  const normalized = value?.trim() ?? '';
  if (required && !normalized) {
    throw new LeadRegistryError('INVALID_INPUT', `Поле ${field} обязательно.`);
  }
  if (normalized.length > maxLength) {
    throw new LeadRegistryError('INVALID_INPUT', `Поле ${field} слишком длинное.`);
  }
  return normalized || null;
}

export function normalizeLeadPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.length === 10
    ? `7${digits}`
    : digits.startsWith('8') && digits.length === 11
      ? `7${digits.slice(1)}`
      : digits;

  if (!/^7\d{10}$/.test(normalized)) {
    throw new LeadRegistryError('INVALID_PHONE', 'Проверьте российский номер телефона.');
  }
  return normalized;
}

function normalizeContext(value: LeadRegistrationInput['context']) {
  if (!value) return {};
  const entries = Object.entries(value);
  if (entries.length > 24) {
    throw new LeadRegistryError('INVALID_CONTEXT', 'Слишком много полей контекста.');
  }

  return entries.reduce<Record<string, string | string[]>>((result, [key, raw]) => {
    if (!/^[a-z][a-z0-9_]{0,63}$/i.test(key) || raw === undefined) {
      if (raw === undefined) return result;
      throw new LeadRegistryError('INVALID_CONTEXT', 'Некорректный ключ контекста.');
    }
    if (!(LEAD_CONTEXT_KEYS as readonly string[]).includes(key)) {
      throw new LeadRegistryError('INVALID_CONTEXT', `Поле ${key} не входит в allowlist.`);
    }
    if (typeof raw === 'string') {
      if (raw.length > 4_000) {
        throw new LeadRegistryError('INVALID_CONTEXT', `Поле ${key} слишком длинное.`);
      }
      result[key] = raw;
      return result;
    }
    if (!Array.isArray(raw) || raw.length > 24 || raw.some((item) => (
      typeof item !== 'string' || item.length > 500
    ))) {
      throw new LeadRegistryError('INVALID_CONTEXT', `Некорректное поле ${key}.`);
    }
    result[key] = raw;
    return result;
  }, {});
}

function fingerprint(input: {
  submissionId: string;
  kind: LeadKind;
  name: string | null;
  phone: string;
  source: string;
  sourcePage: string | null;
  sourceSection: string | null;
  consentVersion: string;
  consentAt: string | null;
  context: Record<string, string | string[]>;
}) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function phoneHash(phone: string) {
  return createHash('sha256').update(phone).digest('hex');
}

function iso(nowMs: number) {
  const value = new Date(nowMs);
  if (!Number.isFinite(value.getTime())) {
    throw new LeadRegistryError('INVALID_TIME', 'Некорректное время операции.');
  }
  return value.toISOString();
}

function defaultId() {
  return randomBytes(16).toString('hex');
}

function retentionMs(kind: LeadKind) {
  return kind === 'demo_feedback' ? DEMO_FEEDBACK_RETENTION_MS : SITE_LEAD_RETENTION_MS;
}

export function runLeadRegistryMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Map(
    (db.prepare(`
      SELECT version, name
      FROM lead_schema_migrations
      ORDER BY version
    `).all() as Array<{ version: number; name: string }>).map((item) => (
      [item.version, item.name]
    )),
  );

  for (const migration of migrations) {
    const currentName = applied.get(migration.version);
    if (currentName) {
      if (currentName !== migration.name) {
        throw new LeadRegistryError(
          'MIGRATION_CONFLICT',
          `Конфликт lead-миграции v${migration.version}: ${currentName}.`,
        );
      }
      continue;
    }

    db.transaction(() => {
      migration.up(db);
      db.prepare(`
        INSERT INTO lead_schema_migrations (version, name, applied_at)
        VALUES (?, ?, ?)
      `).run(migration.version, migration.name, new Date().toISOString());
    })();
  }
}

export function listAppliedLeadRegistryMigrations(db: Database.Database) {
  return db.prepare(`
    SELECT version, name, applied_at
    FROM lead_schema_migrations
    ORDER BY version
  `).all() as Array<{ version: number; name: string; applied_at: string }>;
}

function normalizeOutboxChannels(channels: LeadNotificationChannel[] | undefined) {
  const unique = [...new Set(channels ?? [])];
  for (const channel of unique) {
    if (!LEAD_NOTIFICATION_CHANNELS.includes(channel)) {
      throw new LeadRegistryError(
        'INVALID_NOTIFICATION_CHANNEL',
        'Некорректный канал уведомления.',
      );
    }
  }
  return unique;
}

function enqueueLeadNotifications(
  db: Database.Database,
  input: {
    submissionId: string;
    leadId: string;
    channels: LeadNotificationChannel[];
    now: string;
    nowMs: number;
    idFactory: () => string;
  },
) {
  let queued = 0;
  const statement = db.prepare(`
    INSERT INTO lead_notification_outbox (
      id, submission_id, lead_id, channel, status, attempt_count,
      available_at_ms, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)
    ON CONFLICT(submission_id, channel) DO NOTHING
  `);

  for (const channel of input.channels) {
    queued += statement.run(
      input.idFactory(),
      input.submissionId,
      input.leadId,
      channel,
      input.nowMs,
      input.now,
      input.now,
    ).changes;
  }
  return queued;
}

export function registerLead(
  db: Database.Database,
  input: LeadRegistrationInput,
  options: RegisterLeadOptions = {},
) {
  const nowMs = options.nowMs ?? Date.now();
  const now = iso(nowMs);
  const submissionId = text(input.submissionId, 'submissionId', 128, true) as string;
  if (!/^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(submissionId)) {
    throw new LeadRegistryError('INVALID_SUBMISSION_ID', 'Некорректный submissionId.');
  }
  if (!LEAD_KINDS.includes(input.kind)) {
    throw new LeadRegistryError('INVALID_KIND', 'Некорректный тип лида.');
  }
  if (input.consentGranted !== true) {
    throw new LeadRegistryError('CONSENT_REQUIRED', 'Для регистрации требуется согласие.');
  }

  const name = text(input.name, 'name', 200);
  const phone = normalizeLeadPhone(input.phone);
  const hash = phoneHash(phone);
  const source = text(input.source, 'source', 120, true) as string;
  const sourcePage = text(input.sourcePage, 'sourcePage', 500);
  const sourceSection = text(input.sourceSection, 'sourceSection', 200);
  const consentVersion = text(input.consentVersion, 'consentVersion', 160, true) as string;
  const consentAtFromInput = input.consentAt
    ? iso(new Date(input.consentAt).getTime())
    : null;
  const consentAt = consentAtFromInput ?? now;
  const context = normalizeContext(input.context);
  const outboxChannels = normalizeOutboxChannels(options.outboxChannels);
  const payloadFingerprint = fingerprint({
    submissionId,
    kind: input.kind,
    name,
    phone,
    source,
    sourcePage,
    sourceSection,
    consentVersion,
    consentAt: consentAtFromInput,
    context,
  });
  const idFactory = options.idFactory ?? defaultId;

  return db.transaction(() => {
    const existingSubmission = db.prepare(`
      SELECT
        lead_submissions.submission_id,
        lead_submissions.lead_id,
        lead_submissions.payload_fingerprint,
        lead_submissions.is_duplicate,
        lead_submissions.expires_at AS submission_expires_at
      FROM lead_submissions
      JOIN lead_records
        ON lead_records.id = lead_submissions.lead_id
      WHERE lead_submissions.submission_id = ?
    `).get(submissionId) as LeadSubmissionRow | undefined;

    if (existingSubmission) {
      if (existingSubmission.payload_fingerprint !== payloadFingerprint) {
        throw new LeadRegistryError(
          'IDEMPOTENCY_CONFLICT',
          'Один submissionId нельзя использовать для разных данных.',
        );
      }
      const outboxQueued = enqueueLeadNotifications(db, {
        submissionId,
        leadId: existingSubmission.lead_id,
        channels: outboxChannels,
        now,
        nowMs,
        idFactory,
      });
      return {
        leadId: existingSubmission.lead_id,
        submissionId,
        created: false,
        duplicate: existingSubmission.is_duplicate === 1,
        idempotent: true,
        outboxQueued,
        submissionExpiresAt: existingSubmission.submission_expires_at,
      };
    }

    const duplicate = db.prepare(`
      SELECT lead_records.*
      FROM lead_records
      JOIN lead_submissions
        ON lead_submissions.lead_id = lead_records.id
      WHERE lead_records.phone_hash = ?
        AND lead_records.status != 'closed'
        AND lead_submissions.received_at_ms >= ?
      ORDER BY lead_submissions.received_at_ms DESC
      LIMIT 1
    `).get(hash, nowMs - LEAD_DUPLICATE_WINDOW_MS) as LeadRecordRow | undefined;

    const leadId = duplicate?.id ?? idFactory();
    const submissionRowId = idFactory();
    const expiresAt = nowMs + retentionMs(input.kind);

    if (!duplicate) {
      db.prepare(`
        INSERT INTO lead_records (
          id, phone, phone_hash, name, status,
          created_at, created_at_ms, updated_at, updated_at_ms, expires_at
        ) VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)
      `).run(leadId, phone, hash, name, now, nowMs, now, nowMs, expiresAt);

      db.prepare(`
        INSERT INTO lead_status_events (
          id, lead_id, from_status, to_status, actor, created_at, created_at_ms
        ) VALUES (?, ?, NULL, 'new', 'system:registration', ?, ?)
      `).run(idFactory(), leadId, now, nowMs);
    } else {
      db.prepare(`
        UPDATE lead_records
        SET
          name = COALESCE(name, ?),
          updated_at = ?,
          updated_at_ms = ?,
          expires_at = MAX(expires_at, ?)
        WHERE id = ?
      `).run(name, now, nowMs, expiresAt, leadId);
    }

    db.prepare(`
      INSERT INTO lead_submissions (
        id, submission_id, lead_id, kind, name, source, source_page,
        source_section, consent, consent_version, consent_at, context_json,
        payload_fingerprint, received_at, received_at_ms, is_duplicate,
        expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      submissionRowId,
      submissionId,
      leadId,
      input.kind,
      name,
      source,
      sourcePage,
      sourceSection,
      consentVersion,
      consentAt,
      JSON.stringify(context),
      payloadFingerprint,
      now,
      nowMs,
      duplicate ? 1 : 0,
      expiresAt,
    );

    const outboxQueued = enqueueLeadNotifications(db, {
      submissionId,
      leadId,
      channels: outboxChannels,
      now,
      nowMs,
      idFactory,
    });

    return {
      leadId,
      submissionId,
      created: !duplicate,
      duplicate: Boolean(duplicate),
      idempotent: false,
      outboxQueued,
      submissionExpiresAt: expiresAt,
    };
  })();
}

const allowedTransitions: Record<LeadStatus, LeadStatus[]> = {
  new: ['assigned'],
  assigned: ['contacted'],
  contacted: ['closed'],
  closed: [],
};

export function transitionLeadStatus(
  db: Database.Database,
  input: LeadStatusTransitionInput,
) {
  const nowMs = input.nowMs ?? Date.now();
  const now = iso(nowMs);
  const actor = text(input.actor, 'actor', 160, true) as string;
  const assignedTo = text(input.assignedTo, 'assignedTo', 200);
  const idFactory = input.eventIdFactory ?? defaultId;

  return db.transaction(() => {
    const current = db.prepare(`
      SELECT *
      FROM lead_records
      WHERE id = ?
    `).get(input.leadId) as LeadRecordRow | undefined;
    if (!current) {
      throw new LeadRegistryError('LEAD_NOT_FOUND', 'Лид не найден.');
    }
    if (!allowedTransitions[current.status].includes(input.toStatus)) {
      throw new LeadRegistryError(
        'INVALID_STATUS_TRANSITION',
        `Переход ${current.status} → ${input.toStatus} запрещён.`,
      );
    }
    if (input.toStatus === 'assigned' && !assignedTo) {
      throw new LeadRegistryError('ASSIGNEE_REQUIRED', 'Нужно назначить ответственного.');
    }
    if (input.toStatus === 'closed' && (
      !input.closeOutcome || !LEAD_CLOSE_OUTCOMES.includes(input.closeOutcome)
    )) {
      throw new LeadRegistryError('CLOSE_OUTCOME_REQUIRED', 'Нужен результат закрытия.');
    }

    const nextAssignedTo = input.toStatus === 'assigned' ? assignedTo : current.assigned_to;
    const nextAssignedAt = input.toStatus === 'assigned' ? now : current.assigned_at;
    const nextFirstContactAt = input.toStatus === 'contacted' ? now : current.first_contact_at;
    const nextClosedAt = input.toStatus === 'closed' ? now : current.closed_at;
    const nextOutcome = input.toStatus === 'closed' ? input.closeOutcome : current.close_outcome;

    db.prepare(`
      UPDATE lead_records
      SET
        status = ?,
        assigned_to = ?,
        assigned_at = ?,
        first_contact_at = ?,
        closed_at = ?,
        close_outcome = ?,
        updated_at = ?,
        updated_at_ms = ?
      WHERE id = ?
    `).run(
      input.toStatus,
      nextAssignedTo,
      nextAssignedAt,
      nextFirstContactAt,
      nextClosedAt,
      nextOutcome,
      now,
      nowMs,
      current.id,
    );

    db.prepare(`
      INSERT INTO lead_status_events (
        id, lead_id, from_status, to_status, actor, created_at, created_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      idFactory(),
      current.id,
      current.status,
      input.toStatus,
      actor,
      now,
      nowMs,
    );

    return db.prepare(`
      SELECT *
      FROM lead_records
      WHERE id = ?
    `).get(current.id) as LeadRecordRow;
  })();
}

export function cleanupExpiredLeads(db: Database.Database, nowMs = Date.now()) {
  return db.transaction(() => {
    db.prepare(`
      DELETE FROM lead_submissions
      WHERE expires_at <= ?
    `).run(nowMs);
    return db.prepare(`
      DELETE FROM lead_records
      WHERE NOT EXISTS (
        SELECT 1
        FROM lead_submissions
        WHERE lead_submissions.lead_id = lead_records.id
      )
    `).run().changes;
  })();
}

function parseStoredContext(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('INVALID_CONTEXT_JSON');
    }
    return parsed as Record<string, string | string[]>;
  } catch {
    throw new LeadRegistryError(
      'INVALID_STORED_CONTEXT',
      'Контекст заявки в реестре повреждён.',
    );
  }
}

function outboxBackoffMs(attemptCount: number) {
  const index = Math.min(
    Math.max(attemptCount - 1, 0),
    LEAD_OUTBOX_BACKOFF_MS.length - 1,
  );
  return LEAD_OUTBOX_BACKOFF_MS[index];
}

function safeOutboxErrorCode(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, '_')
    .slice(0, 120);
  return normalized || 'DELIVERY_ERROR';
}

function loadClaimedLeadNotification(
  db: Database.Database,
  row: LeadOutboxRow,
): ClaimedLeadNotification {
  const details = db.prepare(`
    SELECT
      lead_submissions.kind,
      lead_submissions.name,
      lead_submissions.source,
      lead_submissions.source_page,
      lead_submissions.source_section,
      lead_submissions.context_json,
      lead_submissions.received_at,
      lead_submissions.is_duplicate,
      lead_records.phone
    FROM lead_notification_outbox
    JOIN lead_submissions
      ON lead_submissions.submission_id =
        lead_notification_outbox.submission_id
    JOIN lead_records
      ON lead_records.id = lead_notification_outbox.lead_id
    WHERE lead_notification_outbox.id = ?
  `).get(row.id) as {
    kind: LeadKind;
    name: string | null;
    source: string;
    source_page: string | null;
    source_section: string | null;
    context_json: string;
    received_at: string;
    is_duplicate: number;
    phone: string;
  } | undefined;

  if (!details || !row.lock_token) {
    throw new LeadRegistryError(
      'OUTBOX_RECORD_INVALID',
      'Не удалось загрузить уведомление из outbox.',
    );
  }

  return {
    id: row.id,
    submissionId: row.submission_id,
    leadId: row.lead_id,
    channel: row.channel,
    attemptCount: row.attempt_count,
    lockToken: row.lock_token,
    duplicate: details.is_duplicate === 1,
    kind: details.kind,
    name: details.name,
    phone: details.phone,
    source: details.source,
    sourcePage: details.source_page,
    sourceSection: details.source_section,
    context: parseStoredContext(details.context_json),
    receivedAt: details.received_at,
  };
}

export function claimLeadNotifications(
  db: Database.Database,
  options: {
    nowMs?: number;
    limit?: number;
    leaseMs?: number;
    maxAttempts?: number;
    lockTokenFactory?: () => string;
  } = {},
) {
  const nowMs = options.nowMs ?? Date.now();
  const now = iso(nowMs);
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 20), 1), 100);
  const leaseMs = Math.max(options.leaseMs ?? LEAD_OUTBOX_LEASE_MS, 1_000);
  const maxAttempts = Math.max(options.maxAttempts ?? LEAD_OUTBOX_MAX_ATTEMPTS, 1);
  const lockTokenFactory = options.lockTokenFactory ?? defaultId;

  return db.transaction(() => {
    db.prepare(`
      UPDATE lead_notification_outbox
      SET
        status = 'dead',
        locked_at_ms = NULL,
        lock_token = NULL,
        last_error_code = COALESCE(last_error_code, 'MAX_ATTEMPTS_REACHED'),
        updated_at = ?
      WHERE status IN ('pending', 'processing', 'failed')
        AND attempt_count >= ?
        AND (
          status IN ('pending', 'failed')
          OR (
            status = 'processing'
            AND locked_at_ms <= ?
          )
        )
    `).run(now, maxAttempts, nowMs - leaseMs);

    const candidates = db.prepare(`
      SELECT id
      FROM lead_notification_outbox
      WHERE attempt_count < ?
        AND (
          (
            status IN ('pending', 'failed')
            AND available_at_ms <= ?
          )
          OR (
            status = 'processing'
            AND locked_at_ms <= ?
          )
        )
      ORDER BY available_at_ms ASC, created_at ASC
      LIMIT ?
    `).all(
      maxAttempts,
      nowMs,
      nowMs - leaseMs,
      limit,
    ) as Array<{ id: string }>;

    const claimed: ClaimedLeadNotification[] = [];
    for (const candidate of candidates) {
      const lockToken = lockTokenFactory();
      const updated = db.prepare(`
        UPDATE lead_notification_outbox
        SET
          status = 'processing',
          attempt_count = attempt_count + 1,
          locked_at_ms = ?,
          lock_token = ?,
          updated_at = ?
        WHERE id = ?
          AND attempt_count < ?
          AND (
            (
              status IN ('pending', 'failed')
              AND available_at_ms <= ?
            )
            OR (
              status = 'processing'
              AND locked_at_ms <= ?
            )
          )
      `).run(
        nowMs,
        lockToken,
        now,
        candidate.id,
        maxAttempts,
        nowMs,
        nowMs - leaseMs,
      );
      if (updated.changes !== 1) continue;

      const row = db.prepare(`
        SELECT
          id, submission_id, lead_id, channel, status, attempt_count,
          available_at_ms, lock_token
        FROM lead_notification_outbox
        WHERE id = ?
      `).get(candidate.id) as LeadOutboxRow;
      claimed.push(loadClaimedLeadNotification(db, row));
    }
    return claimed;
  })();
}

export function markLeadNotificationSent(
  db: Database.Database,
  input: {
    id: string;
    lockToken: string;
    nowMs?: number;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  const now = iso(nowMs);
  const result = db.prepare(`
    UPDATE lead_notification_outbox
    SET
      status = 'sent',
      locked_at_ms = NULL,
      lock_token = NULL,
      last_error_code = NULL,
      updated_at = ?,
      sent_at = ?
    WHERE id = ?
      AND status = 'processing'
      AND lock_token = ?
  `).run(now, now, input.id, input.lockToken);
  if (result.changes !== 1) {
    throw new LeadRegistryError(
      'OUTBOX_LEASE_LOST',
      'Lease уведомления больше не принадлежит текущему worker.',
    );
  }
}

export function markLeadNotificationFailed(
  db: Database.Database,
  input: {
    id: string;
    lockToken: string;
    errorCode: string;
    nowMs?: number;
    maxAttempts?: number;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  const now = iso(nowMs);
  const maxAttempts = Math.max(input.maxAttempts ?? LEAD_OUTBOX_MAX_ATTEMPTS, 1);
  const current = db.prepare(`
    SELECT attempt_count
    FROM lead_notification_outbox
    WHERE id = ?
      AND status = 'processing'
      AND lock_token = ?
  `).get(input.id, input.lockToken) as { attempt_count: number } | undefined;
  if (!current) {
    throw new LeadRegistryError(
      'OUTBOX_LEASE_LOST',
      'Lease уведомления больше не принадлежит текущему worker.',
    );
  }

  const dead = current.attempt_count >= maxAttempts;
  const availableAtMs = dead
    ? nowMs
    : nowMs + outboxBackoffMs(current.attempt_count);
  db.prepare(`
    UPDATE lead_notification_outbox
    SET
      status = ?,
      available_at_ms = ?,
      locked_at_ms = NULL,
      lock_token = NULL,
      last_error_code = ?,
      updated_at = ?
    WHERE id = ?
      AND status = 'processing'
      AND lock_token = ?
  `).run(
    dead ? 'dead' : 'failed',
    availableAtMs,
    safeOutboxErrorCode(input.errorCode),
    now,
    input.id,
    input.lockToken,
  );
  return dead ? 'dead' as const : 'failed' as const;
}

function deliveryErrorCode(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return safeOutboxErrorCode(error.code);
  }
  return 'DELIVERY_ERROR';
}

export async function processLeadOutboxBatch(
  db: Database.Database,
  deliver: (job: ClaimedLeadNotification) => Promise<void>,
  options: {
    nowMs?: number;
    limit?: number;
    leaseMs?: number;
    maxAttempts?: number;
    lockTokenFactory?: () => string;
  } = {},
): Promise<ProcessLeadOutboxResult> {
  const nowMs = options.nowMs ?? Date.now();
  const jobs = claimLeadNotifications(db, { ...options, nowMs });
  const result: ProcessLeadOutboxResult = {
    claimed: jobs.length,
    sent: 0,
    failed: 0,
    dead: 0,
  };

  for (const job of jobs) {
    try {
      await deliver(job);
      markLeadNotificationSent(db, {
        id: job.id,
        lockToken: job.lockToken,
        nowMs,
      });
      result.sent += 1;
    } catch (error) {
      const status = markLeadNotificationFailed(db, {
        id: job.id,
        lockToken: job.lockToken,
        errorCode: deliveryErrorCode(error),
        nowMs,
        maxAttempts: options.maxAttempts,
      });
      result[status] += 1;
    }
  }
  return result;
}
