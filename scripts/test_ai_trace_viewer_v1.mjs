import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import Ajv from 'ajv';
import {
  AI_TRACE_FULL_RETENTION_MS,
  AI_TRACE_METADATA_RETENTION_MS,
  AI_TRACE_SCHEMA_VERSION,
  AGENT_PILOT_TRACE_SCHEMA_VERSION,
  addAiTraceAnnotation,
  cleanupExpiredAiTraces,
  composeAgentPilotTurnTrace,
  composeAiCoreTurnTrace,
  getAiCoreTurnTrace,
  listAiTraceSummariesByTurnIds,
  recordAgentPilotTurnTrace,
  recordAiCoreTurnTrace,
  sanitizeAiTraceValue,
  tryRecordAiCoreTurnTrace,
} from '../app/lib/ai-trace-core.ts';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
  AI_CORE_RUNTIME_TRACE_VERSION,
  AI_CORE_RUNTIME_VERSION,
  CANONICALIZATION_VERSION,
  sha256,
} from '../app/lib/owner-ai-canary-adapter.ts';
import { AGENT_PILOT_RUNTIME_SHA } from '../app/lib/agent-pilot-owner-canary.ts';
import { leadAdminRoleHasPermission } from '../app/lib/lead-admin-auth-core.ts';

const ROOT = process.cwd();

function resolveSiteReleaseIdentity() {
  const inferredMode = fs.existsSync(path.join(ROOT, '.git'))
    ? 'dev_worktree'
    : 'extracted_release';
  const mode = process.env.ROSPARK_SITE_RELEASE_IDENTITY_MODE ?? inferredMode;

  if (mode === 'dev_worktree') {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  }

  assert.equal(mode, 'extracted_release');
  const manifestPath = process.env.ROSPARK_SITE_RELEASE_MANIFEST;
  assert.ok(manifestPath, 'ROSPARK_SITE_RELEASE_MANIFEST is required');
  const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'));
  assert.equal(manifest.schema, 'ROSPARK_AI_CORE_OWNER_CANARY_ASSEMBLY_V1');
  assert.match(manifest.site_sha, /^[0-9a-f]{40}$/);
  const siteArtifact = `site-${manifest.site_sha}.tar.gz`;
  assert.match(manifest.artifacts?.[siteArtifact] ?? '', /^[0-9a-f]{64}$/);
  return manifest.site_sha;
}

const SITE_SHA = resolveSiteReleaseIdentity();
const GATEWAY_SHA = 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9';
const fixture = JSON.parse(fs.readFileSync(path.join(
  ROOT,
  'scripts/fixtures/ai_trace_viewer_instruction_leak_incident_v1.json',
), 'utf8'));

