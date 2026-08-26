import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
  canonicalJson,
  sha256,
  type OwnerCanaryRestrictedForensicEvidence,
} from './owner-ai-canary-adapter.ts';

export const OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_DAYS = 7;
export const OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS =
  OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

export type OwnerCanaryRestrictedForensicFailureStage =
  | 'input_validation'
  | 'evidence_validation'
  | 'retention_cleanup'
  | 'idempotency_lookup'
  | 'insert'
  | 'post_write_readback'
  | 'database_open'
  | 'database_initialize';

export class OwnerCanaryRestrictedForensicError extends Error {
  readonly code: string;
  readonly stage: OwnerCanaryRestrictedForensicFailureStage;
  readonly storageCode: string | null;
  readonly storageMessage: string | null;

  constructor(input: {
    code: string;
    stage: OwnerCanaryRestrictedForensicFailureStage;
    cause?: unknown;
    storageCode?: string | null;
    storageMessage?: string | null;
  }) {
    super(input.code, input.cause === undefined ? undefined : {
      cause: input.cause,
    });
    this.name = 'OwnerCanaryRestrictedForensicError';
    this.code = input.code;
    this.stage = input.stage;
    this.storageCode = input.storageCode ?? null;
    this.storageMessage = input.storageMessage ?? null;
  }
}

const SECRET_PATTERN =
  /(?:\bBearer\s+[A-Za-z0-9._~+/=-]+|\bsk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|secret|token)\s*=)/i;
const FORBIDDEN_KEYS = new Set([
  'cookie', 'credential', 'credentials', 'password', 'secret', 'token',
  'user_message', 'current_message', 'raw_user_text',
]);

export type OwnerCanaryRestrictedForensicRow = Readonly<{
  turnId: string;
  conversationThreadId: string;
  messageId: string;
  aiCoreRequestId: string;
  schemaVersion: typeof OWNER_CANARY_BLOCKED_FORENSIC_VERSION;
  runtimeSha: string;
  contractSha: string;
  evidenceSha256: string;
  evidence: OwnerCanaryRestrictedForensicEvidence;
  createdAt: string;
  expiresAt: string;
}>;

function safeStorageCode(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  const value = (error as { code?: unknown }).code;
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(value)
    ? value
    : null;
}

function safeStorageMessage(error: unknown, storageCode: string | null) {
  if (!storageCode || !(error instanceof Error)) return null;
  return error.message.replace(/\0/g, '').trim().slice(0, 500) || null;
}

function safeFailureCode(error: unknown, fallback: string) {
  if (error instanceof OwnerCanaryRestrictedForensicError) {
    return error.code;
  }
  if (error instanceof Error
    && /^[A-Z][A-Z0-9_]{2,127}$/.test(error.message)) {
    return error.message;
  }
  const storageCode = safeStorageCode(error);
  return storageCode
    ? `OWNER_RESTRICTED_FORENSIC_${storageCode}`
    : fallback;
}

export function ownerCanaryRestrictedForensicError(
  error: unknown,
  stage: OwnerCanaryRestrictedForensicFailureStage,
  fallback = 'OWNER_RESTRICTED_FORENSIC_STORAGE_ERROR',
) {
  if (error instanceof OwnerCanaryRestrictedForensicError) return error;
  const storageCode = safeStorageCode(error);
  return new OwnerCanaryRestrictedForensicError({
    code: safeFailureCode(error, fallback),
    stage,
    cause: error,
    storageCode,
    storageMessage: safeStorageMessage(error, storageCode),
  });
}

