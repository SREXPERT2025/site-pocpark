import type Database from 'better-sqlite3';
import {
  PUBLIC_BLOCKED_SAFE_FORENSIC_VERSION,
  canonicalJson,
  sha256,
  type PublicBlockedSafeForensicEvidence,
} from './owner-ai-canary-adapter.ts';

export const PUBLIC_BLOCKED_SAFE_FORENSIC_RETENTION_DAYS = 7;
export const PUBLIC_BLOCKED_SAFE_FORENSIC_RETENTION_MS =
  PUBLIC_BLOCKED_SAFE_FORENSIC_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

const FORBIDDEN_KEYS = new Set([
  'answer', 'raw_answer', 'repaired_answer', 'user_content', 'user_message',
  'current_message', 'raw_user_text', 'cookie', 'credential', 'credentials',
  'password', 'secret', 'token', 'environment', 'env',
]);
const SECRET_PATTERN =
  /(?:\bBearer\s+[A-Za-z0-9._~+/=-]+|\bsk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|secret|token)\s*=)/i;

export type PublicBlockedSafeForensicRow = Readonly<{
  turnId: string;
  aiCoreRequestId: string;
  route: 'public_ai_core';
  siteSha: string;
  runtimeSha: string;
  runtimeVersion: string;
  contractSha: string;
  siteBlockingPredicate: string;
  forensicRef: string;
  evidenceSha256: string;
  evidence: PublicBlockedSafeForensicEvidence;
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

function assertSafeValue(value: unknown, depth = 0) {
  if (depth > 10) throw new Error('PUBLIC_BLOCKED_FORENSIC_TOO_DEEP');
  if (typeof value === 'string') {
    if (value.length > 1_000 || SECRET_PATTERN.test(value)) {
      throw new Error('PUBLIC_BLOCKED_FORENSIC_SECRET_OR_SIZE');
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error('PUBLIC_BLOCKED_FORENSIC_TOO_LARGE');
    value.forEach((item) => assertSafeValue(item, depth + 1));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error('PUBLIC_BLOCKED_FORENSIC_FORBIDDEN_KEY');
    }
    assertSafeValue(nested, depth + 1);
  }
}

function evidenceJson(evidence: PublicBlockedSafeForensicEvidence) {
  if (evidence.schema_version !== PUBLIC_BLOCKED_SAFE_FORENSIC_VERSION
    || evidence.route !== 'public_ai_core') {
    throw new Error('PUBLIC_BLOCKED_FORENSIC_SCHEMA_INVALID');
  }
  requiredIdentifier(evidence.ai_core_request_id, 'ai_core_request_id');
  requiredSha(evidence.site_sha, 40, 'site_sha');
  requiredSha(evidence.runtime_sha, 40, 'runtime_sha');
  requiredSha(evidence.contract_sha, 40, 'contract_sha');
  requiredSha(evidence.decision_package_sha, 64, 'decision_package_sha');
  if (evidence.projection_sha !== null) {
    requiredSha(evidence.projection_sha, 64, 'projection_sha');
  }
  assertSafeValue(evidence);
  const encoded = canonicalJson(evidence);
  if (Buffer.byteLength(encoded, 'utf8') > 64 * 1_024) {
    throw new Error('PUBLIC_BLOCKED_FORENSIC_TOO_LARGE');
  }
  return encoded;
}

export function runPublicBlockedSafeForensicMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_blocked_safe_forensics (
      ai_core_request_id TEXT PRIMARY KEY,
      turn_id TEXT NOT NULL UNIQUE,
      route TEXT NOT NULL CHECK (route = 'public_ai_core'),
      site_sha TEXT NOT NULL,
      runtime_sha TEXT NOT NULL,
      runtime_version TEXT NOT NULL,
      contract_sha TEXT NOT NULL,
      site_blocking_predicate TEXT NOT NULL,
      forensic_ref TEXT NOT NULL UNIQUE,
      evidence_sha256 TEXT NOT NULL UNIQUE,
      evidence_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > created_at_ms)
    );

    CREATE INDEX IF NOT EXISTS public_blocked_safe_forensics_expiry
      ON public_blocked_safe_forensics(expires_at_ms);
  `);
}

export function cleanupExpiredPublicBlockedSafeForensics(
  db: Database.Database,
  nowMs = Date.now(),
) {
  return db.prepare(`
    DELETE FROM public_blocked_safe_forensics WHERE expires_at_ms <= ?
  `).run(nowMs).changes;
}

function rowToEvidence(row: {
  turn_id: string;
  ai_core_request_id: string;
  route: 'public_ai_core';
  site_sha: string;
  runtime_sha: string;
  runtime_version: string;
  contract_sha: string;
  site_blocking_predicate: string;
  forensic_ref: string;
  evidence_sha256: string;
  evidence_json: string;
  created_at: string;
  expires_at: string;
}): PublicBlockedSafeForensicRow {
  return Object.freeze({
    turnId: row.turn_id,
    aiCoreRequestId: row.ai_core_request_id,
    route: row.route,
    siteSha: row.site_sha,
    runtimeSha: row.runtime_sha,
    runtimeVersion: row.runtime_version,
    contractSha: row.contract_sha,
    siteBlockingPredicate: row.site_blocking_predicate,
    forensicRef: row.forensic_ref,
    evidenceSha256: row.evidence_sha256,
    evidence: JSON.parse(row.evidence_json) as PublicBlockedSafeForensicEvidence,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  });
}

export function recordPublicBlockedSafeForensic(
  db: Database.Database,
  input: {
    turnId: string;
    aiCoreRequestId: string;
    evidence: PublicBlockedSafeForensicEvidence;
    nowMs?: number;
  },
) {
  const turnId = requiredIdentifier(input.turnId, 'turn_id');
  const aiCoreRequestId = requiredIdentifier(
    input.aiCoreRequestId,
    'ai_core_request_id',
  );
  if (input.evidence.ai_core_request_id !== aiCoreRequestId) {
    throw new Error('PUBLIC_BLOCKED_FORENSIC_CORRELATION_MISMATCH');
  }
  const encoded = evidenceJson(input.evidence);
  const evidenceSha256 = sha256(input.evidence);
  const forensicRef = `public-blocked:${aiCoreRequestId}`;
  const nowMs = input.nowMs ?? Date.now();
  cleanupExpiredPublicBlockedSafeForensics(db, nowMs);
  const expiresAtMs = nowMs + PUBLIC_BLOCKED_SAFE_FORENSIC_RETENTION_MS;
  const result = db.prepare(`
    INSERT OR IGNORE INTO public_blocked_safe_forensics (
      ai_core_request_id, turn_id, route, site_sha, runtime_sha,
      runtime_version, contract_sha, site_blocking_predicate, forensic_ref,
      evidence_sha256, evidence_json, created_at, created_at_ms,
      expires_at, expires_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    aiCoreRequestId,
    turnId,
    input.evidence.route,
    input.evidence.site_sha,
    input.evidence.runtime_sha,
    input.evidence.runtime_version,
    input.evidence.contract_sha,
    input.evidence.site_blocking_predicate,
    forensicRef,
    evidenceSha256,
    encoded,
    new Date(nowMs).toISOString(),
    nowMs,
    new Date(expiresAtMs).toISOString(),
    expiresAtMs,
  );
  const existing = db.prepare(`
    SELECT * FROM public_blocked_safe_forensics
    WHERE ai_core_request_id = ?
  `).get(aiCoreRequestId) as Parameters<typeof rowToEvidence>[0] | undefined;
  if (!existing) throw new Error('PUBLIC_BLOCKED_FORENSIC_WRITE_FAILED');
  if (existing.turn_id !== turnId || existing.evidence_sha256 !== evidenceSha256) {
    throw new Error('PUBLIC_BLOCKED_FORENSIC_IDEMPOTENCY_CONFLICT');
  }
  return Object.freeze({
    ...rowToEvidence(existing),
    created: result.changes === 1,
  });
}

export function getPublicBlockedSafeForensicByRequestId(
  db: Database.Database,
  aiCoreRequestId: string,
  nowMs = Date.now(),
) {
  cleanupExpiredPublicBlockedSafeForensics(db, nowMs);
  const row = db.prepare(`
    SELECT * FROM public_blocked_safe_forensics
    WHERE ai_core_request_id = ? AND expires_at_ms > ?
  `).get(
    requiredIdentifier(aiCoreRequestId, 'ai_core_request_id'),
    nowMs,
  ) as Parameters<typeof rowToEvidence>[0] | undefined;
  return row ? rowToEvidence(row) : null;
}