let passed = 0;
function check(name, callback) {
  callback();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function stage(name, status, input = null, output = null, reasonCodes = []) {
  return {
    name,
    status,
    summary: `${name} fixture`,
    input,
    output,
    reason_codes: reasonCodes,
    latency_ms: name === 'executor' ? 17 : 1,
  };
}

function runtimeTrace({
  blocked = false,
  leak = false,
  currentGreeting = false,
  deterministic = false,
  knowledgeRequired = false,
} = {}) {
  const visible = currentGreeting
    ? fixture.current_live_greeting.visible_answer
    : leak ? fixture.turn_a.visible_answer : 'Краткий ответ.';
  const projection = leak
    ? { instruction: fixture.turn_a.projection_instruction }
    : currentGreeting
      ? { decision_type: 'not_required', style: 'courtesy' }
      : { must_include: ['Краткий ответ'] };
  const evaluatorStatus = blocked ? 'fail' : 'pass';
  const reasonCodes = blocked ? fixture.turn_b.reason_codes : [];
  const value = {
    schema_version: AI_CORE_RUNTIME_TRACE_VERSION,
    identity: {
      ai_core_request_id: fixture.turn_a.ai_core_request_id,
      conversation_thread_id: fixture.conversation_thread_id,
      message_id: fixture.turn_a.message_id,
      parent_message_id: null,
      timestamp: fixture.turn_a.timestamp,
      runtime_sha: AI_CORE_RUNTIME_SHA,
      runtime_version: AI_CORE_RUNTIME_VERSION,
      contract_sha: AI_CORE_CONTRACT_SHA,
      canonicalization_version: CANONICALIZATION_VERSION,
    },
    routing: {
      route: 'ai_core',
      execution_mode: deterministic ? 'deterministic' : 'model',
      executor: deterministic ? null : 'qwen',
      executor_request_count: deterministic ? 0 : 1,
      model_request_count: deterministic ? 0 : 1,
      model_attempt_present: !deterministic,
      deterministic_handler: deterministic ? 'courtesy' : null,
      retries: 0,
      fallbacks: 0,
    },
    state: {
      version_before: 3,
      version_after_proposed: 3,
      durable_before: [{ field: 'object_type', value: 'business_center' }],
      request_local_effective: { object_type: 'business_center' },
      proposed_mutations: [],
      committed_mutations: [],
    },
    pipeline: [
      stage('client_message', 'pass', { current_message: 'fixture' }),
      stage('context_integrity', 'pass', { durable_facts: [] }, {
        resolved_intent: 'utility',
        resolved_action: 'answer_directly',
        extracted_current_turn_facts: {},
      }),
      stage('project_memory', 'pass', {}, {
        durable_before: [],
        request_local_effective: {},
        proposed_mutations: [],
      }),
      stage('sales_controller', 'pass', {}, { next_best_action: 'answer_directly' }),
      stage('engineering_lab', 'not_used', {}, { invoked: false }),
      stage('decision_package', 'pass', {}, {
        decision_package: { decision_type: 'not_required' },
        sha256: fixture.turn_a.decision_package_sha,
      }),
      stage('knowledge_sources', knowledgeRequired ? 'pass' : 'not_used', {
        required: knowledgeRequired,
        attempted: knowledgeRequired,
      }, knowledgeRequired ? {
        available: true,
        retrieval_result_count: 1,
        knowledge_projection_count: 1,
        executor_received_knowledge_count: 1,
      } : []),
      stage('verbalization_projection', 'pass', {}, {
        projection,
        sha256: fixture.turn_a.projection_sha,
      }),
      stage('executor', 'pass', {
        transport_messages: [{ role: 'user', content: JSON.stringify(projection) }],
        decision_projection: projection,
      }, {
        raw_answer: visible,
        executor_trace: deterministic ? {
          execution_mode: 'deterministic',
          planned_executor: null,
          final_executor: null,
          attempts: [],
          model_request_count: 0,
          deterministic_handler: 'courtesy',
        } : {
          execution_mode: 'model',
          final_executor: 'qwen',
          attempts: [{ latency_ms: 17 }],
          model_request_count: 1,
          deterministic_handler: null,
        },
      }),
      stage('evaluator_raw', blocked ? 'blocked' : 'pass', {}, {
        status: evaluatorStatus,
        reason_codes: reasonCodes,
        semantic_coverage: { status: evaluatorStatus },
      }, reasonCodes),
      stage('repair', 'not_used', { answer: visible }, {
        answer: visible,
        repair: { applied: false },
        reason_codes: [],
        diff: { changed: false, lines: [] },
      }),
      stage('evaluator_final', blocked ? 'blocked' : 'pass', {}, {
        status: evaluatorStatus,
        reason_codes: reasonCodes,
      }, reasonCodes),
      stage('runtime_publication', blocked ? 'blocked' : 'pass', null, {
        candidate_status: blocked ? 'blocked' : 'allowed',
        published: false,
      }, reasonCodes),
    ],
    timeline: [
      { stage: 'runtime_accepted', at_ms: 0.2, duration_since_previous_ms: 0.2 },
      { stage: 'executor_output', at_ms: 19, duration_since_previous_ms: 18.8 },
    ],
    diagnostics: {
      first_failure_stage: blocked ? 'evaluator_raw' : null,
      runtime_total_ms: 24,
      first_appearance: {
        status: leak || currentGreeting ? 'warn' : 'pass',
        findings: leak || currentGreeting ? [{
          fragment: currentGreeting
            ? 'финальное инженерное решение' : 'заверши ответ',
          first_stage: currentGreeting
            ? 'raw_executor_output' : 'verbalization_projection',
          present_stages: [
            ...(currentGreeting ? [] : ['verbalization_projection', 'model_input']),
            'raw_executor_output', 'visible_candidate',
          ],
          visible: true,
          warning_code: 'POSSIBLE_INTERNAL_INSTRUCTION_LEAK',
        }] : [],
      },
    },
    runtime_error: null,
  };
  value.trace_sha256 = sha256(value);
  return value;
}

function compose({
  turn = fixture.turn_a,
  blocked = false,
  leak = false,
  preRuntime = false,
  recentMessages = [],
  currentGreeting = false,
  deterministic = false,
  knowledgeRequired = false,
} = {}) {
  return composeAiCoreTurnTrace({
    turnId: turn.turn_id,
    siteRequestId: `site:${turn.turn_id}`,
    aiCoreRequestId: turn.ai_core_request_id,
    conversationThreadId: fixture.conversation_thread_id,
    messageId: turn.message_id,
    parentMessageId: null,
    timestamp: turn.timestamp,
    route: 'public_ai_core',
    siteSha: SITE_SHA,
    runtimeSha: AI_CORE_RUNTIME_SHA,
    runtimeVersion: AI_CORE_RUNTIME_VERSION,
    contractSha: AI_CORE_CONTRACT_SHA,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    gatewaySha: GATEWAY_SHA,
    sourcePage: '/parkovka',
    currentMessage: turn.user_message,
    recentMessages,
    runtimeTrace: preRuntime ? null : runtimeTrace({
      blocked,
      leak,
      currentGreeting,
      deterministic,
      knowledgeRequired,
    }),
    publicationStatus: preRuntime ? 'error' : blocked ? 'blocked' : 'published',
    visibleAnswer: blocked || preRuntime ? null
      : currentGreeting
        ? fixture.current_live_greeting.visible_answer
        : leak ? fixture.turn_a.visible_answer : 'Краткий ответ.',
    visibleSource: blocked || preRuntime ? null : 'raw_qwen',
    siteBlockingPredicate: preRuntime ? 'AI_CORE_PUBLIC_RELEASE_PIN_INVALID'
      : blocked ? 'AI_CORE_FINAL_GATE_BLOCKED' : null,
    publishedAt: blocked || preRuntime ? null : '2026-08-11T13:10:11.000Z',
    stateVersionAfter: 3,
    committedMutations: [],
    mutationAcknowledgementCount: 0,
    siteTotalLatencyMs: 31,
    preRuntimeFailureStage: preRuntime ? 'release_pin_gate' : null,
  });
}

function composeAgentPilot({ reconsideration = false, slow = false } = {}) {
  const roleCalls = [
    { sequence: 1, role: 'context', latency_ms: slow ? 19_000 : 19, model: 'codex', reasoning_effort: 'low', status: 'pass', used_downstream: true },
    { sequence: 2, role: 'orchestrator', latency_ms: slow ? 31_000 : 31, model: 'codex', reasoning_effort: 'medium', status: 'pass', used_downstream: true },
    { sequence: 3, role: 'critic', latency_ms: slow ? 23_000 : 23, model: 'codex', reasoning_effort: 'medium', status: 'pass', used_downstream: true },
    ...(reconsideration ? [
      { sequence: 4, role: 'orchestrator', latency_ms: slow ? 21_000 : 21, model: 'codex', reasoning_effort: 'medium', status: 'pass', used_downstream: true },
    ] : []),
  ];
  const runtimeMs = roleCalls.reduce((sum, item) => sum + item.latency_ms, 0)
    + (slow ? 8_000 : 8);
  return composeAgentPilotTurnTrace({
    turnId: 'turn_agent_pilot_trace_0001',
    siteRequestId: 'request_agent_pilot_trace_0001',
    traceId: 'apt_agent_pilot_trace_0001',
    conversationThreadId: 'conversation_agent_pilot_trace_0001',
    messageId: 'message_agent_pilot_trace_0001',
    timestamp: '2026-09-01T12:00:00.000Z',
    siteSha: SITE_SHA,
    runtimeSha: AGENT_PILOT_RUNTIME_SHA,
    bridgeVersion: 'AGENT_PILOT_OWNER_CANARY_BRIDGE_V1',
    sourcePage: '/',
    currentMessage: 'Какая длина стрелы предусмотрена для шлагбаума FSP?',
    bridgeTrace: {
      latency_ms: runtimeMs,
      bridge_wall_ms: runtimeMs + 5,
      role_calls: roleCalls,
      codex_calls: roleCalls.length,
      transport_calls_this_request: roleCalls.length,
      critic_used: true,
      reconsideration_used: reconsideration,
      duplicate_execution_prevented: false,
      durable_result_reused: false,
      selected_evidence: [{
        knowledge_id: 'barrier-fsp-03-05',
        source_id: 'fsp-approved-catalog',
        authority_class: 'manufacturer_documentation',
        approval_status: 'approved',
        customer_facing: true,
        evidence_role: 'factual',
        excerpt: 'Для FSP / 03-05 предусмотрена стрела длиной 3 м.',
        used_in_final: true,
        authorization: 'pass',
      }],
      object_card_before: {
        version: 1,
        confirmed_facts: [],
        inferred_facts: [],
        open_questions: [],
      },
      object_card_after: {
        version: 2,
        confirmed_facts: [{
          field: 'barrier_model',
          raw_value: 'FSP',
          normalized_value: 'fsp',
        }],
        inferred_facts: [],
        open_questions: [],
      },
      critic_findings: reconsideration
        ? { status: 'reconsider', unsupported_claims: ['claim_extra'] }
        : { status: 'pass', unsupported_claims: [] },
      claim_plan: [{ claim_id: 'claim_fsp', evidence_ids: ['barrier-fsp-03-05'] }],
      answer_obligations: [],
      safety_findings: [],
      metadata_defects: [],
    },
    publicationStatus: 'published',
    visibleAnswer: 'Для шлагбаума FSP / 03-05 предусмотрена стрела длиной 3 м.',
    siteTotalLatencyMs: runtimeMs + 12,
    publishedAt: '2026-09-01T12:01:35.000Z',
  });
}

check('successful turn trace has every P0 stage and exact identity', () => {
  const trace = compose();
  assert.equal(trace.schema_version, AI_TRACE_SCHEMA_VERSION);
  assert.equal(trace.identity.runtime_sha, AI_CORE_RUNTIME_SHA);
  assert.equal(trace.identity.contract_sha, AI_CORE_CONTRACT_SHA);
  assert.equal(trace.publication.status, 'published');
  assert.equal(trace.pipeline.at(-1).name, 'site_publication');
  assert.equal(trace.pipeline.at(-1).status, 'pass');
  assert.equal(trace.latency.site_total_ms, 31);
  assert.equal(trace.latency.runtime_total_ms, 24);
  assert.equal(trace.latency.executor_ms, 17);
  assert.equal(trace.latency.site_overhead_ms, 7);
});

check('blocked turn trace preserves Runtime evidence and Site predicate', () => {
  const trace = compose({ blocked: true });
  assert.equal(trace.publication.status, 'blocked');
  assert.equal(trace.publication.site_blocking_predicate, 'AI_CORE_FINAL_GATE_BLOCKED');
  assert.equal(trace.diagnostics.first_failure_stage, 'evaluator_raw');
  assert.equal(trace.state.committed_mutations.length, 0);
  assert.equal(trace.pipeline.find((item) => item.name === 'executor').status, 'pass');
});

check('pre-Runtime failure marks later stages not reached', () => {
  const trace = compose({ preRuntime: true });
  assert.equal(trace.diagnostics.trace_capture_boundary, 'site_only_pre_runtime');
  assert.equal(trace.diagnostics.first_failure_stage, 'release_pin_gate');
  assert.equal(trace.pipeline.find((item) => item.name === 'executor').status, 'not_reached');
  assert.equal(trace.routing.executor_request_count, 0);
});

check('instruction-leak fixture points to projection before raw and visible', () => {
  const trace = compose({ leak: true });
  const finding = trace.diagnostics.first_appearance.findings[0];
  assert.equal(finding.first_stage, 'verbalization_projection');
  assert.equal(finding.warning_code, 'POSSIBLE_INTERNAL_INSTRUCTION_LEAK');
  assert.equal(trace.diagnostics.instruction_leak_warning, true);
  assert.equal(trace.publication.visible_answer, fixture.turn_a.visible_answer);
});

check('current greeting fixture points engineering content to raw Qwen output', () => {
  const trace = compose({
    turn: {
      ...fixture.turn_a,
      user_message: fixture.current_live_greeting.user_message,
    },
    currentGreeting: true,
  });
  const finding = trace.diagnostics.first_appearance.findings[0];
  assert.equal(finding.fragment, 'финальное инженерное решение');
  assert.equal(finding.first_stage, 'raw_executor_output');
  assert.equal(
    trace.publication.visible_answer,
    fixture.current_live_greeting.visible_answer,
  );
});

check('following fixture exposes contaminated assistant history exactly', () => {
  const prior = {
    message_id: fixture.turn_a.message_id,
    role: 'assistant',
    content: fixture.turn_b.recent_assistant_message,
    created_at: fixture.turn_a.timestamp,
  };
  const trace = compose({
    turn: fixture.turn_b,
    blocked: true,
    recentMessages: [prior],
  });
  assert.deepEqual(trace.client_input.recent_conversation_supplied_to_core, [prior]);
  assert.equal(
    trace.client_input.recent_conversation_supplied_to_core[0].content,
    fixture.turn_a.visible_answer,
  );
});

check('deterministic trace exposes zero-attempt execution provenance', () => {
  const trace = compose({ deterministic: true });
  assert.equal(trace.routing.execution_mode, 'deterministic');
  assert.equal(trace.routing.executor, null);
  assert.equal(trace.routing.executor_request_count, 0);
  assert.equal(trace.routing.model_request_count, 0);
  assert.equal(trace.routing.model_attempt_present, false);
  assert.equal(trace.routing.deterministic_handler, 'courtesy');
  const executor = trace.pipeline.find((item) => item.name === 'executor');
  assert.deepEqual(executor.output.executor_trace.attempts, []);
});

check('knowledge-required trace exposes retrieval and executor propagation', () => {
  const trace = compose({ deterministic: true, knowledgeRequired: true });
  const knowledge = trace.pipeline.find(
    (item) => item.name === 'knowledge_sources',
  );
  assert.equal(knowledge.status, 'pass');
  assert.equal(knowledge.input.required, true);
  assert.equal(knowledge.output.executor_received_knowledge_count, 1);
});

check('sanitizer removes secrets and hidden-reasoning values', () => {
  const sanitized = sanitizeAiTraceValue({
    token: 'secret-token',
    authorization: 'Bearer abcdefghijklmnopqrstuvwxyz',
    chain_of_thought: 'private reasoning',
    safe: 'visible structured fact',
    output: 'sk-super-secret-key-value',
  });
  const encoded = JSON.stringify(sanitized);
  assert.equal(sanitized.safe, 'visible structured fact');
  assert(!encoded.includes('secret-token'));
  assert(!encoded.includes('private reasoning'));
  assert(!encoded.includes('sk-super-secret'));
});

check('Site trace validates against shipped JSON schema', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(
    ROOT, 'generated/contracts/AI_TRACE_VIEWER_V1/site-trace-v1.schema.json',
  ), 'utf8'));
  const validate = new Ajv({ allErrors: true, schemaId: 'auto' }).compile(schema);
  const trace = compose();
  assert.equal(validate(trace), true, JSON.stringify(validate.errors));
});

