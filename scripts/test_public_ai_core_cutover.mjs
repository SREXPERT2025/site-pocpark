import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_CONTRACT_VERSION,
  AI_CORE_RUNTIME_SHA,
  CANONICALIZATION_VERSION,
  acknowledgePublicAiCoreMutations,
  buildPublicAiCoreRequest,
  callPublicAiCoreRuntime,
  publicAiCoreRuntimeConfig,
} from '../app/lib/owner-ai-canary-adapter.ts';
import { mapSiteIdentity } from '../app/lib/owner-ai-canary-core.ts';
import {
  ensureOwnerCanaryThread,
  recordPublicAiCoreRouteTelemetry,
  registerOwnerCanaryMessage,
  runOwnerAiCanaryMigrations,
} from '../app/lib/owner-ai-canary-state.ts';
import { beginAiWidgetTurn, runAiWidgetLogMigrations } from
  '../app/lib/ai-widget-log-core.ts';
import {
  publicAiCoreEnabled,
  publicAiCoreFallbackReason,
  publicAiCoreRouteHeaders,
  PUBLIC_AI_CORE_CONTRACT_SHA,
  PUBLIC_AI_CORE_RUNTIME_SHA,
  requirePublicAiCoreReleasePins,
  selectAiCoreSiteAudience,
} from '../app/lib/public-ai-core.ts';
import { updatePublicAiCoreEnv } from './configure_public_ai_core_env.mjs';

const publicEnv = {
  AI_CORE_OWNER_CANARY_ENABLED: 'false',
  AI_CORE_PUBLIC_ENABLED: 'true',
  AI_CORE_PUBLIC_URL: 'https://gateway.example.ts.net',
  AI_CORE_PUBLIC_SECRET: 'public-gateway-secret-at-least-32-bytes',
  AI_CORE_PUBLIC_RUNTIME_SHA: AI_CORE_RUNTIME_SHA,
  AI_CORE_PUBLIC_CONTRACT_SHA: AI_CORE_CONTRACT_SHA,
  AI_CORE_PUBLIC_SITE_SHA: 'a'.repeat(40),
  AI_CORE_PUBLIC_GATEWAY_SHA: 'b'.repeat(40),
  AI_CORE_IDENTITY_HMAC_KEY: 'identity-key-at-least-32-bytes-long',
};

assert.equal(publicAiCoreEnabled({}), false);
assert.equal(PUBLIC_AI_CORE_RUNTIME_SHA, AI_CORE_RUNTIME_SHA);
assert.equal(PUBLIC_AI_CORE_CONTRACT_SHA, AI_CORE_CONTRACT_SHA);
assert.equal(publicAiCoreEnabled(publicEnv), true);
assert.equal(selectAiCoreSiteAudience({
  publicEnabled: false, ownerAudience: 'legacy',
}), 'legacy');
assert.equal(selectAiCoreSiteAudience({
  publicEnabled: true, ownerAudience: 'legacy',
}), 'public_ai_core');
assert.equal(selectAiCoreSiteAudience({
  publicEnabled: false, ownerAudience: 'owner_canary',
}), 'owner_canary');
assert.deepEqual(requirePublicAiCoreReleasePins(publicEnv), {
  siteRelease: 'a'.repeat(40), gatewayRelease: 'b'.repeat(40),
});
assert.equal(publicAiCoreRuntimeConfig(publicEnv).runtimeSha, AI_CORE_RUNTIME_SHA);

const identity = mapSiteIdentity({
  sessionId: '11111111-1111-4111-8111-111111111111',
  turnId: '22222222-2222-4222-8222-222222222222',
  env: publicEnv,
});
const state = {
  conversationThreadId: identity.conversationThreadId,
  stateVersion: 0,
  confirmedProjectFacts: [], candidateFacts: [], conflicts: [],
  activeQuestion: null, askedQuestions: [], conversationPreferences: {},
  lastMutationAcknowledgement: null,
};
const request = buildPublicAiCoreRequest({
  aiCoreRequestId: 'aicore_public_00000001',
  conversationThreadId: identity.conversationThreadId,
  messageId: identity.messageId,
  currentMessage: 'Сколько будет 2+2?',
  sourcePage: '/', state,
  siteRelease: publicEnv.AI_CORE_PUBLIC_SITE_SHA,
  gatewayRelease: publicEnv.AI_CORE_PUBLIC_GATEWAY_SHA,
  sentAt: '2026-08-08T12:00:00.000Z', dryRun: true,
});
assert.equal(request.payload.executor_policy.policy_id, 'policy:public_qwen_v1');

const probe = spawnSync(
  'python3', ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
  { input: JSON.stringify(request), encoding: 'utf8' },
);
assert.equal(probe.status, 0, probe.stderr);
const deterministicEnvelope = JSON.parse(probe.stdout);
assert.equal(deterministicEnvelope.response.success, true);
assert.equal(deterministicEnvelope.response.answer, '2+2 = 4.');

const accepted = await callPublicAiCoreRuntime(request, {
  env: publicEnv,
  fetchImpl: async () => new Response(
    JSON.stringify(deterministicEnvelope),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ),
});
assert.equal(accepted.runtime_sha, AI_CORE_RUNTIME_SHA);

