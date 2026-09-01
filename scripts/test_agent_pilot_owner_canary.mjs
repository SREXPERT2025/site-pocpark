import assert from 'node:assert/strict';
import {
  AGENT_PILOT_RUNTIME_SHA,
  AgentPilotOwnerError,
  agentPilotOwnerCanaryEnabled,
  callAgentPilotOwnerCanary,
} from '../app/lib/agent-pilot-owner-canary.ts';
import {
  issueOwnerCanarySession,
  selectOwnerCanaryAudience,
} from '../app/lib/owner-ai-canary-core.ts';

const secret = 'agent-pilot-owner-secret-at-least-32-bytes';
const env = {
  AGENT_PILOT_OWNER_CANARY_ENABLED: 'true',
  AGENT_PILOT_OWNER_CANARY_URL: 'https://pilot.example.test/agent-pilot/',
  AGENT_PILOT_OWNER_CANARY_SECRET: secret,
  AGENT_PILOT_OWNER_CANARY_RUNTIME_SHA: AGENT_PILOT_RUNTIME_SHA,
  AI_CORE_OWNER_CANARY_ENABLED: 'false',
  AI_CORE_OWNER_CANARY_CREDENTIAL:
    'agent-pilot-owner-credential-at-least-32-bytes',
  AI_CORE_OWNER_CANARY_COOKIE_KEY:
    'agent-pilot-owner-cookie-key-at-least-32-bytes',
  AI_CORE_OWNER_CANARY_SESSION_VERSION: 'v1',
};

assert.equal(agentPilotOwnerCanaryEnabled(env), true);
const session = issueOwnerCanarySession({
  credential: env.AI_CORE_OWNER_CANARY_CREDENTIAL,
  env,
  nowMs: Date.UTC(2026, 7, 31, 12, 0, 0),
  idFactory: () => 'agent-pilot-owner-session-0001',
});
assert.equal(selectOwnerCanaryAudience({
  cookieToken: session.token,
  env,
  nowMs: Date.UTC(2026, 7, 31, 12, 0, 1),
}).audience, 'owner_canary');

let requestedUrl = '';
let requestedAuthorization = '';
const successful = await callAgentPilotOwnerCanary({
  conversationId: 'cth_v1_12345678901234567890',
  turnId: 'msg_v1_12345678901234567890',
  message: 'Какая длина стрелы FSP?',
  requestId: 'request-agent-pilot-0001',
  env,
  fetchImpl: async (url, init) => {
    requestedUrl = String(url);
    requestedAuthorization = new Headers(init?.headers).get('authorization') ?? '';
    return Response.json({
      success: true,
      fallback: false,
      answer: 'Для FSP предусмотрена стрела 3 м.',
      runtime_sha: AGENT_PILOT_RUNTIME_SHA,
      latency_ms: 1234,
      role_calls: [{ role: 'orchestrator', latency_ms: 1000 }],
      critic_used: true,
      reconsideration_used: false,
      selected_evidence: [{ source_id: 'barrier-models' }],
      trace_id: 'apt_12345678901234567890',
      bridge_version: 'AGENT_PILOT_OWNER_CANARY_BRIDGE_V1',
      trace: {
        trace_id: 'apt_12345678901234567890',
        turn_id: 'msg_v1_12345678901234567890',
        runtime_sha: AGENT_PILOT_RUNTIME_SHA,
        role_calls: [{ role: 'orchestrator', latency_ms: 1000 }],
        selected_evidence: [{ source_id: 'barrier-models' }],
      },
    });
  },
});
assert.equal(successful.runtimeSha, AGENT_PILOT_RUNTIME_SHA);
assert.equal(successful.answer, 'Для FSP предусмотрена стрела 3 м.');
assert.equal(successful.trace.turn_id, 'msg_v1_12345678901234567890');
assert.equal(requestedAuthorization, `Bearer ${secret}`);
assert.equal(
  requestedUrl,
  'https://pilot.example.test/agent-pilot/v1/chat',
);

await assert.rejects(
  () => callAgentPilotOwnerCanary({
    conversationId: 'cth_v1_12345678901234567890',
    turnId: 'msg_v1_12345678901234567890',
    message: 'test',
    requestId: 'request-agent-pilot-0002',
    env: { ...env, AGENT_PILOT_OWNER_CANARY_ENABLED: 'false' },
  }),
  (error) => error instanceof AgentPilotOwnerError
    && error.reasonCode === 'AGENT_PILOT_DISABLED',
);

for (const [body, reason] of [
  [{
    success: true, fallback: false, answer: 'wrong pin',
    runtime_sha: '0'.repeat(40), latency_ms: 1, role_calls: [],
    critic_used: true, reconsideration_used: false,
    selected_evidence: [], trace_id: 'apt_wrong_runtime_0001',
  }, 'AGENT_PILOT_RUNTIME_MISMATCH'],
  [{
    success: true, fallback: true, answer: 'internal fallback',
    runtime_sha: AGENT_PILOT_RUNTIME_SHA, latency_ms: 1, role_calls: [],
    critic_used: true, reconsideration_used: false,
    selected_evidence: [], trace_id: 'apt_internal_fallback_0001',
  }, 'AGENT_PILOT_RESPONSE_INVALID'],
]) {
  await assert.rejects(
    () => callAgentPilotOwnerCanary({
      conversationId: 'cth_v1_12345678901234567890',
      turnId: 'msg_v1_12345678901234567890',
      message: 'test',
      requestId: 'request-agent-pilot-0003',
      env,
      fetchImpl: async () => Response.json(body),
    }),
    (error) => error instanceof AgentPilotOwnerError
      && error.reasonCode === reason,
  );
}

await assert.rejects(
  () => callAgentPilotOwnerCanary({
    conversationId: 'cth_v1_12345678901234567890',
    turnId: 'msg_v1_12345678901234567890',
    message: 'test',
    requestId: 'request-agent-pilot-0004',
    env,
    fetchImpl: async () => Response.json(
      { success: false, code: 'RUNTIME_UNAVAILABLE' },
      { status: 503 },
    ),
  }),
  (error) => error instanceof AgentPilotOwnerError
    && error.reasonCode === 'AGENT_PILOT_UPSTREAM_ERROR',
);

console.log('Agent Pilot owner canary adapter: PASS');