check('write-once storage is idempotent and rejects changed evidence', () => {
  const db = new Database(':memory:');
  const trace = compose();
  assert.equal(recordAiCoreTurnTrace(db, trace, 1_800_000_000_000).created, true);
  assert.equal(recordAiCoreTurnTrace(db, trace, 1_800_000_000_001).created, false);
  const changed = { ...trace, publication: { ...trace.publication, visible_answer: 'changed' } };
  const unhashed = { ...changed };
  delete unhashed.trace_sha256;
  changed.trace_sha256 = sha256(unhashed);
  assert.throws(
    () => recordAiCoreTurnTrace(db, changed, 1_800_000_000_002),
    /AI_TRACE_WRITE_ONCE_CONFLICT/,
  );
  db.close();
});

check('full payload expires before aggregate metadata', () => {
  const db = new Database(':memory:');
  const now = 1_800_000_000_000;
  const trace = compose();
  recordAiCoreTurnTrace(db, trace, now);
  cleanupExpiredAiTraces(db, now + AI_TRACE_FULL_RETENTION_MS + 1);
  const retained = getAiCoreTurnTrace(db, trace.identity.turn_id, now + AI_TRACE_FULL_RETENTION_MS + 1);
  assert.equal(retained.trace, null);
  assert.equal(retained.summary.traceAvailable, false);
  cleanupExpiredAiTraces(db, now + AI_TRACE_METADATA_RETENTION_MS + 1);
  assert.equal(getAiCoreTurnTrace(db, trace.identity.turn_id, now + AI_TRACE_METADATA_RETENTION_MS + 1), null);
  db.close();
});

