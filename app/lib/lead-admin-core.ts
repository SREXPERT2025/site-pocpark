import { randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { LeadAdminRole } from './lead-admin-auth-core';
import {
  LEAD_KINDS,
  LEAD_STATUSES,
  type LeadCloseOutcome,
  type LeadKind,
  type LeadStatus,
  transitionLeadStatus,
} from './lead-registry-core';

export const LEAD_ADMIN_AUDIT_ACTIONS = [
  'login_success',
  'logout',
  'list_view',
  'export',
  'status_change',
  'delete',
] as const;

export type LeadAdminAuditAction =
  (typeof LEAD_ADMIN_AUDIT_ACTIONS)[number];

export type LeadAdminActor = {
  userId: string;
  role: LeadAdminRole;
};

export type LeadAdminListFilters = {
  status?: LeadStatus;
  kind?: LeadKind;
  search?: string;
  fromMs?: number;
  toMs?: number;
  page?: number;
  pageSize?: number;
};

export type LeadAdminListItem = {
  id: string;
  publicId: string;
  name: string | null;
  phone: string;
  status: LeadStatus;
  assignedTo: string | null;
  assignedAt: string | null;
  firstContactAt: string | null;
  closedAt: string | null;
  closeOutcome: LeadCloseOutcome | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: number;
  submissionCount: number;
  latestKind: LeadKind;
  latestSource: string;
  latestSourcePage: string | null;
  latestReceivedAt: string;
  latestContext: Record<string, string | string[]>;
  latestIsDuplicate: boolean;
};

export type LeadAdminAnalytics = {
  period: {
    fromMs: number | null;
    toMs: number | null;
    timezone: 'Europe/Moscow';
  };
  funnel: {
    received: number;
    assigned: number;
    contacted: number;
    closed: number;
  };
  submissions: {
    received: number;
    duplicates: number;
  };
  firstContactSla: {
    targetWorkingMinutes: 60;
    eligible: number;
    met: number;
    breached: number;
    pending: number;
    averageWorkingMinutes: number | null;
  };
  sources: Array<{
    source: string;
    sourcePage: string | null;
    submissions: number;
    duplicates: number;
  }>;
};

function id() {
  return randomBytes(16).toString('hex');
}

function publicLeadId(leadId: string) {
  return `RSP-${leadId.slice(0, 8).toUpperCase()}`;
}

function parseContext(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string | string[]>;
  } catch {
    return {};
  }
}

function auditMetadata(value: Record<string, string | number | boolean | null>) {
  const entries = Object.entries(value);
  if (entries.length > 16) throw new Error('Слишком много audit metadata.');
  const normalized = entries.reduce<Record<string, string | number | boolean | null>>(
    (result, [key, item]) => {
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
        throw new Error('Некорректный audit metadata key.');
      }
      if (
        /(?:phone|name|message|context)/i.test(key) ||
        (typeof item === 'string' && item.length > 200)
      ) {
        throw new Error('Недопустимые audit metadata.');
      }
      result[key] = item;
      return result;
    },
    {},
  );
  const json = JSON.stringify(normalized);
  if (json.length > 2_000) throw new Error('Audit metadata слишком длинные.');
  return json;
}

