import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { CANONICALIZATION_VERSION } from './canonical-json-hash-v1.ts';
import type { OwnerCanaryPreGateTelemetry } from './owner-ai-canary-adapter.ts';

export const OWNER_AI_CANARY_STATE_SCHEMA_VERSION = 4;

export type OwnerCanaryThreadState = {
  conversationThreadId: string;
  siteSessionId: string;
  stateVersion: number;
  confirmedProjectFacts: unknown[];
  candidateFacts: unknown[];
  conflicts: unknown[];
  activeQuestion: unknown | null;
  askedQuestions: unknown[];
  conversationPreferences: Record<string, unknown>;
  lastMutationAcknowledgement: unknown | null;
  updatedAt: string;
};

export type OwnerCanaryMutationProposal = {
  mutationId: string;
  conversationThreadId: string;
  messageId: string;
  expectedStateVersion: number;
  decisionPackageHash: string;
  patch: Partial<{
    confirmedProjectFacts: unknown[];
    candidateFacts: unknown[];
    conflicts: unknown[];
    activeQuestion: unknown | null;
    askedQuestions: unknown[];
    conversationPreferences: Record<string, unknown>;
  }>;
};

export type OwnerCanaryTelemetry = {
  turnId: string;
  conversationThreadId: string;
  messageId: string;
  aiCoreRequestId: string;
  contractVersion: string;
  runtimeSha: string;
  decisionPackageHash: string;
  plannedExecutor: string;
  finalExecutor: string;
  evaluationStatus: string;
  repairStatus: string;
  stateVersionBefore: number;
  stateVersionAfter: number;
  latencyMs: number;
  siteTerminalEventId: string;
  createdAt?: string;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function validId(value: string, field: string) {
  const normalized = value.replace(/\0/g, '').trim();
  if (!/^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(normalized)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function runOwnerAiCanaryMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS owner_ai_canary_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const v1 = db.prepare(`
    SELECT version FROM owner_ai_canary_migrations WHERE version = 1
  `).get();
  if (!v1) db.transaction(() => {
    db.exec(`
      CREATE TABLE owner_ai_canary_threads (
        conversation_thread_id TEXT PRIMARY KEY,
        site_session_id TEXT NOT NULL UNIQUE,
        state_version INTEGER NOT NULL DEFAULT 0 CHECK (state_version >= 0),
        confirmed_project_facts_json TEXT NOT NULL DEFAULT '[]',
        candidate_facts_json TEXT NOT NULL DEFAULT '[]',
        conflicts_json TEXT NOT NULL DEFAULT '[]',
        active_question_json TEXT,
        asked_questions_json TEXT NOT NULL DEFAULT '[]',
        conversation_preferences_json TEXT NOT NULL DEFAULT '{}',
        last_mutation_ack_json TEXT,
        updated_at TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE TABLE owner_ai_canary_messages (
        message_id TEXT PRIMARY KEY,
        conversation_thread_id TEXT NOT NULL,
        site_turn_id TEXT NOT NULL,
        request_payload_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (conversation_thread_id, site_turn_id),
        FOREIGN KEY (conversation_thread_id)
          REFERENCES owner_ai_canary_threads(conversation_thread_id)
          ON DELETE CASCADE
      );

      CREATE TABLE owner_ai_canary_mutations (
        mutation_id TEXT PRIMARY KEY,
        conversation_thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        proposal_hash TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('applied', 'rejected')),
        reason TEXT NOT NULL,
        state_version_before INTEGER NOT NULL,
        state_version_after INTEGER NOT NULL,
        acknowledgement_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_thread_id)
          REFERENCES owner_ai_canary_threads(conversation_thread_id)
          ON DELETE CASCADE,
        FOREIGN KEY (message_id)
          REFERENCES owner_ai_canary_messages(message_id)
          ON DELETE CASCADE
      );

      CREATE TABLE owner_ai_canary_revoked_sessions (
        jti TEXT PRIMARY KEY,
        expires_at_ms INTEGER NOT NULL,
        revoked_at TEXT NOT NULL
      );

      CREATE TABLE owner_ai_canary_turn_telemetry (
        turn_id TEXT PRIMARY KEY,
        audience TEXT NOT NULL CHECK (audience = 'owner_canary'),
        conversation_thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        ai_core_request_id TEXT NOT NULL,
        contract_version TEXT NOT NULL,
        runtime_sha TEXT NOT NULL,
        decision_package_hash TEXT NOT NULL,
        planned_executor TEXT NOT NULL,
        final_executor TEXT NOT NULL,
        evaluation_status TEXT NOT NULL,
        repair_status TEXT NOT NULL,
        state_version_before INTEGER NOT NULL,
        state_version_after INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        site_terminal_event_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (turn_id) REFERENCES ai_widget_turns(id) ON DELETE CASCADE,
        FOREIGN KEY (site_terminal_event_id)
          REFERENCES ai_widget_server_events(id) ON DELETE RESTRICT
      );
    `);
    db.prepare(`
      INSERT INTO owner_ai_canary_migrations(version, name, applied_at)
      VALUES (1, 'owner_ai_canary_foundation_v1', ?)
    `).run(new Date().toISOString());
  })();
  const v2 = db.prepare(`
    SELECT version FROM owner_ai_canary_migrations WHERE version = 2
  `).get();
  if (!v2) db.transaction(() => {
    db.exec(`
      CREATE TABLE owner_ai_canary_history (
        message_id TEXT PRIMARY KEY,
        conversation_thread_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
        created_at TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL,
        FOREIGN KEY (conversation_thread_id)
          REFERENCES owner_ai_canary_threads(conversation_thread_id)
          ON DELETE CASCADE
      );

      CREATE INDEX owner_ai_canary_history_thread_time
        ON owner_ai_canary_history(
          conversation_thread_id, created_at_ms, message_id
        );

      CREATE TABLE owner_ai_canary_runtime_responses (
        conversation_thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_payload_hash TEXT NOT NULL,
        response_hash TEXT NOT NULL,
        response_json TEXT NOT NULL,
        visible_answer TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (
          conversation_thread_id, message_id, idempotency_key
        ),
        FOREIGN KEY (conversation_thread_id)
          REFERENCES owner_ai_canary_threads(conversation_thread_id)
          ON DELETE CASCADE
      );

      CREATE TABLE owner_ai_canary_runtime_mutation_acks (
        response_id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        conversation_thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        proposal_hash TEXT NOT NULL,
        acknowledgement_json TEXT NOT NULL,
        accepted INTEGER NOT NULL CHECK (accepted IN (0, 1)),
        state_version_after INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_thread_id)
          REFERENCES owner_ai_canary_threads(conversation_thread_id)
          ON DELETE CASCADE
      );

      CREATE TABLE owner_ai_canary_runtime_telemetry (
        turn_id TEXT PRIMARY KEY,
        runtime_sha TEXT NOT NULL,
        raw_status TEXT NOT NULL,
        repair_applied INTEGER NOT NULL CHECK (repair_applied IN (0, 1)),
        final_status TEXT NOT NULL,
        blocking_reason_codes_json TEXT NOT NULL,
        component_versions_json TEXT NOT NULL,
        evidence_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (turn_id) REFERENCES ai_widget_turns(id) ON DELETE CASCADE
      );
    `);
    db.prepare(`
      INSERT INTO owner_ai_canary_migrations(version, name, applied_at)
      VALUES (2, 'owner_ai_canary_runtime_v114', ?)
    `).run(new Date().toISOString());
  })();
  const v3 = db.prepare(`
    SELECT version FROM owner_ai_canary_migrations WHERE version = 3
  `).get();
  if (!v3) db.transaction(() => {
    db.exec(`
      CREATE TABLE ai_core_public_route_telemetry (
        turn_id TEXT PRIMARY KEY,
        conversation_thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        ai_core_request_id TEXT NOT NULL,
        runtime_sha TEXT NOT NULL,
        contract_sha TEXT NOT NULL,
        planned_route TEXT NOT NULL CHECK (planned_route = 'ai_core'),
        actual_route TEXT NOT NULL CHECK (
          actual_route IN ('ai_core', 'legacy', 'fallback')
        ),
        fallback_reason TEXT,
        mutation_started INTEGER NOT NULL CHECK (mutation_started IN (0, 1)),
        state_version_before INTEGER,
        state_version_after INTEGER,
        response_hash TEXT,
        component_versions_json TEXT NOT NULL DEFAULT '{}',
        evidence_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (turn_id) REFERENCES ai_widget_turns(id) ON DELETE CASCADE
      );
    `);
    db.prepare(`
      INSERT INTO owner_ai_canary_migrations(version, name, applied_at)
      VALUES (3, 'ai_core_public_route_telemetry_v1', ?)
    `).run(new Date().toISOString());
  })();
  const v4 = db.prepare(`
    SELECT version FROM owner_ai_canary_migrations WHERE version = 4
  `).get();
  if (v4) return;
  db.transaction(() => {
    db.exec(`
      CREATE TABLE owner_ai_canary_pre_gate_telemetry (
        turn_id TEXT PRIMARY KEY,
        conversation_thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        ai_core_request_id TEXT NOT NULL,
        runtime_sha TEXT NOT NULL,
        contract_sha TEXT NOT NULL,
        canonicalization_version TEXT NOT NULL,
        decision_package_sha TEXT NOT NULL,
        projection_source_sha TEXT NOT NULL,
        planned_executor TEXT NOT NULL,
        final_executor TEXT NOT NULL,
        executor_request_count INTEGER NOT NULL CHECK (
          executor_request_count >= 0
        ),
        raw_evaluation_status TEXT NOT NULL,
        final_evaluation_status TEXT NOT NULL,
        evaluation_reason_codes_json TEXT NOT NULL,
        repair_applied INTEGER NOT NULL CHECK (repair_applied IN (0, 1)),
        repair_status TEXT NOT NULL,
        repair_reason_codes_json TEXT NOT NULL,
        publication_candidate_status TEXT NOT NULL,
        state_mutation_proposed INTEGER NOT NULL CHECK (
          state_mutation_proposed IN (0, 1)
        ),
        latency_stages_json TEXT NOT NULL,
        telemetry_ref TEXT NOT NULL UNIQUE,
        evidence_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (turn_id) REFERENCES ai_widget_turns(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_thread_id)
          REFERENCES owner_ai_canary_threads(conversation_thread_id)
          ON DELETE CASCADE,
        FOREIGN KEY (message_id)
          REFERENCES owner_ai_canary_messages(message_id)
          ON DELETE CASCADE
      );

      CREATE INDEX owner_ai_canary_pre_gate_request
        ON owner_ai_canary_pre_gate_telemetry(ai_core_request_id);
    `);
    db.prepare(`
      INSERT INTO owner_ai_canary_migrations(version, name, applied_at)
      VALUES (4, 'owner_ai_canary_pre_gate_telemetry_v1', ?)
    `).run(new Date().toISOString());
  })();
}

function rowToState(row: {
  conversation_thread_id: string;
  site_session_id: string;
  state_version: number;
  confirmed_project_facts_json: string;
  candidate_facts_json: string;
  conflicts_json: string;
  active_question_json: string | null;
  asked_questions_json: string;
  conversation_preferences_json: string;
  last_mutation_ack_json: string | null;
  updated_at: string;
}): OwnerCanaryThreadState {
  return {
    conversationThreadId: row.conversation_thread_id,
    siteSessionId: row.site_session_id,
    stateVersion: row.state_version,
    confirmedProjectFacts: parseJson(row.confirmed_project_facts_json),
    candidateFacts: parseJson(row.candidate_facts_json),
    conflicts: parseJson(row.conflicts_json),
    activeQuestion: row.active_question_json
      ? parseJson(row.active_question_json)
      : null,
    askedQuestions: parseJson(row.asked_questions_json),
    conversationPreferences: parseJson(row.conversation_preferences_json),
    lastMutationAcknowledgement: row.last_mutation_ack_json
      ? parseJson(row.last_mutation_ack_json)
      : null,
    updatedAt: row.updated_at,
  };
}

export function ensureOwnerCanaryThread(
  db: Database.Database,
  input: {
    conversationThreadId: string;
    siteSessionId: string;
    nowMs?: number;
  },
) {
  const threadId = validId(
    input.conversationThreadId,
    'conversation_thread_id',
  );
  const siteSessionId = validId(input.siteSessionId, 'site_session_id');
  const nowMs = input.nowMs ?? Date.now();
  const now = new Date(nowMs).toISOString();
  db.prepare(`
    INSERT INTO owner_ai_canary_threads (
      conversation_thread_id, site_session_id, updated_at, updated_at_ms
    ) VALUES (?, ?, ?, ?)
    ON CONFLICT(conversation_thread_id) DO UPDATE SET
      updated_at = excluded.updated_at,
      updated_at_ms = excluded.updated_at_ms
  `).run(threadId, siteSessionId, now, nowMs);
  const row = db.prepare(`
    SELECT * FROM owner_ai_canary_threads
    WHERE conversation_thread_id = ?
  `).get(threadId) as Parameters<typeof rowToState>[0];
  if (row.site_session_id !== siteSessionId) {
    throw new Error('CONVERSATION_IDENTITY_CONFLICT');
  }
  return rowToState(row);
}

export function registerOwnerCanaryMessage(
  db: Database.Database,
  input: {
    conversationThreadId: string;
    messageId: string;
    siteTurnId: string;
    requestPayload: unknown;
    nowMs?: number;
  },
) {
  const threadId = validId(
    input.conversationThreadId,
    'conversation_thread_id',
  );
  const messageId = validId(input.messageId, 'message_id');
  const siteTurnId = validId(input.siteTurnId, 'site_turn_id');
  const payloadHash = hash(input.requestPayload);
  const createdAt = new Date(input.nowMs ?? Date.now()).toISOString();
  const result = db.prepare(`
    INSERT OR IGNORE INTO owner_ai_canary_messages (
      message_id, conversation_thread_id, site_turn_id,
      request_payload_hash, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(messageId, threadId, siteTurnId, payloadHash, createdAt);
  const existing = db.prepare(`
    SELECT * FROM owner_ai_canary_messages WHERE message_id = ?
  `).get(messageId) as {
    conversation_thread_id: string;
    site_turn_id: string;
    request_payload_hash: string;
  } | undefined;
  if (!existing) throw new Error('MESSAGE_WRITE_FAILED');
  if (
    existing.conversation_thread_id !== threadId
    || existing.site_turn_id !== siteTurnId
    || existing.request_payload_hash !== payloadHash
  ) {
    throw new Error('IDEMPOTENCY_CONFLICT');
  }
  return { created: result.changes === 1, payloadHash };
}

function validatePatch(patch: OwnerCanaryMutationProposal['patch']) {
  const allowed = new Set([
    'confirmedProjectFacts',
    'candidateFacts',
    'conflicts',
    'activeQuestion',
    'askedQuestions',
    'conversationPreferences',
  ]);
  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) throw new Error('MUTATION_FIELD_FORBIDDEN');
  }
  stableJson(patch);
}

export function applyOwnerCanaryMutation(
  db: Database.Database,
  proposal: OwnerCanaryMutationProposal,
  nowMs = Date.now(),
) {
  validId(proposal.mutationId, 'mutation_id');
  validId(proposal.conversationThreadId, 'conversation_thread_id');
  validId(proposal.messageId, 'message_id');
  if (!/^[a-f0-9]{64}$/i.test(proposal.decisionPackageHash)) {
    throw new Error('INVALID_DECISION_PACKAGE_HASH');
  }
  if (!Number.isInteger(proposal.expectedStateVersion)
    || proposal.expectedStateVersion < 0) {
    throw new Error('INVALID_EXPECTED_STATE_VERSION');
  }
  validatePatch(proposal.patch);
  const proposalHash = hash(proposal);

  return db.transaction(() => {
    const prior = db.prepare(`
      SELECT proposal_hash, acknowledgement_json
      FROM owner_ai_canary_mutations WHERE mutation_id = ?
    `).get(proposal.mutationId) as {
      proposal_hash: string;
      acknowledgement_json: string;
    } | undefined;
    if (prior) {
      if (prior.proposal_hash !== proposalHash) {
        throw new Error('MUTATION_IDEMPOTENCY_CONFLICT');
      }
      return parseJson(prior.acknowledgement_json);
    }

    const row = db.prepare(`
      SELECT * FROM owner_ai_canary_threads
      WHERE conversation_thread_id = ?
    `).get(proposal.conversationThreadId) as Parameters<
      typeof rowToState
    >[0] | undefined;
    if (!row) throw new Error('THREAD_NOT_FOUND');
    const state = rowToState(row);
    const versionMatches =
      state.stateVersion === proposal.expectedStateVersion;
    const status = versionMatches ? 'applied' : 'rejected';
    const reason = versionMatches
      ? 'APPLIED'
      : 'STATE_VERSION_CONFLICT';
    const nextVersion = versionMatches
      ? state.stateVersion + 1
      : state.stateVersion;
    const acknowledgement = {
      mutationId: proposal.mutationId,
      status,
      reason,
      expectedStateVersion: proposal.expectedStateVersion,
      stateVersionBefore: state.stateVersion,
      stateVersionAfter: nextVersion,
      decisionPackageHash: proposal.decisionPackageHash,
    };
    const now = new Date(nowMs).toISOString();

    if (versionMatches) {
      const update = db.prepare(`
        UPDATE owner_ai_canary_threads SET
          state_version = ?,
          confirmed_project_facts_json = ?,
          candidate_facts_json = ?,
          conflicts_json = ?,
          active_question_json = ?,
          asked_questions_json = ?,
          conversation_preferences_json = ?,
          last_mutation_ack_json = ?,
          updated_at = ?,
          updated_at_ms = ?
        WHERE conversation_thread_id = ?
          AND state_version = ?
      `).run(
        nextVersion,
        stableJson(proposal.patch.confirmedProjectFacts
          ?? state.confirmedProjectFacts),
        stableJson(proposal.patch.candidateFacts ?? state.candidateFacts),
        stableJson(proposal.patch.conflicts ?? state.conflicts),
        proposal.patch.activeQuestion === undefined
          ? (state.activeQuestion === null ? null : stableJson(state.activeQuestion))
          : (proposal.patch.activeQuestion === null
            ? null
            : stableJson(proposal.patch.activeQuestion)),
        stableJson(proposal.patch.askedQuestions ?? state.askedQuestions),
        stableJson(proposal.patch.conversationPreferences
          ?? state.conversationPreferences),
        stableJson(acknowledgement),
        now,
        nowMs,
        proposal.conversationThreadId,
        state.stateVersion,
      );
      if (update.changes !== 1) {
        throw new Error('STATE_VERSION_RACE');
      }
    }

    db.prepare(`
      INSERT INTO owner_ai_canary_mutations (
        mutation_id, conversation_thread_id, message_id,
        proposal_hash, status, reason, state_version_before,
        state_version_after, acknowledgement_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposal.mutationId,
      proposal.conversationThreadId,
      proposal.messageId,
      proposalHash,
      status,
      reason,
      state.stateVersion,
      nextVersion,
      stableJson(acknowledgement),
      now,
    );
    return acknowledgement;
  })();
}

export function revokeOwnerCanarySession(
  db: Database.Database,
  input: { jti: string; expiresAtMs: number; nowMs?: number },
) {
  const jti = validId(input.jti, 'owner_session_id');
  db.prepare(`
    INSERT OR REPLACE INTO owner_ai_canary_revoked_sessions (
      jti, expires_at_ms, revoked_at
    ) VALUES (?, ?, ?)
  `).run(
    jti,
    input.expiresAtMs,
    new Date(input.nowMs ?? Date.now()).toISOString(),
  );
}

export function ownerCanarySessionRevoked(
  db: Database.Database,
  jti: string,
) {
  return Boolean(db.prepare(`
    SELECT 1 FROM owner_ai_canary_revoked_sessions WHERE jti = ?
  `).get(jti));
}

export function recordOwnerCanaryTelemetry(
  db: Database.Database,
  input: OwnerCanaryTelemetry,
) {
  const values = [
    input.turnId,
    input.conversationThreadId,
    input.messageId,
    input.aiCoreRequestId,
  ].map((value, index) => validId(value, [
    'turn_id',
    'conversation_thread_id',
    'message_id',
    'ai_core_request_id',
  ][index]));
  if (!/^[a-f0-9]{40,64}$/i.test(input.runtimeSha)) {
    throw new Error('INVALID_RUNTIME_SHA');
  }
  if (!/^[a-f0-9]{64}$/i.test(input.decisionPackageHash)) {
    throw new Error('INVALID_DECISION_PACKAGE_HASH');
  }
  for (const value of [
    input.contractVersion,
    input.plannedExecutor,
    input.finalExecutor,
    input.evaluationStatus,
    input.repairStatus,
    input.siteTerminalEventId,
  ]) {
    if (!value || value.length > 160 || /[\r\n\0]/.test(value)) {
      throw new Error('INVALID_TELEMETRY_VALUE');
    }
  }
  for (const value of [
    input.stateVersionBefore,
    input.stateVersionAfter,
    input.latencyMs,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('INVALID_TELEMETRY_NUMBER');
    }
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const row = {
    audience: 'owner_canary',
    turnId: values[0],
    conversationThreadId: values[1],
    messageId: values[2],
    aiCoreRequestId: values[3],
    contractVersion: input.contractVersion,
    runtimeSha: input.runtimeSha,
    decisionPackageHash: input.decisionPackageHash,
    plannedExecutor: input.plannedExecutor,
    finalExecutor: input.finalExecutor,
    evaluationStatus: input.evaluationStatus,
    repairStatus: input.repairStatus,
    stateVersionBefore: input.stateVersionBefore,
    stateVersionAfter: input.stateVersionAfter,
    latencyMs: input.latencyMs,
    siteTerminalEventId: input.siteTerminalEventId,
    createdAt,
  };
  const evidenceHash = hash(row);
  const existing = db.prepare(`
    SELECT * FROM owner_ai_canary_turn_telemetry WHERE turn_id = ?
  `).get(row.turnId) as Record<string, unknown> | undefined;
  if (existing) {
    const existingComparable = {
      audience: existing.audience,
      turnId: existing.turn_id,
      conversationThreadId: existing.conversation_thread_id,
      messageId: existing.message_id,
      aiCoreRequestId: existing.ai_core_request_id,
      contractVersion: existing.contract_version,
      runtimeSha: existing.runtime_sha,
      decisionPackageHash: existing.decision_package_hash,
      plannedExecutor: existing.planned_executor,
      finalExecutor: existing.final_executor,
      evaluationStatus: existing.evaluation_status,
      repairStatus: existing.repair_status,
      stateVersionBefore: existing.state_version_before,
      stateVersionAfter: existing.state_version_after,
      latencyMs: existing.latency_ms,
      siteTerminalEventId: existing.site_terminal_event_id,
      createdAt: existing.created_at,
    };
    if (hash(existingComparable) !== evidenceHash) {
      throw new Error('TELEMETRY_IDEMPOTENCY_CONFLICT');
    }
    return { created: false, evidenceHash };
  }
  db.prepare(`
    INSERT INTO owner_ai_canary_turn_telemetry (
      turn_id, audience, conversation_thread_id, message_id,
      ai_core_request_id, contract_version, runtime_sha,
      decision_package_hash, planned_executor, final_executor,
      evaluation_status, repair_status, state_version_before,
      state_version_after, latency_ms, site_terminal_event_id, created_at
    ) VALUES (
      @turnId, @audience, @conversationThreadId, @messageId,
      @aiCoreRequestId, @contractVersion, @runtimeSha,
      @decisionPackageHash, @plannedExecutor, @finalExecutor,
      @evaluationStatus, @repairStatus, @stateVersionBefore,
      @stateVersionAfter, @latencyMs, @siteTerminalEventId, @createdAt
    )
  `).run(row);
  return { created: true, evidenceHash };
}

export function ownerCanaryRequestId() {
  return `aicore_${randomUUID()}`;
}

export type OwnerCanaryRuntimeMutation = {
  mutation_id: string;
  target: 'thread_state';
  operation: string;
  field: string;
  value: unknown;
  expected_state_version: number;
  proposed_state_version: number;
  source_message_id: string;
  provenance: Record<string, unknown>;
  conflict_policy: string;
};

export type OwnerCanaryMutationAcknowledgement = {
  contract_version: '1.1';
  canonicalization_version: typeof CANONICALIZATION_VERSION;
  request_id: string;
  response_id: string;
  acknowledged_at: string;
  acknowledgements: Array<{
    mutation_id: string;
    status: 'applied' | 'rejected';
    reason_code: 'applied' | 'version_conflict' | 'schema_invalid'
      | 'decision_package_immutable';
    entity_version_before: number;
    entity_version_after: number;
    audit_ref: string;
  }>;
};

export function listOwnerCanaryHistory(
  db: Database.Database,
  conversationThreadId: string,
  limit = 20,
) {
  const threadId = validId(
    conversationThreadId,
    'conversation_thread_id',
  );
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const rows = db.prepare(`
    SELECT message_id, role, content, created_at
    FROM owner_ai_canary_history
    WHERE conversation_thread_id = ?
    ORDER BY created_at_ms DESC, message_id DESC
    LIMIT ?
  `).all(threadId, safeLimit) as Array<{
    message_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
  return rows.reverse();
}

export function appendOwnerCanaryHistory(
  db: Database.Database,
  input: {
    conversationThreadId: string;
    messageId: string;
    role: 'user' | 'assistant';
    content: string;
    nowMs?: number;
  },
) {
  const threadId = validId(
    input.conversationThreadId,
    'conversation_thread_id',
  );
  const messageId = validId(input.messageId, 'message_id');
  const content = input.content.replace(/\0/g, '').trim();
  if (!content || content.length > 4_000) {
    throw new Error('INVALID_HISTORY_CONTENT');
  }
  const nowMs = input.nowMs ?? Date.now();
  const row = {
    messageId,
    threadId,
    role: input.role,
    content,
    createdAt: new Date(nowMs).toISOString(),
    nowMs,
  };
  const result = db.prepare(`
    INSERT OR IGNORE INTO owner_ai_canary_history (
      message_id, conversation_thread_id, role, content,
      created_at, created_at_ms
    ) VALUES (
      @messageId, @threadId, @role, @content, @createdAt, @nowMs
    )
  `).run(row);
  const existing = db.prepare(`
    SELECT conversation_thread_id, role, content
    FROM owner_ai_canary_history WHERE message_id = ?
  `).get(messageId) as {
    conversation_thread_id: string;
    role: string;
    content: string;
  };
  if (existing.conversation_thread_id !== threadId
    || existing.role !== input.role
    || existing.content !== content) {
    throw new Error('HISTORY_IDEMPOTENCY_CONFLICT');
  }
  return { created: result.changes === 1 };
}

function validRuntimeMutation(value: OwnerCanaryRuntimeMutation) {
  validId(value.mutation_id, 'mutation_id');
  validId(value.source_message_id, 'source_message_id');
  if (value.target !== 'thread_state'
    || value.field.startsWith('decision_package')) {
    return 'decision_package_immutable' as const;
  }
  const operations = new Set([
    'set_confirmed_fact',
    'add_candidate_fact',
    'resolve_open_question',
    'record_conflict',
    'update_stage',
    'update_topic',
    'update_intent',
    'add_asked_question',
  ]);
  if (!operations.has(value.operation)
    || !/^[a-z][a-z0-9_]{0,79}$/.test(value.field)
    || !Number.isInteger(value.expected_state_version)
    || !Number.isInteger(value.proposed_state_version)
    || value.proposed_state_version !== value.expected_state_version + 1) {
    return 'schema_invalid' as const;
  }
  stableJson(value);
  return null;
}

export function applyOwnerCanaryMutationBatch(
  db: Database.Database,
  input: {
    conversationThreadId: string;
    messageId: string;
    requestId: string;
    responseId: string;
    mutations: OwnerCanaryRuntimeMutation[];
    nowMs?: number;
  },
): {
  acknowledgement: OwnerCanaryMutationAcknowledgement;
  state: OwnerCanaryThreadState;
  accepted: boolean;
} {
  const threadId = validId(
    input.conversationThreadId,
    'conversation_thread_id',
  );
  const messageId = validId(input.messageId, 'message_id');
  validId(input.requestId, 'request_id');
  validId(input.responseId, 'response_id');
  if (input.mutations.length > 100) {
    throw new Error('TOO_MANY_MUTATIONS');
  }
  const nowMs = input.nowMs ?? Date.now();
  const acknowledgedAt = new Date(nowMs).toISOString();
  const proposalHash = hash({
    requestId: input.requestId,
    responseId: input.responseId,
    conversationThreadId: threadId,
    messageId,
    mutations: input.mutations,
  });

  return db.transaction(() => {
    const row = db.prepare(`
      SELECT * FROM owner_ai_canary_threads
      WHERE conversation_thread_id = ?
    `).get(threadId) as Parameters<typeof rowToState>[0] | undefined;
    if (!row) throw new Error('THREAD_NOT_FOUND');
    const before = rowToState(row);
    const prior = db.prepare(`
      SELECT proposal_hash, acknowledgement_json, accepted
      FROM owner_ai_canary_runtime_mutation_acks
      WHERE response_id = ?
    `).get(input.responseId) as {
      proposal_hash: string;
      acknowledgement_json: string;
      accepted: number;
    } | undefined;
    if (prior) {
      if (prior.proposal_hash !== proposalHash) {
        throw new Error('MUTATION_BATCH_IDEMPOTENCY_CONFLICT');
      }
      return {
        acknowledgement: parseJson<OwnerCanaryMutationAcknowledgement>(
          prior.acknowledgement_json,
        ),
        state: before,
        accepted: prior.accepted === 1,
      };
    }
    const invalid: 'schema_invalid' | 'decision_package_immutable' | null =
      input.mutations.map(validRuntimeMutation)
        .find((item) => item !== null) ?? null;
    const versionsMatch = input.mutations.every(
      (item) => item.expected_state_version === before.stateVersion,
    );
    const proposedVersionsMatch = input.mutations.every(
      (item) => item.proposed_state_version === before.stateVersion + 1,
    );
    const accepted = invalid === null && versionsMatch
      && proposedVersionsMatch;
    const reason: 'applied' | 'version_conflict' | 'schema_invalid'
      | 'decision_package_immutable' = invalid
      ?? (accepted ? 'applied' : 'version_conflict');
    const nextVersion = accepted && input.mutations.length > 0
      ? before.stateVersion + 1
      : before.stateVersion;

    const facts = new Map(
      before.confirmedProjectFacts.map((item) => [
        String((item as Record<string, unknown>).field), item,
      ]),
    );
    const candidates = [...before.candidateFacts];
    const conflicts = [...before.conflicts];
    const asked = [...before.askedQuestions];
    const preferences = { ...before.conversationPreferences };
    let activeQuestion = before.activeQuestion;

    if (accepted) for (const mutation of input.mutations) {
      if (mutation.operation === 'set_confirmed_fact') {
        facts.set(mutation.field, {
          fact_id: `fact_${hash(mutation.mutation_id).slice(0, 16)}`,
          field: mutation.field,
          value: mutation.value,
          source_message_id: mutation.source_message_id,
          confirmed_at: acknowledgedAt,
          version: Math.max(1, mutation.proposed_state_version),
          conflict_state: 'none',
        });
      } else if (mutation.operation === 'add_candidate_fact') {
        candidates.push(mutation.value);
      } else if (mutation.operation === 'record_conflict') {
        const current = facts.get(mutation.field) as
          | Record<string, unknown> | undefined;
        conflicts.push({
          conflict_id: `conflict_${hash(mutation.mutation_id).slice(0, 16)}`,
          field: mutation.field,
          existing_fact_id: current?.fact_id
            ?? `fact_${hash(mutation.field).slice(0, 16)}`,
          candidate_id: `candidate_${hash(mutation.mutation_id).slice(0, 16)}`,
          status: 'open',
        });
      } else if (mutation.operation === 'resolve_open_question') {
        activeQuestion = null;
      } else if (mutation.operation === 'add_asked_question') {
        const value = mutation.value as Record<string, unknown>;
        const question = {
          question_id: `question_${hash(mutation.mutation_id).slice(0, 16)}`,
          goal: value.question_goal,
          expected_fields: value.expected_fields,
          asked_at_message_id: mutation.source_message_id,
        };
        asked.push(question);
        activeQuestion = question;
      } else if (mutation.operation === 'update_stage'
        || mutation.operation === 'update_topic'
        || mutation.operation === 'update_intent') {
        preferences[mutation.field] = mutation.value;
      }
    }

    const acknowledgements = input.mutations.map((mutation) => ({
      mutation_id: mutation.mutation_id,
      status: accepted ? 'applied' as const : 'rejected' as const,
      reason_code: accepted ? 'applied' as const : reason,
      entity_version_before: before.stateVersion,
      entity_version_after: nextVersion,
      audit_ref: `auditref:${hash(
        `${input.responseId}\0${mutation.mutation_id}`,
      ).slice(0, 32)}`,
    }));
    const acknowledgement: OwnerCanaryMutationAcknowledgement = {
      contract_version: '1.1',
      canonicalization_version: CANONICALIZATION_VERSION,
      request_id: input.requestId,
      response_id: input.responseId,
      acknowledged_at: acknowledgedAt,
      acknowledgements,
    };

    if (accepted && input.mutations.length > 0) {
      const update = db.prepare(`
        UPDATE owner_ai_canary_threads SET
          state_version = ?, confirmed_project_facts_json = ?,
          candidate_facts_json = ?, conflicts_json = ?,
          active_question_json = ?, asked_questions_json = ?,
          conversation_preferences_json = ?, last_mutation_ack_json = ?,
          updated_at = ?, updated_at_ms = ?
        WHERE conversation_thread_id = ? AND state_version = ?
      `).run(
        nextVersion,
        stableJson([...facts.values()]),
        stableJson(candidates),
        stableJson(conflicts),
        activeQuestion === null ? null : stableJson(activeQuestion),
        stableJson(asked),
        stableJson(preferences),
        stableJson(acknowledgement),
        acknowledgedAt,
        nowMs,
        threadId,
        before.stateVersion,
      );
      if (update.changes !== 1) throw new Error('STATE_VERSION_RACE');
    }
    const afterRow = db.prepare(`
      SELECT * FROM owner_ai_canary_threads
      WHERE conversation_thread_id = ?
    `).get(threadId) as Parameters<typeof rowToState>[0];
    db.prepare(`
      INSERT INTO owner_ai_canary_runtime_mutation_acks (
        response_id, request_id, conversation_thread_id, message_id,
        proposal_hash, acknowledgement_json, accepted,
        state_version_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.responseId,
      input.requestId,
      threadId,
      messageId,
      proposalHash,
      stableJson(acknowledgement),
      accepted || input.mutations.length === 0 ? 1 : 0,
      rowToState(afterRow).stateVersion,
      acknowledgedAt,
    );
    return {
      acknowledgement,
      state: rowToState(afterRow),
      accepted: accepted || input.mutations.length === 0,
    };
  })();
}

export function saveOwnerCanaryRuntimeResponse(
  db: Database.Database,
  input: {
    conversationThreadId: string;
    messageId: string;
    idempotencyKey: string;
    requestPayloadHash: string;
    response: unknown;
    visibleAnswer: string;
    createdAt?: string;
  },
) {
  const row = {
    conversationThreadId: validId(
      input.conversationThreadId,
      'conversation_thread_id',
    ),
    messageId: validId(input.messageId, 'message_id'),
    idempotencyKey: validId(input.idempotencyKey, 'idempotency_key'),
    requestPayloadHash: input.requestPayloadHash,
    responseHash: hash(input.response),
    responseJson: stableJson(input.response),
    visibleAnswer: input.visibleAnswer.trim(),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  if (!/^[a-f0-9]{64}$/.test(row.requestPayloadHash)
    || !row.visibleAnswer) throw new Error('INVALID_RUNTIME_RESPONSE_CACHE');
  db.prepare(`
    INSERT INTO owner_ai_canary_runtime_responses (
      conversation_thread_id, message_id, idempotency_key,
      request_payload_hash, response_hash, response_json,
      visible_answer, created_at
    ) VALUES (
      @conversationThreadId, @messageId, @idempotencyKey,
      @requestPayloadHash, @responseHash, @responseJson,
      @visibleAnswer, @createdAt
    )
  `).run(row);
  return { responseHash: row.responseHash };
}

export function getOwnerCanaryRuntimeResponse(
  db: Database.Database,
  input: {
    conversationThreadId: string;
    messageId: string;
    idempotencyKey: string;
  },
) {
  const row = db.prepare(`
    SELECT * FROM owner_ai_canary_runtime_responses
    WHERE conversation_thread_id = ? AND message_id = ?
      AND idempotency_key = ?
  `).get(
    validId(input.conversationThreadId, 'conversation_thread_id'),
    validId(input.messageId, 'message_id'),
    validId(input.idempotencyKey, 'idempotency_key'),
  ) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    requestPayloadHash: row.request_payload_hash as string,
    responseHash: row.response_hash as string,
    response: parseJson(row.response_json as string),
    visibleAnswer: row.visible_answer as string,
  };
}

function safeTelemetryText(value: string, field: string) {
  if (!value
    || value.length > 160
    || /[\r\n\0]/.test(value)) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
  return value;
}

export function recordOwnerCanaryPreGateTelemetry(
  db: Database.Database,
  input: {
    turnId: string;
    conversationThreadId: string;
    messageId: string;
    telemetry: OwnerCanaryPreGateTelemetry;
    createdAt?: string;
  },
) {
  const turnId = validId(input.turnId, 'turn_id');
  const conversationThreadId = validId(
    input.conversationThreadId,
    'conversation_thread_id',
  );
  const messageId = validId(input.messageId, 'message_id');
  const telemetry = input.telemetry;
  const aiCoreRequestId = validId(
    telemetry.aiCoreRequestId,
    'ai_core_request_id',
  );
  for (const [value, field] of [
    [telemetry.runtimeSha, 'runtime_sha'],
    [telemetry.contractSha, 'contract_sha'],
  ] as const) {
    if (!/^[a-f0-9]{40}$/.test(value)) {
      throw new Error(`INVALID_${field.toUpperCase()}`);
    }
  }
  for (const [value, field] of [
    [telemetry.decisionPackageSha, 'decision_package_sha'],
    [telemetry.projectionSourceSha, 'projection_source_sha'],
  ] as const) {
    if (!/^[a-f0-9]{64}$/.test(value)) {
      throw new Error(`INVALID_${field.toUpperCase()}`);
    }
  }
  for (const [value, field] of [
    [telemetry.canonicalizationVersion, 'canonicalization_version'],
    [telemetry.plannedExecutor, 'planned_executor'],
    [telemetry.finalExecutor, 'final_executor'],
    [telemetry.rawEvaluationStatus, 'raw_evaluation_status'],
    [telemetry.finalEvaluationStatus, 'final_evaluation_status'],
    [telemetry.repairStatus, 'repair_status'],
    [telemetry.publicationCandidateStatus, 'publication_candidate_status'],
  ] as const) {
    safeTelemetryText(value, field);
  }
  if (!Number.isSafeInteger(telemetry.executorRequestCount)
    || telemetry.executorRequestCount < 0) {
    throw new Error('INVALID_EXECUTOR_REQUEST_COUNT');
  }
  const telemetryRef = `owner-pre-gate:${turnId}`;
  const evidence = {
    turnId,
    conversationThreadId,
    messageId,
    aiCoreRequestId,
    runtimeSha: telemetry.runtimeSha,
    contractSha: telemetry.contractSha,
    canonicalizationVersion: telemetry.canonicalizationVersion,
    decisionPackageSha: telemetry.decisionPackageSha,
    projectionSourceSha: telemetry.projectionSourceSha,
    plannedExecutor: telemetry.plannedExecutor,
    finalExecutor: telemetry.finalExecutor,
    executorRequestCount: telemetry.executorRequestCount,
    rawEvaluationStatus: telemetry.rawEvaluationStatus,
    finalEvaluationStatus: telemetry.finalEvaluationStatus,
    evaluationReasonCodes: [...telemetry.evaluationReasonCodes],
    repairApplied: telemetry.repairApplied,
    repairStatus: telemetry.repairStatus,
    repairReasonCodes: [...telemetry.repairReasonCodes],
    publicationCandidateStatus: telemetry.publicationCandidateStatus,
    stateMutationProposed: telemetry.stateMutationProposed,
    latencyStages: telemetry.latencyStages,
    telemetryRef,
  };
  const evidenceHash = hash(evidence);
  const row = {
    ...evidence,
    evaluationReasonCodesJson: stableJson(evidence.evaluationReasonCodes),
    repairApplied: evidence.repairApplied ? 1 : 0,
    repairReasonCodesJson: stableJson(evidence.repairReasonCodes),
    stateMutationProposed: evidence.stateMutationProposed ? 1 : 0,
    latencyStagesJson: stableJson(evidence.latencyStages),
    evidenceHash,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const result = db.prepare(`
    INSERT OR IGNORE INTO owner_ai_canary_pre_gate_telemetry (
      turn_id, conversation_thread_id, message_id, ai_core_request_id,
      runtime_sha, contract_sha, canonicalization_version,
      decision_package_sha, projection_source_sha, planned_executor,
      final_executor, executor_request_count, raw_evaluation_status,
      final_evaluation_status, evaluation_reason_codes_json,
      repair_applied, repair_status, repair_reason_codes_json,
      publication_candidate_status, state_mutation_proposed,
      latency_stages_json, telemetry_ref, evidence_hash, created_at
    ) VALUES (
      @turnId, @conversationThreadId, @messageId, @aiCoreRequestId,
      @runtimeSha, @contractSha, @canonicalizationVersion,
      @decisionPackageSha, @projectionSourceSha, @plannedExecutor,
      @finalExecutor, @executorRequestCount, @rawEvaluationStatus,
      @finalEvaluationStatus, @evaluationReasonCodesJson,
      @repairApplied, @repairStatus, @repairReasonCodesJson,
      @publicationCandidateStatus, @stateMutationProposed,
      @latencyStagesJson, @telemetryRef, @evidenceHash, @createdAt
    )
  `).run(row);
  const existing = db.prepare(`
    SELECT evidence_hash, telemetry_ref
    FROM owner_ai_canary_pre_gate_telemetry
    WHERE turn_id = ?
  `).get(turnId) as {
    evidence_hash: string;
    telemetry_ref: string;
  } | undefined;
  if (!existing || existing.evidence_hash !== evidenceHash) {
    throw new Error('PRE_GATE_TELEMETRY_IDEMPOTENCY_CONFLICT');
  }
  return {
    created: result.changes === 1,
    evidenceHash,
    telemetryRef: existing.telemetry_ref,
  };
}

export function getOwnerCanaryPreGateTelemetry(
  db: Database.Database,
  turnId: string,
) {
  const row = db.prepare(`
    SELECT * FROM owner_ai_canary_pre_gate_telemetry WHERE turn_id = ?
  `).get(validId(turnId, 'turn_id')) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    turnId: row.turn_id as string,
    conversationThreadId: row.conversation_thread_id as string,
    messageId: row.message_id as string,
    aiCoreRequestId: row.ai_core_request_id as string,
    runtimeSha: row.runtime_sha as string,
    contractSha: row.contract_sha as string,
    canonicalizationVersion: row.canonicalization_version as string,
    decisionPackageSha: row.decision_package_sha as string,
    projectionSourceSha: row.projection_source_sha as string,
    plannedExecutor: row.planned_executor as string,
    finalExecutor: row.final_executor as string,
    executorRequestCount: row.executor_request_count as number,
    rawEvaluationStatus: row.raw_evaluation_status as string,
    finalEvaluationStatus: row.final_evaluation_status as string,
    evaluationReasonCodes: parseJson<string[]>(
      row.evaluation_reason_codes_json as string,
    ),
    repairApplied: row.repair_applied === 1,
    repairStatus: row.repair_status as string,
    repairReasonCodes: parseJson<string[]>(row.repair_reason_codes_json as string),
    publicationCandidateStatus: row.publication_candidate_status as string,
    stateMutationProposed: row.state_mutation_proposed === 1,
    latencyStages: parseJson<Record<string, number>>(
      row.latency_stages_json as string,
    ),
    telemetryRef: row.telemetry_ref as string,
    evidenceHash: row.evidence_hash as string,
  };
}

export function recordOwnerCanaryRuntimeTelemetry(
  db: Database.Database,
  input: {
    turnId: string;
    runtimeSha: string;
    rawStatus: string;
    repairApplied: boolean;
    finalStatus: string;
    blockingReasonCodes: string[];
    componentVersions: Record<string, unknown>;
    createdAt?: string;
  },
) {
  const row = {
    turnId: validId(input.turnId, 'turn_id'),
    runtimeSha: input.runtimeSha,
    rawStatus: input.rawStatus,
    repairApplied: input.repairApplied ? 1 : 0,
    finalStatus: input.finalStatus,
    blockingReasonCodesJson: stableJson(input.blockingReasonCodes),
    componentVersionsJson: stableJson(input.componentVersions),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  if (!/^[a-f0-9]{40}$/.test(row.runtimeSha)) {
    throw new Error('INVALID_RUNTIME_SHA');
  }
  const evidenceHash = hash(row);
  db.prepare(`
    INSERT INTO owner_ai_canary_runtime_telemetry (
      turn_id, runtime_sha, raw_status, repair_applied,
      final_status, blocking_reason_codes_json,
      component_versions_json, evidence_hash, created_at
    ) VALUES (
      @turnId, @runtimeSha, @rawStatus, @repairApplied,
      @finalStatus, @blockingReasonCodesJson,
      @componentVersionsJson, @evidenceHash, @createdAt
    )
  `).run({ ...row, evidenceHash });
  return { evidenceHash };
}

export function recordPublicAiCoreRouteTelemetry(
  db: Database.Database,
  input: {
    turnId: string;
    conversationThreadId: string;
    messageId: string;
    aiCoreRequestId: string;
    runtimeSha: string;
    contractSha: string;
    actualRoute: 'ai_core' | 'legacy' | 'fallback';
    fallbackReason?: string | null;
    mutationStarted: boolean;
    stateVersionBefore?: number | null;
    stateVersionAfter?: number | null;
    response?: unknown;
    componentVersions?: Record<string, unknown>;
    createdAt?: string;
  },
) {
  const row = {
    turnId: validId(input.turnId, 'turn_id'),
    conversationThreadId: validId(
      input.conversationThreadId,
      'conversation_thread_id',
    ),
    messageId: validId(input.messageId, 'message_id'),
    aiCoreRequestId: validId(input.aiCoreRequestId, 'ai_core_request_id'),
    runtimeSha: input.runtimeSha,
    contractSha: input.contractSha,
    plannedRoute: 'ai_core',
    actualRoute: input.actualRoute,
    fallbackReason: input.fallbackReason ?? null,
    mutationStarted: input.mutationStarted ? 1 : 0,
    stateVersionBefore: input.stateVersionBefore ?? null,
    stateVersionAfter: input.stateVersionAfter ?? null,
    responseHash: input.response === undefined ? null : hash(input.response),
    componentVersionsJson: stableJson(input.componentVersions ?? {}),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  if (!/^[a-f0-9]{40}$/.test(row.runtimeSha)
    || !/^[a-f0-9]{40}$/.test(row.contractSha)
    || (row.actualRoute === 'ai_core' && row.fallbackReason !== null)
    || (row.actualRoute !== 'ai_core' && !row.fallbackReason)
    || (row.mutationStarted === 1 && row.actualRoute !== 'ai_core')) {
    throw new Error('INVALID_PUBLIC_AI_CORE_TELEMETRY');
  }
  for (const value of [row.stateVersionBefore, row.stateVersionAfter]) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error('INVALID_PUBLIC_AI_CORE_STATE_VERSION');
    }
  }
  const evidenceHash = hash(row);
  const existing = db.prepare(`
    SELECT evidence_hash FROM ai_core_public_route_telemetry
    WHERE turn_id = ?
  `).get(row.turnId) as { evidence_hash: string } | undefined;
  if (existing) {
    if (existing.evidence_hash !== evidenceHash) {
      throw new Error('PUBLIC_AI_CORE_TELEMETRY_IDEMPOTENCY_CONFLICT');
    }
    return { created: false, evidenceHash };
  }
  db.prepare(`
    INSERT INTO ai_core_public_route_telemetry (
      turn_id, conversation_thread_id, message_id,
      ai_core_request_id, runtime_sha, contract_sha,
      planned_route, actual_route, fallback_reason,
      mutation_started, state_version_before, state_version_after,
      response_hash, component_versions_json, evidence_hash, created_at
    ) VALUES (
      @turnId, @conversationThreadId, @messageId,
      @aiCoreRequestId, @runtimeSha, @contractSha,
      @plannedRoute, @actualRoute, @fallbackReason,
      @mutationStarted, @stateVersionBefore, @stateVersionAfter,
      @responseHash, @componentVersionsJson, @evidenceHash, @createdAt
    )
  `).run({ ...row, evidenceHash });
  return { created: true, evidenceHash };
}