check('owner annotation is separate and original trace hash is immutable', () => {
  const db = new Database(':memory:');
  const trace = compose();
  recordAiCoreTurnTrace(db, trace, 1_800_000_000_000);
  addAiTraceAnnotation(db, {
    annotationId: 'annotation:fixture-0001',
    turnId: trace.identity.turn_id,
    category: 'instruction_leak',
    note: 'Confirmed by owner.',
    authorUserId: 'admin:andrey',
    nowMs: 1_800_000_000_010,
  });
  const saved = getAiCoreTurnTrace(db, trace.identity.turn_id, 1_800_000_000_020);
  assert.equal(saved.trace.trace_sha256, trace.trace_sha256);
  assert.equal(saved.annotations.length, 1);
  db.close();
});

check('trace DB failure is fail-open relative to the customer path', () => {
  const db = new Database(':memory:');
  db.close();
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(tryRecordAiCoreTurnTrace(db, compose()).ok, false);
  } finally {
    console.error = original;
  }
});

check('director-only permission protects full trace and annotation', () => {
  assert.equal(leadAdminRoleHasPermission('director', 'trace'), true);
  assert.equal(leadAdminRoleHasPermission('sales_head', 'trace'), false);
});

check('summary lookup exposes metadata without raw payload coupling', () => {
  const db = new Database(':memory:');
  const trace = compose();
  recordAiCoreTurnTrace(db, trace, 1_800_000_000_000);
  const summaries = listAiTraceSummariesByTurnIds(
    db, [trace.identity.turn_id], 1_800_000_000_001,
  );
  const summary = summaries.get(trace.identity.turn_id);
  assert.equal(summary.executor, 'qwen');
  assert.equal(summary.traceAvailable, true);
  assert.equal(summary.publicationStatus, 'published');
  db.close();
});

