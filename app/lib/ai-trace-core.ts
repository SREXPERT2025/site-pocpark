import type Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  AI_CORE_RUNTIME_VERSION,
  CANONICALIZATION_VERSION,
  canonicalJson,
  sha256,
  type AiCoreTransportEvidence,
  type AiCoreRuntimeObservabilityTrace,
} from './owner-ai-canary-adapter.ts';

export const AI_TRACE_SCHEMA_VERSION = 'AI_TRACE_VIEWER_V1';
export const AI_TRACE_FULL_RETENTION_DAYS = 14;
export const AI_TRACE_METADATA_RETENTION_DAYS = 90;
export const AI_TRACE_FULL_RETENTION_MS =
  AI_TRACE_FULL_RETENTION_DAYS * 24 * 60 * 60 * 1_000;
export const AI_TRACE_METADATA_RETENTION_MS =
  AI_TRACE_METADATA_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

export const AI_TRACE_ANNOTATION_CATEGORIES = [
  'factual_error',
  'bad_recommendation',
  'forgotten_context',
  'repeated_question',
  'bad_wording',
  'instruction_leak',
  'too_long',
  'too_short',
  'other',
] as const;

export type AiTraceAnnotationCategory =
  (typeof AI_TRACE_ANNOTATION_CATEGORIES)[number];
export type AiTracePublicationStatus =
  | 'published'
  | 'blocked'
  | 'fallback'
  | 'error';

export type AiTraceStage = Readonly<{
  name: string;
  status: 'pass' | 'warn' | 'blocked' | 'not_used' | 'error' | 'not_reached';
  summary: string;
  input: unknown;
  output: unknown;
  reason_codes: readonly string[];
  latency_ms: number | null;
}>;

export type AiCoreTurnTrace = Readonly<{
  schema_version: typeof AI_TRACE_SCHEMA_VERSION;
  identity: Readonly<{
    turn_id: string;
    site_request_id: string;
    ai_core_request_id: string;
    conversation_thread_id: string;
    message_id: string;
    parent_message_id: string | null;
    timestamp: string;
    route: 'owner_ai_core' | 'public_ai_core';
    site_sha: string;
    runtime_sha: string;
    runtime_version: string;
    contract_sha: string;
    canonicalization_version: string;
    gateway_sha: string;
  }>;
  routing: Readonly<Record<string, unknown>>;
  client_input: Readonly<Record<string, unknown>>;
  state: Readonly<Record<string, unknown>>;
  pipeline: readonly AiTraceStage[];
  publication: Readonly<Record<string, unknown>>;
  latency: Readonly<Record<string, unknown>>;
  diagnostics: Readonly<Record<string, unknown>>;
  trace_sha256: string;
}>;

export type AiTraceSummary = Readonly<{
  turnId: string;
  aiCoreRequestId: string;
  publicationStatus: AiTracePublicationStatus;
  executor: string | null;
  evaluatorStatus: string | null;
  hasWarning: boolean;
  instructionLeakWarning: boolean;
  firstFailureStage: string | null;
  totalLatencyMs: number | null;
  traceAvailable: boolean;
  createdAt: string;
}>;

const FORBIDDEN_KEYS = new Set([
  'cookie', 'cookies', 'credential', 'credentials', 'password', 'secret',
  'token', 'tokens', 'api_key', 'apikey', 'headers', 'environment', 'env',
  'chain_of_thought', 'hidden_reasoning', 'reasoning_transcript',
]);
const SECRET_PATTERN =
  /(?:\bBearer\s+[A-Za-z0-9._~+/=-]+|\bsk-[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|secret|token|credential)\s*=)/i;
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._:-]{7,159}$/i;

function sanitizeString(value: string) {
  const normalized = value.replace(/\0/g, '');
  if (SECRET_PATTERN.test(normalized)) return '[REDACTED_SECRET]';
  return normalized.length > 32_000
    ? `${normalized.slice(0, 32_000)}…[TRUNCATED]`
    : normalized;
}