export function recordLeadAdminAudit(
  db: Database.Database,
  input: {
    actor: LeadAdminActor;
    action: LeadAdminAuditAction;
    leadId?: string;
    metadata?: Record<string, string | number | boolean | null>;
    nowMs?: number;
  },
) {
  if (!LEAD_ADMIN_AUDIT_ACTIONS.includes(input.action)) {
    throw new Error('Некорректное audit action.');
  }
  const nowMs = input.nowMs ?? Date.now();
  db.prepare(`
    INSERT INTO lead_admin_audit_events (
      id, actor_user_id, actor_role, action, lead_id, metadata_json,
      created_at, created_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id(),
    input.actor.userId,
    input.actor.role,
    input.action,
    input.leadId ?? null,
    auditMetadata(input.metadata ?? {}),
    new Date(nowMs).toISOString(),
    nowMs,
  );
}

function positiveInteger(value: number | undefined, fallback: number, max: number) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error('INVALID_PAGE');
  return Math.min(value, max);
}

function escapedLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function listLeadAdminLeads(
  db: Database.Database,
  filters: LeadAdminListFilters = {},
  options: { maxPageSize?: number } = {},
) {
  if (filters.status && !LEAD_STATUSES.includes(filters.status)) {
    throw new Error('INVALID_STATUS');
  }
  if (filters.kind && !LEAD_KINDS.includes(filters.kind)) {
    throw new Error('INVALID_KIND');
  }
  const page = positiveInteger(filters.page, 1, 100_000);
  const pageSize = positiveInteger(
    filters.pageSize,
    25,
    options.maxPageSize ?? 100,
  );
  const conditions: string[] = [];
  const parameters: Array<string | number> = [];

  if (filters.status) {
    conditions.push('lead_records.status = ?');
    parameters.push(filters.status);
  }
  if (filters.kind) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM lead_submissions kind_submission
        WHERE kind_submission.lead_id = lead_records.id
          AND kind_submission.kind = ?
      )
    `);
    parameters.push(filters.kind);
  }
  const search = filters.search?.trim();
  if (search) {
    if (search.length > 100) throw new Error('INVALID_SEARCH');
    const pattern = `%${escapedLike(search)}%`;
    const digits = search.replace(/\D/g, '');
    const publicIdPrefix = /^RSP-([A-F0-9]{1,8})$/i.exec(search)?.[1]
      ?.toLowerCase();
    conditions.push(`(
      COALESCE(lead_records.name, '') LIKE ? ESCAPE '\\'
      OR lead_records.phone LIKE ? ESCAPE '\\'
      OR lead_records.id LIKE ? ESCAPE '\\'
    )`);
    parameters.push(
      pattern,
      digits ? `%${digits}%` : pattern,
      publicIdPrefix ? `${escapedLike(publicIdPrefix)}%` : pattern,
    );
  }
  if (filters.fromMs !== undefined) {
    conditions.push('lead_records.created_at_ms >= ?');
    parameters.push(filters.fromMs);
  }
  if (filters.toMs !== undefined) {
    conditions.push('lead_records.created_at_ms < ?');
    parameters.push(filters.toMs);
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';
  const total = (db.prepare(`
    SELECT COUNT(*) AS count
    FROM lead_records
    ${where}
  `).get(...parameters) as { count: number }).count;

  const rows = db.prepare(`
    WITH latest_submission AS (
      SELECT
        lead_submissions.*,
        ROW_NUMBER() OVER (
          PARTITION BY lead_id
          ORDER BY received_at_ms DESC, id DESC
        ) AS row_number
      FROM lead_submissions
    ),
    submission_counts AS (
      SELECT lead_id, COUNT(*) AS submission_count
      FROM lead_submissions
      GROUP BY lead_id
    )
    SELECT
      lead_records.*,
      submission_counts.submission_count,
      latest_submission.kind AS latest_kind,
      latest_submission.source AS latest_source,
      latest_submission.source_page AS latest_source_page,
      latest_submission.received_at AS latest_received_at,
      latest_submission.context_json AS latest_context_json,
      latest_submission.is_duplicate AS latest_is_duplicate
    FROM lead_records
    JOIN submission_counts
      ON submission_counts.lead_id = lead_records.id
    JOIN latest_submission
      ON latest_submission.lead_id = lead_records.id
      AND latest_submission.row_number = 1
    ${where}
    ORDER BY lead_records.created_at_ms DESC, lead_records.id DESC
    LIMIT ? OFFSET ?
  `).all(
    ...parameters,
    pageSize,
    (page - 1) * pageSize,
  ) as Array<{
    id: string;
    phone: string;
    name: string | null;
    status: LeadStatus;
    assigned_to: string | null;
    assigned_at: string | null;
    first_contact_at: string | null;
    closed_at: string | null;
    close_outcome: LeadCloseOutcome | null;
    created_at: string;
    updated_at: string;
    expires_at: number;
    submission_count: number;
    latest_kind: LeadKind;
    latest_source: string;
    latest_source_page: string | null;
    latest_received_at: string;
    latest_context_json: string;
    latest_is_duplicate: number;
  }>;

  const items: LeadAdminListItem[] = rows.map((row) => ({
    id: row.id,
    publicId: publicLeadId(row.id),
    name: row.name,
    phone: row.phone,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedAt: row.assigned_at,
    firstContactAt: row.first_contact_at,
    closedAt: row.closed_at,
    closeOutcome: row.close_outcome,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    submissionCount: row.submission_count,
    latestKind: row.latest_kind,
    latestSource: row.latest_source,
    latestSourcePage: row.latest_source_page,
    latestReceivedAt: row.latest_received_at,
    latestContext: parseContext(row.latest_context_json),
    latestIsDuplicate: row.latest_is_duplicate === 1,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function getLeadAdminSummary(db: Database.Database) {
  const statuses = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM lead_records
    GROUP BY status
  `).all() as Array<{ status: LeadStatus; count: number }>;
  const outbox = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM lead_notification_outbox
    WHERE status IN ('pending', 'processing', 'failed', 'dead')
    GROUP BY status
  `).all() as Array<{ status: string; count: number }>;
  return {
    statuses: Object.fromEntries(statuses.map((item) => [item.status, item.count])),
    outbox: Object.fromEntries(outbox.map((item) => [item.status, item.count])),
  };
}

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
const WORKDAY_START_HOUR = 10;
const WORKDAY_END_HOUR = 18;

export function moscowWorkingMinutesBetween(startMs: number, endMs: number) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  const startDay = Math.floor((startMs + MOSCOW_OFFSET_MS) / 86_400_000);
  const endDay = Math.floor((endMs + MOSCOW_OFFSET_MS) / 86_400_000);
  let workingMs = 0;

  for (let day = startDay; day <= endDay; day += 1) {
    const localMidnightAsUtc = day * 86_400_000;
    const weekday = new Date(localMidnightAsUtc).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const workStart = localMidnightAsUtc
      + WORKDAY_START_HOUR * 60 * 60 * 1000
      - MOSCOW_OFFSET_MS;
    const workEnd = localMidnightAsUtc
      + WORKDAY_END_HOUR * 60 * 60 * 1000
      - MOSCOW_OFFSET_MS;
    workingMs += Math.max(
      0,
      Math.min(endMs, workEnd) - Math.max(startMs, workStart),
    );
  }

  return Math.round(workingMs / 60_000);
}

export function getLeadAdminAnalytics(
  db: Database.Database,
  filters: Pick<LeadAdminListFilters, 'fromMs' | 'toMs'> = {},
  options: { nowMs?: number } = {},
): LeadAdminAnalytics {
  if (
    (filters.fromMs !== undefined && !Number.isFinite(filters.fromMs)) ||
    (filters.toMs !== undefined && !Number.isFinite(filters.toMs)) ||
    (
      filters.fromMs !== undefined &&
      filters.toMs !== undefined &&
      filters.fromMs >= filters.toMs
    )
  ) {
    throw new Error('INVALID_ANALYTICS_PERIOD');
  }

  const leadConditions: string[] = [];
  const leadParameters: number[] = [];
  const submissionConditions: string[] = [];
  const submissionParameters: number[] = [];
  if (filters.fromMs !== undefined) {
    leadConditions.push('created_at_ms >= ?');
    leadParameters.push(filters.fromMs);
    submissionConditions.push('received_at_ms >= ?');
    submissionParameters.push(filters.fromMs);
  }
  if (filters.toMs !== undefined) {
    leadConditions.push('created_at_ms < ?');
    leadParameters.push(filters.toMs);
    submissionConditions.push('received_at_ms < ?');
    submissionParameters.push(filters.toMs);
  }
  const leadWhere = leadConditions.length > 0
    ? `WHERE ${leadConditions.join(' AND ')}`
    : '';
  const submissionWhere = submissionConditions.length > 0
    ? `WHERE ${submissionConditions.join(' AND ')}`
    : '';

  const leads = db.prepare(`
    SELECT
      created_at_ms,
      assigned_at,
      first_contact_at,
      closed_at
    FROM lead_records
    ${leadWhere}
  `).all(...leadParameters) as Array<{
    created_at_ms: number;
    assigned_at: string | null;
    first_contact_at: string | null;
    closed_at: string | null;
  }>;
  const submissions = db.prepare(`
    SELECT
      COUNT(*) AS received,
      COALESCE(SUM(is_duplicate), 0) AS duplicates
    FROM lead_submissions
    ${submissionWhere}
  `).get(...submissionParameters) as {
    received: number;
    duplicates: number;
  };
  const sources = db.prepare(`
    SELECT
      source,
      source_page,
      COUNT(*) AS submissions,
      COALESCE(SUM(is_duplicate), 0) AS duplicates
    FROM lead_submissions
    ${submissionWhere}
    GROUP BY source, source_page
    ORDER BY submissions DESC, source ASC, source_page ASC
    LIMIT 12
  `).all(...submissionParameters) as Array<{
    source: string;
    source_page: string | null;
    submissions: number;
    duplicates: number;
  }>;

  const nowMs = options.nowMs ?? Date.now();
  const contactMinutes: number[] = [];
  let assigned = 0;
  let contacted = 0;
  let closed = 0;
  let met = 0;
  let breached = 0;
  let pending = 0;

  for (const lead of leads) {
    if (lead.assigned_at) assigned += 1;
    if (lead.first_contact_at) contacted += 1;
    if (lead.closed_at) closed += 1;

    const contactAtMs = lead.first_contact_at
      ? Date.parse(lead.first_contact_at)
      : null;
    const elapsed = moscowWorkingMinutesBetween(
      lead.created_at_ms,
      contactAtMs ?? nowMs,
    );
    if (contactAtMs !== null) {
      contactMinutes.push(elapsed);
      if (elapsed <= 60) met += 1;
      else breached += 1;
    } else if (elapsed > 60) {
      breached += 1;
    } else {
      pending += 1;
    }
  }

  return {
    period: {
      fromMs: filters.fromMs ?? null,
      toMs: filters.toMs ?? null,
      timezone: 'Europe/Moscow',
    },
    funnel: {
      received: leads.length,
      assigned,
      contacted,
      closed,
    },
    submissions: {
      received: submissions.received,
      duplicates: submissions.duplicates,
    },
    firstContactSla: {
      targetWorkingMinutes: 60,
      eligible: leads.length,
      met,
      breached,
      pending,
      averageWorkingMinutes: contactMinutes.length > 0
        ? Math.round(
          contactMinutes.reduce((total, value) => total + value, 0)
          / contactMinutes.length,
        )
        : null,
    },
    sources: sources.map((item) => ({
      source: item.source,
      sourcePage: item.source_page,
      submissions: item.submissions,
      duplicates: item.duplicates,
    })),
  };
}

export function transitionLeadForAdmin(
  db: Database.Database,
  input: {
    actor: LeadAdminActor;
    leadId: string;
    toStatus: Exclude<LeadStatus, 'new'>;
    assignedTo?: string;
    closeOutcome?: LeadCloseOutcome;
    nowMs?: number;
  },
) {
  if (input.assignedTo && !['andrey', 'sergey'].includes(input.assignedTo)) {
    throw new Error('INVALID_ASSIGNEE');
  }
  return db.transaction(() => {
    const updated = transitionLeadStatus(db, {
      leadId: input.leadId,
      toStatus: input.toStatus,
      actor: `admin:${input.actor.userId}`,
      assignedTo: input.assignedTo,
      closeOutcome: input.closeOutcome,
      nowMs: input.nowMs,
    });
    recordLeadAdminAudit(db, {
      actor: input.actor,
      action: 'status_change',
      leadId: input.leadId,
      metadata: {
        from_status: updated.status === 'assigned'
          ? 'new'
          : updated.status === 'contacted'
            ? 'assigned'
            : 'contacted',
        to_status: updated.status,
        assigned_to: input.assignedTo ?? updated.assigned_to ?? '',
        close_outcome: input.closeOutcome ?? '',
      },
      nowMs: input.nowMs,
    });
    return updated;
  })();
}

export function deleteLeadForAdmin(
  db: Database.Database,
  input: {
    actor: LeadAdminActor;
    leadId: string;
    reason: 'privacy_request' | 'test' | 'director_decision';
    nowMs?: number;
  },
) {
  if (input.actor.role !== 'director') {
    throw new Error('DELETE_FORBIDDEN');
  }
  return db.transaction(() => {
    const lead = db.prepare(`
      SELECT id, status
      FROM lead_records
      WHERE id = ?
    `).get(input.leadId) as { id: string; status: LeadStatus } | undefined;
    if (!lead) return false;
    const submissionCount = (db.prepare(`
      SELECT COUNT(*) AS count
      FROM lead_submissions
      WHERE lead_id = ?
    `).get(input.leadId) as { count: number }).count;
    recordLeadAdminAudit(db, {
      actor: input.actor,
      action: 'delete',
      leadId: input.leadId,
      metadata: {
        reason: input.reason,
        previous_status: lead.status,
        submission_count: submissionCount,
      },
      nowMs: input.nowMs,
    });
    db.prepare('DELETE FROM lead_records WHERE id = ?').run(input.leadId);
    return true;
  })();
}

function csvCell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildLeadAdminCsv(items: LeadAdminListItem[]) {
  const header = [
    'ID',
    'Создан',
    'Имя',
    'Телефон',
    'Статус',
    'Ответственный',
    'Первый контакт',
    'Закрыт',
    'Результат',
    'Источник',
    'Страница',
    'Тип',
    'Количество заявок',
  ];
  const rows = items.map((item) => [
    item.publicId,
    item.createdAt,
    item.name,
    `+${item.phone}`,
    item.status,
    item.assignedTo,
    item.firstContactAt,
    item.closedAt,
    item.closeOutcome,
    item.latestSource,
    item.latestSourcePage,
    item.latestKind,
    item.submissionCount,
  ]);
  return `\uFEFF${[header, ...rows]
    .map((row) => row.map(csvCell).join(';'))
    .join('\r\n')}\r\n`;
}