check('Agent Pilot trace stores FSP evidence, latency and confirmed Object Card changes', () => {
  const db = new Database(':memory:');
  const trace = composeAgentPilot({ slow: true });
  const schema = JSON.parse(fs.readFileSync(path.join(
    ROOT,
    'generated/contracts/AGENT_PILOT_TRACE_VIEWER_V1/site-trace-v1.schema.json',
  ), 'utf8'));
  const validate = new Ajv({ allErrors: true, schemaId: 'auto' }).compile(schema);
  assert.equal(validate(trace), true, JSON.stringify(validate.errors));
  assert.equal(trace.schema_version, AGENT_PILOT_TRACE_SCHEMA_VERSION);
  assert.equal(trace.identity.runtime_sha, AGENT_PILOT_RUNTIME_SHA);
  assert.equal(trace.identity.route, 'owner_agent_pilot');
  assert.equal(trace.knowledge[0].authorization, 'pass');
  assert.equal(trace.knowledge[0].used_in_final, true);
  assert.equal(trace.state.changes.confirmed_direct.added[0].field, 'barrier_model');
  assert.equal(trace.latency.slowest_role, 'orchestrator');
  assert.equal(recordAgentPilotTurnTrace(db, trace, 1_800_000_000_000).created, true);
  const saved = getAiCoreTurnTrace(db, trace.identity.turn_id, 1_800_000_000_001);
  assert.equal(saved.summary.traceSource, 'agent_pilot');
  assert.equal(saved.summary.route, 'owner_agent_pilot');
  assert.equal(saved.trace.trace_sha256, trace.trace_sha256);
  db.close();
});