export function sanitizeAiTraceValue(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 16) return '[TRUNCATED_DEPTH]';
  if (value === null || typeof value === 'boolean'
    || typeof value === 'number') return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) {
    return value.slice(0, 300).map((item) =>
      sanitizeAiTraceValue(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).slice(0, 500).map(([key, item]) => [
        key,
        FORBIDDEN_KEYS.has(key.toLowerCase())
          ? '[REDACTED]'
          : sanitizeAiTraceValue(item, depth + 1),
      ]),
    );
  }
  return sanitizeString(String(value ?? ''));
}

function identifier(value: string, field: string) {
  const normalized = value.replace(/\0/g, '').trim();
  if (!IDENTIFIER_PATTERN.test(normalized)) {
    throw new Error(`AI_TRACE_INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function sha(value: string, field: string, length: 40 | 64) {
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(value)) {
    throw new Error(`AI_TRACE_INVALID_${field.toUpperCase()}`);
  }
  return value;
}

function tracePipeline(
  runtimeTrace: AiCoreRuntimeObservabilityTrace | null,
  input: Parameters<typeof composeAiCoreTurnTrace>[0],
): AiTraceStage[] {
  const transportEvidence = input.transportEvidence ?? null;
  const runtimeReached = typeof transportEvidence?.http_status === 'number';
  const stages: AiTraceStage[] = runtimeTrace?.pipeline.map((stage) => ({
    name: String(stage.name || 'unknown'),
    status: String(stage.status || 'warn') as AiTraceStage['status'],
    summary: String(stage.summary || ''),
    input: stage.input ?? null,
    output: stage.output ?? null,
    reason_codes: Array.isArray(stage.reason_codes)
      ? stage.reason_codes.map(String) : [],
    latency_ms: typeof stage.latency_ms === 'number'
      ? stage.latency_ms : null,
  })) ?? (runtimeReached ? [
    {
      name: 'runtime_transport',
      status: 'pass' as const,
      summary: 'Runtime returned an HTTP response; internal stage trace is unavailable.',
      input: transportEvidence,
      output: {
        http_status: transportEvidence?.http_status,
        outcome: transportEvidence?.outcome,
      },
      reason_codes: [],
      latency_ms: null,
    },
    ...[
      'context_integrity', 'project_memory', 'sales_controller',
      'engineering_lab', 'decision_package', 'knowledge_sources',
      'verbalization_projection', 'executor', 'evaluator_raw', 'repair',
      'evaluator_final', 'runtime_publication',
    ].map((name) => ({
      name,
      status: 'warn' as const,
      summary: 'Runtime was reached, but this stage is unobserved by Site.',
      input: null,
      output: null,
      reason_codes: ['RUNTIME_STAGE_UNOBSERVED'],
      latency_ms: null,
    })),
    ...(transportEvidence?.outcome === 'http_response_rejected' ? [{
      name: 'site_response_validation',
      status: 'error' as const,
      summary: input.siteBlockingPredicate
        || 'Site rejected the Runtime response envelope.',
      input: transportEvidence,
      output: null,
      reason_codes: input.siteBlockingPredicate
        ? [input.siteBlockingPredicate] : [],
      latency_ms: null,
    }] : []),
  ] : [
    {
      name: input.preRuntimeFailureStage ?? 'runtime_transport',
      status: 'error' as const,
      summary: input.siteBlockingPredicate
        || 'Runtime observability was not reached.',
      input: {
        site_sha: input.siteSha,
        runtime_sha: input.runtimeSha,
        contract_sha: input.contractSha,
      },
      output: null,
      reason_codes: input.siteBlockingPredicate
        ? [input.siteBlockingPredicate] : [],
      latency_ms: null,
    },
    ...[
      'context_integrity', 'project_memory', 'sales_controller',
      'engineering_lab', 'decision_package', 'knowledge_sources',
      'verbalization_projection', 'executor', 'evaluator_raw', 'repair',
      'evaluator_final', 'runtime_publication',
    ].map((name) => ({
      name,
      status: 'not_reached' as const,
      summary: 'Stage was not reached.',
      input: null,
      output: null,
      reason_codes: [] as string[],
      latency_ms: null,
    })),
  ]);
  stages.push({
    name: 'site_publication',
    status: input.publicationStatus === 'published'
      ? 'pass'
      : input.publicationStatus === 'blocked'
        ? 'blocked'
        : input.publicationStatus === 'error'
          ? 'error'
          : 'warn',
    summary: input.publicationStatus === 'published'
      ? 'Site published the accepted candidate to the client.'
      : `Site terminal publication status: ${input.publicationStatus}.`,
    input: {
      runtime_candidate_status: runtimeTrace?.pipeline
        .find((stage) => stage.name === 'runtime_publication')?.output ?? null,
    },
    output: {
      visible_answer: input.visibleAnswer,
      visible_source: input.visibleSource,
      blocking_predicate: input.siteBlockingPredicate,
      published_at: input.publishedAt,
    },
    reason_codes: input.siteBlockingPredicate
      ? [input.siteBlockingPredicate] : [],
    latency_ms: null,
  });
  return stages;
}

export function composeAiCoreTurnTrace(input: {
  turnId: string;
  siteRequestId: string;
  aiCoreRequestId: string;
  conversationThreadId: string;
  messageId: string;
  parentMessageId?: string | null;
  timestamp: string;
  route: 'owner_ai_core' | 'public_ai_core';
  siteSha: string;
  runtimeSha?: string;
  runtimeVersion?: string;
  contractSha?: string;
  canonicalizationVersion?: string;
  gatewaySha: string;
  sourcePage: string;
  pageContext?: unknown;
  currentMessage: string;
  recentMessages: readonly Record<string, unknown>[];
  runtimeTrace?: AiCoreRuntimeObservabilityTrace | null;
  transportEvidence?: AiCoreTransportEvidence | null;
  publicationStatus: AiTracePublicationStatus;
  visibleAnswer?: string | null;
  visibleSource?: string | null;
  publicationProvenance?: Readonly<Record<string, unknown>> | null;
  siteBlockingPredicate?: string | null;
  publishedAt?: string | null;
  stateVersionAfter?: number | null;
  committedMutations?: readonly Record<string, unknown>[];
  mutationAcknowledgementCount?: number;
  siteTotalLatencyMs?: number | null;
  preRuntimeFailureStage?: string | null;
}) {
  const runtimeTrace = input.runtimeTrace ?? null;
  const pipeline = tracePipeline(runtimeTrace, input);
  const runtimeState = runtimeTrace?.state ?? {};
  const runtimeRouting = runtimeTrace?.routing ?? {};
  const runtimeIdentity = runtimeTrace?.identity ?? {};
  const firstFailureStage = pipeline.find((stage) =>
    stage.status === 'error' || stage.status === 'blocked')?.name ?? null;
  const diagnostics = runtimeTrace?.diagnostics ?? {};
  const firstAppearance = diagnostics.first_appearance as
    | Record<string, unknown> | undefined;
  const instructionLeakWarning = Array.isArray(firstAppearance?.findings)
    && firstAppearance.findings.some((item) => (
      item && typeof item === 'object'
      && (item as Record<string, unknown>).warning_code
        === 'POSSIBLE_INTERNAL_INSTRUCTION_LEAK'
    ));
  const executorStage = pipeline.find((stage) => stage.name === 'executor');
  const runtimeTotal = typeof diagnostics.runtime_total_ms === 'number'
    ? diagnostics.runtime_total_ms
    : typeof executorStage?.latency_ms === 'number'
      ? executorStage.latency_ms : null;
  const executorTotal = typeof executorStage?.latency_ms === 'number'
    ? executorStage.latency_ms : null;
  const siteTotal = input.siteTotalLatencyMs ?? null;
  const clean = sanitizeAiTraceValue({
    schema_version: AI_TRACE_SCHEMA_VERSION,
    identity: {
      turn_id: input.turnId,
      site_request_id: input.siteRequestId,
      ai_core_request_id: input.aiCoreRequestId,
      conversation_thread_id: input.conversationThreadId,
      message_id: input.messageId,
      parent_message_id: input.parentMessageId ?? null,
      timestamp: input.timestamp,
      route: input.route,
      site_sha: input.siteSha,
      runtime_sha: input.runtimeSha ?? AI_CORE_RUNTIME_SHA,
      runtime_version: input.runtimeVersion ?? AI_CORE_RUNTIME_VERSION,
      contract_sha: input.contractSha ?? AI_CORE_CONTRACT_SHA,
      canonicalization_version:
        input.canonicalizationVersion ?? CANONICALIZATION_VERSION,
      gateway_sha: input.gatewaySha,
    },
    routing: {
      route: input.route,
      executor: runtimeRouting.executor
        ?? (typeof input.transportEvidence?.http_status === 'number'
          ? 'unobserved' : 'not_reached'),
      executor_request_count: runtimeRouting.executor_request_count
        ?? (typeof input.transportEvidence?.http_status === 'number' ? null : 0),
      retries: runtimeRouting.retries ?? 0,
      fallbacks: runtimeRouting.fallbacks ?? 0,
    },
    client_input: {
      raw_client_message: input.currentMessage,
      source_page: input.sourcePage,
      page_context: input.pageContext ?? null,
      recent_conversation_supplied_to_core: input.recentMessages,
    },
    state: {
      ...runtimeState,
      version_before: runtimeState.version_before
        ?? runtimeIdentity.state_version_before ?? null,
      version_after: input.stateVersionAfter
        ?? runtimeState.version_after_proposed ?? null,
      proposed_mutations: runtimeState.proposed_mutations ?? [],
      committed_mutations: input.committedMutations ?? [],
      mutation_acknowledgement_count:
        input.mutationAcknowledgementCount ?? 0,
    },
    pipeline,
    publication: {
      status: input.publicationStatus,
      visible_answer: input.visibleAnswer ?? null,
      visible_source: input.visibleSource ?? null,
      candidate_provenance: input.publicationProvenance ?? null,
      site_blocking_predicate: input.siteBlockingPredicate ?? null,
      published_at: input.publishedAt ?? null,
      route: input.route,
    },
    latency: {
      site_total_ms: siteTotal,
      runtime_total_ms: runtimeTotal,
      executor_ms: executorTotal,
      site_overhead_ms: siteTotal !== null && runtimeTotal !== null
        ? Math.max(0, siteTotal - runtimeTotal) : null,
      timeline: runtimeTrace?.timeline ?? [],
    },
    diagnostics: {
      ...diagnostics,
      first_failure_stage: firstFailureStage,
      instruction_leak_warning: instructionLeakWarning,
      trace_capture_boundary: runtimeTrace
        ? 'site_plus_runtime'
        : typeof input.transportEvidence?.http_status === 'number'
          ? 'site_after_runtime_without_runtime_trace'
          : 'site_only_pre_runtime',
      chain_of_thought_captured: false,
    },
  }) as Omit<AiCoreTurnTrace, 'trace_sha256'>;
  const result = {
    ...clean,
    trace_sha256: sha256(clean),
  } satisfies AiCoreTurnTrace;
  return Object.freeze(result);
}

export function runAiTraceMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_core_turn_trace_metadata (
      turn_id TEXT PRIMARY KEY,
      ai_core_request_id TEXT NOT NULL UNIQUE,
      conversation_thread_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      route TEXT NOT NULL CHECK (route IN ('owner_ai_core', 'public_ai_core')),
      publication_status TEXT NOT NULL CHECK (
        publication_status IN ('published', 'blocked', 'fallback', 'error')
      ),
      executor TEXT,
      evaluator_status TEXT,
      has_warning INTEGER NOT NULL CHECK (has_warning IN (0, 1)),
      instruction_leak_warning INTEGER NOT NULL CHECK (
        instruction_leak_warning IN (0, 1)
      ),
      first_failure_stage TEXT,
      site_sha TEXT NOT NULL,
      runtime_sha TEXT NOT NULL,
      runtime_version TEXT NOT NULL,
      contract_sha TEXT NOT NULL,
      total_latency_ms INTEGER,
      trace_sha256 TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      metadata_expires_at_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_core_turn_trace_payloads (
      turn_id TEXT PRIMARY KEY REFERENCES ai_core_turn_trace_metadata(turn_id)
        ON DELETE CASCADE,
      trace_json TEXT NOT NULL,
      payload_expires_at_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_core_turn_trace_annotations (
      annotation_id TEXT PRIMARY KEY,
      turn_id TEXT NOT NULL REFERENCES ai_core_turn_trace_metadata(turn_id)
        ON DELETE CASCADE,
      category TEXT NOT NULL,
      note TEXT,
      author_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ai_core_trace_metadata_thread
      ON ai_core_turn_trace_metadata(conversation_thread_id, created_at_ms);
    CREATE INDEX IF NOT EXISTS ai_core_trace_payload_expiry
      ON ai_core_turn_trace_payloads(payload_expires_at_ms);
    CREATE INDEX IF NOT EXISTS ai_core_trace_metadata_expiry
      ON ai_core_turn_trace_metadata(metadata_expires_at_ms);
  `);
}

export function cleanupExpiredAiTraces(
  db: Database.Database,
  nowMs = Date.now(),
) {
  runAiTraceMigrations(db);
  return db.transaction(() => {
    const payloads = db.prepare(`
      DELETE FROM ai_core_turn_trace_payloads
      WHERE payload_expires_at_ms <= ?
    `).run(nowMs).changes;
    const metadata = db.prepare(`
      DELETE FROM ai_core_turn_trace_metadata
      WHERE metadata_expires_at_ms <= ?
    `).run(nowMs).changes;
    return { payloads, metadata };
  })();
}

function summaryFromRow(row: {
  turn_id: string;
  ai_core_request_id: string;
  publication_status: AiTracePublicationStatus;
  executor: string | null;
  evaluator_status: string | null;
  has_warning: number;
  instruction_leak_warning: number;
  first_failure_stage: string | null;
  total_latency_ms: number | null;
  trace_available: number;
  created_at: string;
}): AiTraceSummary {
  return Object.freeze({
    turnId: row.turn_id,
    aiCoreRequestId: row.ai_core_request_id,
    publicationStatus: row.publication_status,
    executor: row.executor,
    evaluatorStatus: row.evaluator_status,
    hasWarning: row.has_warning === 1,
    instructionLeakWarning: row.instruction_leak_warning === 1,
    firstFailureStage: row.first_failure_stage,
    totalLatencyMs: row.total_latency_ms,
    traceAvailable: row.trace_available === 1,
    createdAt: row.created_at,
  });
}

export function recordAiCoreTurnTrace(
  db: Database.Database,
  trace: AiCoreTurnTrace,
  nowMs = Date.now(),
) {
  runAiTraceMigrations(db);
  cleanupExpiredAiTraces(db, nowMs);
  if (trace.schema_version !== AI_TRACE_SCHEMA_VERSION) {
    throw new Error('AI_TRACE_SCHEMA_UNSUPPORTED');
  }
  const withoutHash = { ...trace } as Record<string, unknown>;
  delete withoutHash.trace_sha256;
  if (sha256(withoutHash) !== trace.trace_sha256) {
    throw new Error('AI_TRACE_HASH_MISMATCH');
  }
  const encoded = canonicalJson(trace);
  if (Buffer.byteLength(encoded, 'utf8') > 2 * 1_024 * 1_024) {
    throw new Error('AI_TRACE_TOO_LARGE');
  }
  const identity = trace.identity;
  const turnId = identifier(identity.turn_id, 'turn_id');
  const requestId = identifier(identity.ai_core_request_id, 'request_id');
  identifier(identity.conversation_thread_id, 'conversation_thread_id');
  identifier(identity.message_id, 'message_id');
  sha(identity.site_sha, 'site_sha', 40);
  sha(identity.runtime_sha, 'runtime_sha', 40);
  sha(identity.contract_sha, 'contract_sha', 40);
  const evaluator = trace.pipeline.find((stage) =>
    stage.name === 'evaluator_final');
  const firstAppearance = trace.diagnostics.first_appearance as
    | Record<string, unknown> | undefined;
  const findings = Array.isArray(firstAppearance?.findings)
    ? firstAppearance.findings : [];
  const instructionLeakWarning = findings.some((item) => (
    item && typeof item === 'object'
    && (item as Record<string, unknown>).warning_code
      === 'POSSIBLE_INTERNAL_INSTRUCTION_LEAK'
  ));
  const hasWarning = instructionLeakWarning || trace.pipeline.some((stage) =>
    stage.status === 'warn' || stage.status === 'blocked'
    || stage.status === 'error');
  const routing = trace.routing;
  const publicationStatus = trace.publication.status as AiTracePublicationStatus;
  const createdAt = new Date(nowMs).toISOString();
  const payloadExpires = nowMs + AI_TRACE_FULL_RETENTION_MS;
  const metadataExpires = nowMs + AI_TRACE_METADATA_RETENTION_MS;
  return db.transaction(() => {
    const result = db.prepare(`
      INSERT OR IGNORE INTO ai_core_turn_trace_metadata (
        turn_id, ai_core_request_id, conversation_thread_id, message_id,
        route, publication_status, executor, evaluator_status, has_warning,
        instruction_leak_warning, first_failure_stage, site_sha, runtime_sha,
        runtime_version, contract_sha, total_latency_ms, trace_sha256,
        created_at, created_at_ms, metadata_expires_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      turnId,
      requestId,
      identity.conversation_thread_id,
      identity.message_id,
      identity.route,
      publicationStatus,
      typeof routing.executor === 'string' ? routing.executor : null,
      typeof evaluator?.output === 'object' && evaluator?.output
        ? String((evaluator.output as Record<string, unknown>).status ?? '') || null
        : null,
      hasWarning ? 1 : 0,
      instructionLeakWarning ? 1 : 0,
      typeof trace.diagnostics.first_failure_stage === 'string'
        ? trace.diagnostics.first_failure_stage : null,
      identity.site_sha,
      identity.runtime_sha,
      identity.runtime_version,
      identity.contract_sha,
      typeof trace.latency.site_total_ms === 'number'
        ? Math.trunc(trace.latency.site_total_ms) : null,
      trace.trace_sha256,
      createdAt,
      nowMs,
      metadataExpires,
    );
    const existing = db.prepare(`
      SELECT trace_sha256 FROM ai_core_turn_trace_metadata WHERE turn_id = ?
    `).get(turnId) as { trace_sha256: string } | undefined;
    if (!existing || existing.trace_sha256 !== trace.trace_sha256) {
      throw new Error('AI_TRACE_WRITE_ONCE_CONFLICT');
    }
    db.prepare(`
      INSERT OR IGNORE INTO ai_core_turn_trace_payloads (
        turn_id, trace_json, payload_expires_at_ms
      ) VALUES (?, ?, ?)
    `).run(turnId, encoded, payloadExpires);
    return Object.freeze({ created: result.changes === 1, traceSha256: trace.trace_sha256 });
  })();
}

export function tryRecordAiCoreTurnTrace(
  db: Database.Database,
  trace: AiCoreTurnTrace,
  nowMs = Date.now(),
) {
  try {
    return { ok: true as const, result: recordAiCoreTurnTrace(db, trace, nowMs) };
  } catch (error) {
    console.error(
      'AI_TRACE_WRITE_FAILED',
      error instanceof Error ? error.message : 'UNKNOWN',
    );
    return { ok: false as const, error: 'AI_TRACE_WRITE_FAILED' };
  }
}

export function listAiTraceSummariesByTurnIds(
  db: Database.Database,
  turnIds: readonly string[],
  nowMs = Date.now(),
) {
  runAiTraceMigrations(db);
  cleanupExpiredAiTraces(db, nowMs);
  if (turnIds.length === 0) return new Map<string, AiTraceSummary>();
  const placeholders = turnIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT metadata.*,
      CASE WHEN payload.turn_id IS NULL THEN 0 ELSE 1 END AS trace_available
    FROM ai_core_turn_trace_metadata AS metadata
    LEFT JOIN ai_core_turn_trace_payloads AS payload USING (turn_id)
    WHERE metadata.turn_id IN (${placeholders})
  `).all(...turnIds) as Array<Parameters<typeof summaryFromRow>[0]>;
  return new Map(rows.map((row) => [row.turn_id, summaryFromRow(row)]));
}

export function getAiCoreTurnTrace(
  db: Database.Database,
  turnId: string,
  nowMs = Date.now(),
) {
  runAiTraceMigrations(db);
  cleanupExpiredAiTraces(db, nowMs);
  const row = db.prepare(`
    SELECT metadata.*,
      CASE WHEN payload.turn_id IS NULL THEN 0 ELSE 1 END AS trace_available,
      payload.trace_json
    FROM ai_core_turn_trace_metadata AS metadata
    LEFT JOIN ai_core_turn_trace_payloads AS payload USING (turn_id)
    WHERE metadata.turn_id = ?
  `).get(identifier(turnId, 'turn_id')) as
    | (Parameters<typeof summaryFromRow>[0] & { trace_json: string | null })
    | undefined;
  if (!row) return null;
  const annotations = db.prepare(`
    SELECT annotation_id, category, note, author_user_id, created_at
    FROM ai_core_turn_trace_annotations
    WHERE turn_id = ? ORDER BY created_at_ms, annotation_id
  `).all(turnId);
  return Object.freeze({
    summary: summaryFromRow(row),
    trace: row.trace_json
      ? JSON.parse(row.trace_json) as AiCoreTurnTrace : null,
    annotations,
  });
}

export function addAiTraceAnnotation(
  db: Database.Database,
  input: {
    annotationId: string;
    turnId: string;
    category: AiTraceAnnotationCategory;
    note?: string | null;
    authorUserId: string;
    nowMs?: number;
  },
) {
  runAiTraceMigrations(db);
  if (!AI_TRACE_ANNOTATION_CATEGORIES.includes(input.category)) {
    throw new Error('AI_TRACE_ANNOTATION_CATEGORY_INVALID');
  }
  const note = input.note?.replace(/\0/g, '').trim() || null;
  if (note && (note.length > 2_000 || SECRET_PATTERN.test(note))) {
    throw new Error('AI_TRACE_ANNOTATION_UNSAFE');
  }
  const nowMs = input.nowMs ?? Date.now();
  const result = db.prepare(`
    INSERT INTO ai_core_turn_trace_annotations (
      annotation_id, turn_id, category, note, author_user_id,
      created_at, created_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    identifier(input.annotationId, 'annotation_id'),
    identifier(input.turnId, 'turn_id'),
    input.category,
    note,
    identifier(input.authorUserId, 'author_user_id'),
    new Date(nowMs).toISOString(),
    nowMs,
  );
  return result.changes === 1;
}
