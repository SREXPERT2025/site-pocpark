import type Database from 'better-sqlite3';
import {
  OWNER_CANARY_BLOCKED_FORENSIC_VERSION,
  canonicalJson,
  sha256,
  type OwnerCanaryRestrictedForensicEvidence,
} from './owner-ai-canary-adapter.ts';

export const OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_DAYS = 7;
export const OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS =
  OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

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
  const turnId = requiredIdentifier(input.turnId, 'turn_id');
  const conversationThreadId = requiredIdentifier(
    input.conversationThreadId,
    'conversation_thread_id',
  );
  const messageId = requiredIdentifier(input.messageId, 'message_id');
  const aiCoreRequestId = requiredIdentifier(
    input.aiCoreRequestId,
    'ai_core_request_id',
  );
  if (input.evidence.ai_core_request_id !== aiCoreRequestId) {
    throw new Error('OWNER_RESTRICTED_FORENSIC_CORRELATION_MISMATCH');
  }
  const runtimeSha = requiredSha(
    input.evidence.runtime.sha,
    40,
    'runtime_sha',
  );
  const contractSha = requiredSha(
    input.evidence.runtime.contract_sha,
    40,
    'contract_sha',
  );
  const evidenceSha256 = requiredSha(
    input.evidence.evidence_sha256,
    64,
    'evidence_sha256',
  );
  const encoded = evidenceJson(input.evidence);
  const nowMs = input.nowMs ?? Date.now();
  const expiresAtMs = nowMs + OWNER_CANARY_RESTRICTED_FORENSIC_RETENTION_MS;
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();

  cleanupExpiredOwnerCanaryRestrictedForensics(db, nowMs);
  const result = db.prepare(`
    INSERT OR IGNORE INTO owner_canary_blocked_forensics (
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
  const existing = db.prepare(`
    SELECT * FROM owner_canary_blocked_forensics
    WHERE ai_core_request_id = ?
  `).get(aiCoreRequestId) as Parameters<typeof rowToEvidence>[0] | undefined;
  if (!existing) throw new Error('OWNER_RESTRICTED_FORENSIC_WRITE_FAILED');
  if (result.changes === 0 && (
    existing.turn_id !== turnId
    || existing.conversation_thread_id !== conversationThreadId
    || existing.message_id !== messageId
    || existing.runtime_sha !== runtimeSha
    || existing.contract_sha !== contractSha
    || existing.evidence_sha256 !== evidenceSha256
    || existing.evidence_json !== encoded
  )) {
    throw new Error('OWNER_RESTRICTED_FORENSIC_IDEMPOTENCY_CONFLICT');
  }
  return { ...rowToEvidence(existing), created: result.changes === 1 };
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
