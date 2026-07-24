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

const migrations: LeadRegistryMigration[] = [
  {
    version: 1,
    name: 'lead_registry_foundation',
    up: createLeadRegistryFoundation,
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
      SELECT submission_id, lead_id, payload_fingerprint
      FROM lead_submissions
      WHERE submission_id = ?
    `).get(submissionId) as LeadSubmissionRow | undefined;

    if (existingSubmission) {
      if (existingSubmission.payload_fingerprint !== payloadFingerprint) {
        throw new LeadRegistryError(
          'IDEMPOTENCY_CONFLICT',
          'Один submissionId нельзя использовать для разных данных.',
        );
      }
      return {
        leadId: existingSubmission.lead_id,
        submissionId,
        created: false,
        duplicate: false,
        idempotent: true,
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
        payload_fingerprint, received_at, received_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
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
    );

    return {
      leadId,
      submissionId,
      created: !duplicate,
      duplicate: Boolean(duplicate),
      idempotent: false,
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
  return db.prepare(`
    DELETE FROM lead_records
    WHERE expires_at <= ?
  `).run(nowMs).changes;
}