await assert.rejects(
  callPublicAiCoreRuntime(request, {
    env: publicEnv,
    fetchImpl: async () => new Response(
      JSON.stringify({ success: false, code: 'RUNTIME_UNAVAILABLE' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    ),
  }),
  (error) => {
    assert.equal(error.message, 'AI_CORE_PUBLIC_UPSTREAM_ERROR');
    assert.equal(error.status, 503);
    assert.equal(publicAiCoreFallbackReason(error, false), 'AI_CORE_UPSTREAM_503');
    assert.equal(publicAiCoreFallbackReason(error, true), null);
    return true;
  },
);
assert.equal(
  publicAiCoreFallbackReason(new Error('AI_CORE_CONTRACT_RESPONSE_REJECTED'), false),
  null,
);
assert.equal(publicAiCoreFallbackReason(new TypeError('site bug'), false), null);
assert.equal(publicAiCoreFallbackReason('unknown thrown value', false), null);
await assert.rejects(
  callPublicAiCoreRuntime(request, {
    env: publicEnv,
    fetchImpl: async () => {
      throw new TypeError('deterministic network failure');
    },
  }),
  (error) => {
    assert.equal(error.message, 'AI_CORE_PUBLIC_TRANSPORT_UNAVAILABLE');
    assert.equal(
      publicAiCoreFallbackReason(error, false),
      'AI_CORE_TRANSPORT_UNAVAILABLE',
    );
    return true;
  },
);

const acknowledgement = {
  contract_version: AI_CORE_CONTRACT_VERSION,
  canonicalization_version: CANONICALIZATION_VERSION,
  request_id: request.request_id,
  response_id: deterministicEnvelope.response.response_id,
  acknowledged_at: '2026-08-08T12:00:01.000Z',
  acknowledgements: [],
};
assert.equal((await acknowledgePublicAiCoreMutations(acknowledgement, {
  env: publicEnv,
  fetchImpl: async () => new Response(JSON.stringify({
    accepted: true,
    runtime_sha: AI_CORE_RUNTIME_SHA,
    contract_sha: AI_CORE_CONTRACT_SHA,
    canonicalization_version: CANONICALIZATION_VERSION,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
})).accepted, true);

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runAiWidgetLogMigrations(db);
runOwnerAiCanaryMigrations(db);
ensureOwnerCanaryThread(db, {
  conversationThreadId: identity.conversationThreadId,
  siteSessionId: identity.siteSessionId,
});
registerOwnerCanaryMessage(db, {
  conversationThreadId: identity.conversationThreadId,
  messageId: identity.messageId,
  siteTurnId: identity.siteTurnId,
  requestPayload: { deterministic: true },
});
beginAiWidgetTurn(db, {
  turnId: identity.siteTurnId,
  sessionId: identity.siteSessionId,
  requestId: '33333333-3333-4333-8333-333333333333',
  sourcePage: '/', userContent: 'test', runtimeMode: 'production',
  nowMs: Date.UTC(2026, 7, 8, 12),
});
const telemetry = recordPublicAiCoreRouteTelemetry(db, {
  turnId: identity.siteTurnId,
  conversationThreadId: identity.conversationThreadId,
  messageId: identity.messageId,
  aiCoreRequestId: request.request_id,
  runtimeSha: AI_CORE_RUNTIME_SHA,
  contractSha: AI_CORE_CONTRACT_SHA,
  actualRoute: 'legacy',
  fallbackReason: 'AI_CORE_UPSTREAM_503',
  mutationStarted: false,
  createdAt: '2026-08-08T12:00:02.000Z',
});
assert.equal(telemetry.created, true);
const stored = db.prepare(`
  SELECT planned_route, actual_route, fallback_reason, mutation_started
  FROM ai_core_public_route_telemetry WHERE turn_id = ?
`).get(identity.siteTurnId);
assert.deepEqual(stored, {
  planned_route: 'ai_core', actual_route: 'legacy',
  fallback_reason: 'AI_CORE_UPSTREAM_503', mutation_started: 0,
});
assert.deepEqual(publicAiCoreRouteHeaders({
  actualRoute: 'legacy', fallbackReason: 'AI_CORE_UPSTREAM_503',
}), {
  'X-AI-Core-Planned-Route': 'ai_core',
  'X-AI-Core-Actual-Route': 'legacy',
  'X-AI-Core-Fallback-Reason': 'AI_CORE_UPSTREAM_503',
});

const enabledEnvText = Object.entries(publicEnv)
  .map(([key, value]) => `${key}=${value}`).join('\n');
const rolledBack = updatePublicAiCoreEnv(enabledEnvText, false);
assert.match(rolledBack, /AI_CORE_PUBLIC_ENABLED=false/);
assert.equal(selectAiCoreSiteAudience({
  publicEnabled: false, ownerAudience: 'legacy',
}), 'legacy');

const apiSource = readFileSync(
  new URL('../app/lib/ai-widget-api.ts', import.meta.url), 'utf8',
);
assert.ok(apiSource.indexOf("if (aiCoreAudience !== 'legacy'")
  < apiSource.indexOf('`${gateway.url}/v1/chat`'));
assert.match(apiSource, /publicFallbackContext/);
assert.match(apiSource, /recordPublicAiCoreRouteTelemetry/);
assert.match(apiSource, /aiCoreMutationStarted/);

console.log([
  'public ai core cutover tests: ok',
  'flag_off_legacy=pass',
  'flag_on_ai_core=pass',
  'transport_fallback=pass',
  'rollback_off=pass',
  'model_requests=0',
].join('; '));