export function openOwnerCanaryRestrictedForensicDatabase(
  filePath: string,
) {
  const directory = path.dirname(filePath);
  let db: Database.Database;
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    db = new Database(filePath);
    chmodSync(filePath, 0o600);
  } catch (error) {
    throw ownerCanaryRestrictedForensicError(error, 'database_open');
  }
  try {
    db.pragma('journal_mode = WAL');
    for (const sidecarPath of [`${filePath}-wal`, `${filePath}-shm`]) {
      if (existsSync(/* turbopackIgnore: true */ sidecarPath)) {
        chmodSync(sidecarPath, 0o600);
      }
    }
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = FULL');
    runOwnerCanaryRestrictedForensicMigrations(db);
    cleanupExpiredOwnerCanaryRestrictedForensics(db);
    return db;
  } catch (error) {
    try {
      db.close();
    } catch {
      // Preserve the initialization failure as the primary storage cause.
    }
    throw ownerCanaryRestrictedForensicError(error, 'database_initialize');
  }
}

function forensicError(
  code: string,
  stage: OwnerCanaryRestrictedForensicFailureStage,
) {
  return new OwnerCanaryRestrictedForensicError({ code, stage });
}

function requiredIdentifier(value: string, field: string) {
  const normalized = value.replace(/\0/g, '').trim();
  if (!/^[a-z0-9][a-z0-9._:-]{7,159}$/i.test(normalized)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function requiredSha(value: string, length: 40 | 64, field: string) {
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(value)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return value;
}

function evidenceJson(evidence: OwnerCanaryRestrictedForensicEvidence) {
  if (evidence.schema_version !== OWNER_CANARY_BLOCKED_FORENSIC_VERSION) {
    throw new Error('OWNER_RESTRICTED_FORENSIC_VERSION_UNSUPPORTED');
  }
  const withoutHash = { ...evidence } as Record<string, unknown>;
  delete withoutHash.evidence_sha256;
  if (sha256(withoutHash) !== evidence.evidence_sha256) {
    throw new Error('OWNER_RESTRICTED_FORENSIC_HASH_MISMATCH');
  }
  assertNoForbiddenMaterial(evidence);
  const encoded = canonicalJson(evidence);
  if (Buffer.byteLength(encoded, 'utf8') > 256 * 1_024) {
    throw new Error('OWNER_RESTRICTED_FORENSIC_TOO_LARGE');
  }
  return encoded;
}

function assertNoForbiddenMaterial(value: unknown, depth = 0) {
  if (depth > 12) {
    throw new Error('OWNER_RESTRICTED_FORENSIC_TOO_DEEP');
  }
  if (typeof value === 'string') {
    if (value.length > 8_000 || SECRET_PATTERN.test(value)) {
      throw new Error('OWNER_RESTRICTED_FORENSIC_SECRET_OR_SIZE');
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 200) {
      throw new Error('OWNER_RESTRICTED_FORENSIC_TOO_LARGE');
    }
    value.forEach((item) => assertNoForbiddenMaterial(item, depth + 1));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error('OWNER_RESTRICTED_FORENSIC_FORBIDDEN_KEY');
    }
    assertNoForbiddenMaterial(nested, depth + 1);
  }
}

export function runOwnerCanaryRestrictedForensicMigrations(
  db: Database.Database,
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS owner_canary_blocked_forensics (
      ai_core_request_id TEXT PRIMARY KEY,
      turn_id TEXT NOT NULL UNIQUE,
      conversation_thread_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      schema_version TEXT NOT NULL CHECK (
        schema_version = 'OWNER_CANARY_BLOCKED_FORENSIC_V1'
      ),
      runtime_sha TEXT NOT NULL,
      contract_sha TEXT NOT NULL,
      evidence_sha256 TEXT NOT NULL UNIQUE,
      evidence_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > created_at_ms)
    );

    CREATE INDEX IF NOT EXISTS owner_canary_blocked_forensics_expiry
      ON owner_canary_blocked_forensics(expires_at_ms);

    CREATE INDEX IF NOT EXISTS owner_canary_blocked_forensics_thread_message
      ON owner_canary_blocked_forensics(
        conversation_thread_id, message_id
      );
  `);
}

export function cleanupExpiredOwnerCanaryRestrictedForensics(
  db: Database.Database,
  nowMs = Date.now(),
) {
  return db.prepare(`
    DELETE FROM owner_canary_blocked_forensics
    WHERE expires_at_ms <= ?
  `).run(nowMs).changes;
}

function rowToEvidence(row: {
  turn_id: string;
  conversation_thread_id: string;
  message_id: string;
  ai_core_request_id: string;
  schema_version: typeof OWNER_CANARY_BLOCKED_FORENSIC_VERSION;
  runtime_sha: string;
  contract_sha: string;
  evidence_sha256: string;
  evidence_json: string;
  created_at: string;
  expires_at: string;
}): OwnerCanaryRestrictedForensicRow {
  return Object.freeze({
    turnId: row.turn_id,
    conversationThreadId: row.conversation_thread_id,
    messageId: row.message_id,
    aiCoreRequestId: row.ai_core_request_id,
    schemaVersion: row.schema_version,
    runtimeSha: row.runtime_sha,
    contractSha: row.contract_sha,
    evidenceSha256: row.evidence_sha256,
    evidence: JSON.parse(
      row.evidence_json,
    ) as OwnerCanaryRestrictedForensicEvidence,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  });
}

export function recordOwnerCanaryRestrictedForensic(
  db: Database.Database,
  input: {
    turnId: string;
    conversationThreadId: string;
    messageId: string;
    aiCoreRequestId: string;
    evidence: OwnerCanaryRestrictedForensicEvidence;
    nowMs?: number;
  },
) {
  let turnId: string;
  let conversationThreadId: string;
  let messageId: string;
  let aiCoreRequestId: string;
  try {
    turnId = requiredIdentifier(input.turnId, 'turn_id');
    conversationThreadId = requiredIdentifier(
      input.conversationThreadId,
      'conversation_thread_id',
    );
    messageId = requiredIdentifier(input.messageId, 'message_id');
    aiCoreRequestId = requiredIdentifier(
      input.aiCoreRequestId,
      'ai_core_request_id',
    );
  } catch (error) {
    throw ownerCanaryRestrictedForensicError(
      error,
      'input_validation',
      'OWNER_RESTRICTED_FORENSIC_INPUT_INVALID',
    );
  }
  if (input.evidence.ai_core_request_id !== aiCoreRequestId) {
    throw forensicError(
      'OWNER_RESTRICTED_FORENSIC_CORRELATION_MISMATCH',
      'evidence_validation',
    );
  }
  let runtimeSha: string;
  let contractSha: string;
  let evidenceSha256: string;
  let encoded: string;
  try {
    runtimeSha = requiredSha(
      input.evidence.runtime.sha,
      40,
      'runtime_sha',
    );
    contractSha = requiredSha(
      input.evidence.runtime.contract_sha,
      40,
      'contract_sha',
    );
    evidenceSha256 = requiredSha(
      input.evidence.evidence_sha256,
      64,
      'evidence_sha256',
    );
    encoded = evidenceJson(input.evidence);
  } catch (error) {
    throw ownerCanaryRestrictedForensicError(
      error,
      'evidence_validation',
      'OWNER_RESTRICTED_FORENSIC_EVIDENCE_INVALID',
    );
  }
  const nowMs = input.nowMs ?? Date.now();
  const expiresAtMs = nowMs + OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS;
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();

  try {
    cleanupExpiredOwnerCanaryRestrictedForensics(db, nowMs);
  } catch (error) {
    throw ownerCanaryRestrictedForensicError(error, 'retention_cleanup');
  }

  type StoredRow = Parameters<typeof rowToEvidence>[0];
  const exactMatch = (existing: StoredRow) => !(
    existing.turn_id !== turnId
    || existing.conversation_thread_id !== conversationThreadId
    || existing.message_id !== messageId
    || existing.runtime_sha !== runtimeSha
    || existing.contract_sha !== contractSha
    || existing.evidence_sha256 !== evidenceSha256
    || existing.evidence_json !== encoded
  );
  const lookupExisting = () => {
    try {
      const byRequest = db.prepare(`
        SELECT * FROM owner_canary_blocked_forensics
        WHERE ai_core_request_id = ?
      `).get(aiCoreRequestId) as StoredRow | undefined;
      if (byRequest) {
        if (!exactMatch(byRequest)) {
          throw forensicError(
            'OWNER_RESTRICTED_FORENSIC_IDEMPOTENCY_CONFLICT',
            'idempotency_lookup',
          );
        }
        return byRequest;
      }
      const byTurn = db.prepare(`
        SELECT * FROM owner_canary_blocked_forensics
        WHERE turn_id = ?
      `).get(turnId) as StoredRow | undefined;
      if (byTurn) {
        throw forensicError(
          'OWNER_RESTRICTED_FORENSIC_TURN_ID_CONFLICT',
          'idempotency_lookup',
        );
      }
      const byHash = db.prepare(`
        SELECT * FROM owner_canary_blocked_forensics
        WHERE evidence_sha256 = ?
      `).get(evidenceSha256) as StoredRow | undefined;
      if (byHash) {
        throw forensicError(
          'OWNER_RESTRICTED_FORENSIC_EVIDENCE_SHA_CONFLICT',
          'idempotency_lookup',
        );
      }
      return null;
    } catch (error) {
      throw ownerCanaryRestrictedForensicError(
        error,
        'idempotency_lookup',
      );
    }
  };

  const beforeInsert = lookupExisting();
  if (beforeInsert) {
    return { ...rowToEvidence(beforeInsert), created: false };
  }

  try {
    const result = db.prepare(`
      INSERT INTO owner_canary_blocked_forensics (
        ai_core_request_id, turn_id, conversation_thread_id, message_id,
        schema_version, runtime_sha, contract_sha, evidence_sha256,
        evidence_json, created_at, created_at_ms, expires_at, expires_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      aiCoreRequestId,
      turnId,
      conversationThreadId,
      messageId,
      OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
      runtimeSha,
      contractSha,
      evidenceSha256,
      encoded,
      createdAt,
      nowMs,
      expiresAt,
      expiresAtMs,
    );
    if (result.changes !== 1) {
      throw forensicError(
        'OWNER_RESTRICTED_FORENSIC_INSERT_NO_CHANGE',
        'insert',
      );
    }
  } catch (error) {
    const storageCode = safeStorageCode(error);
    if (storageCode?.startsWith('SQLITE_CONSTRAINT')) {
      const racedExisting = lookupExisting();
      if (racedExisting) {
        return { ...rowToEvidence(racedExisting), created: false };
      }
    }
    throw ownerCanaryRestrictedForensicError(error, 'insert');
  }

  let existing: StoredRow | undefined;
  try {
    existing = db.prepare(`
      SELECT * FROM owner_canary_blocked_forensics
      WHERE ai_core_request_id = ?
    `).get(aiCoreRequestId) as StoredRow | undefined;
  } catch (error) {
    throw ownerCanaryRestrictedForensicError(error, 'post_write_readback');
  }
  if (!existing) {
    throw forensicError(
      'OWNER_RESTRICTED_FORENSIC_READBACK_MISSING',
      'post_write_readback',
    );
  }
  return { ...rowToEvidence(existing), created: true };
}

export function getOwnerCanaryRestrictedForensicByRequestId(
  db: Database.Database,
  aiCoreRequestId: string,
  nowMs = Date.now(),
) {
  cleanupExpiredOwnerCanaryRestrictedForensics(db, nowMs);
  const normalized = requiredIdentifier(
    aiCoreRequestId,
    'ai_core_request_id',
  );
  const row = db.prepare(`
    SELECT * FROM owner_canary_blocked_forensics
    WHERE ai_core_request_id = ?
  `).get(normalized) as Parameters<typeof rowToEvidence>[0] | undefined;
  return row ? rowToEvidence(row) : null;
}
