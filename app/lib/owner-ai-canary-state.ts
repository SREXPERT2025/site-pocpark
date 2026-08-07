import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export const OWNER_AI_CANARY_STATE_SCHEMA_VERSION = 1;

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
  const current = db.prepare(`
    SELECT version FROM owner_ai_canary_migrations WHERE version = 1
  `).get();
  if (current) return;
  db.transaction(() => {
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