check('Agent Pilot reconsideration and write-once integrity remain visible', () => {
  const db = new Database(':memory:');
  const trace = composeAgentPilot({ reconsideration: true });
  recordAgentPilotTurnTrace(db, trace, 1_800_000_000_000);
  assert.equal(trace.routing.reconsideration_used, true);
  assert.equal(trace.pipeline.find((stage) => stage.name === 'agent_reconsideration').status, 'pass');
  const changed = {
    ...trace,
    publication: { ...trace.publication, visible_answer: 'changed' },
  };
  const unhashed = { ...changed };
  delete unhashed.trace_sha256;
  changed.trace_sha256 = sha256(unhashed);
  assert.throws(
    () => recordAgentPilotTurnTrace(db, changed, 1_800_000_000_002),
    /AGENT_PILOT_TRACE_WRITE_ONCE_CONFLICT/,
  );
  db.close();
});

check('Agent Pilot trace sanitization removes secrets and private reasoning', () => {
  const trace = composeAgentPilot();
  const encoded = JSON.stringify(trace);
  assert.equal(encoded.includes('"chain_of_thought":'), false);
  assert.equal(encoded.includes('Bearer '), false);
  assert.equal(trace.diagnostics.chain_of_thought_captured, false);
  assert.equal(trace.diagnostics.secrets_captured, false);
});

check('owner UI and JSON export are integrated under admin routes only', () => {
  const dashboard = fs.readFileSync(
    path.join(ROOT, 'app/admin/ai-widget/AiWidgetAdminDashboard.tsx'), 'utf8',
  );
  const viewer = fs.readFileSync(
    path.join(ROOT, 'app/admin/ai-widget/AiTraceViewer.tsx'), 'utf8',
  );
  const exportRoute = path.join(
    ROOT, 'app/api/admin/ai-widget/trace/[turnId]/export/route.ts',
  );
  assert(dashboard.includes('Диагностика'));
  assert(dashboard.includes('Trace временно недоступен'));
  assert(viewer.includes('AI_TRACE_VIEWER_V1'));
  assert(viewer.includes('AGENT_PILOT_TRACE_VIEWER_V1'));
  assert(viewer.includes('Скопировать JSON'));
  assert(viewer.includes('Скачать JSON'));
  assert(viewer.includes('Object Card · до → после'));
  assert(viewer.includes('Где ушло время'));
  assert(fs.existsSync(exportRoute));
  assert.equal(fs.existsSync(path.join(ROOT, 'app/api/ai-widget/trace')), false);
});

check('Runtime and Contract v1.2 pins are exact', () => {
  assert.equal(AI_CORE_RUNTIME_SHA, '32afc91b3358c115ae03fc3d20db96fef5e0fbfe');
  assert.equal(AI_CORE_RUNTIME_VERSION, '1.3.0');
  assert.equal(AI_CORE_CONTRACT_SHA, '4d75773d60f3453279cbfcee1453f54b15b66567');
  assert.equal(CANONICALIZATION_VERSION, 'CANONICAL_JSON_HASH_V1');
});

process.stdout.write(`AI_TRACE_VIEWER_TESTS=${passed}/${passed}\n`);
