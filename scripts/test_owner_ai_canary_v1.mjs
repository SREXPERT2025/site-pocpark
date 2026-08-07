import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  buildOwnerCanaryCoreRequest,
  decisionPackageHash,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  clearOwnerCanaryCookieHeader,
  issueOwnerCanarySession,
  mapSiteIdentity,
  OWNER_AI_CANARY_COOKIE,
  ownerCanaryCookieHeader,
  ownerCanaryPlaceholderDecision,
  selectOwnerCanaryAudience,
  verifyOwnerCanarySession,
} from '../app/lib/owner-ai-canary-core.ts';
import {
  applyOwnerCanaryMutation,
  ensureOwnerCanaryThread,
  ownerCanarySessionRevoked,
  recordOwnerCanaryTelemetry,
  registerOwnerCanaryMessage,
  revokeOwnerCanarySession,
  runOwnerAiCanaryMigrations,
} from '../app/lib/owner-ai-canary-state.ts';
import {
  beginAiWidgetTurn,
  completeAiWidgetTurn,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';
import {
  listAiWidgetServerEvents,
  recordAiWidgetServerEvent,
} from '../app/lib/ai-widget-server-events-core.ts';

const credential = 'owner-credential-that-is-at-least-32-bytes';
const env = {
  AI_CORE_OWNER_CANARY_ENABLED: 'true',
  AI_CORE_OWNER_CANARY_CREDENTIAL: credential,
  AI_CORE_OWNER_CANARY_COOKIE_KEY:
    'cookie-signing-key-that-is-at-least-32-bytes',
  AI_CORE_OWNER_CANARY_SESSION_VERSION: 'v1',
  AI_CORE_IDENTITY_HMAC_KEY:
    'identity-mapping-key-that-is-at-least-32-bytes',
};
const nowMs = Date.UTC(2026, 7, 7, 12, 0, 0);

const issued = issueOwnerCanarySession({
  credential,
  env,
  nowMs,
  ttlSeconds: 600,
  idFactory: () => '11111111-1111-4111-8111-111111111111',
});
assert.ok(verifyOwnerCanarySession({ token: issued.token, env, nowMs }));
assert.throws(
  () => issueOwnerCanarySession({ credential: 'wrong', env, nowMs }),
  /OWNER_CANARY_AUTH_DENIED/,
);
assert.equal(
  verifyOwnerCanarySession({
    token: `${issued.token.slice(0, -1)}x`,
    env,
    nowMs,
  }),
  null,
);
assert.equal(
  verifyOwnerCanarySession({
    token: issued.token,
    env,
    nowMs: nowMs + 601_000,
  }),
  null,
);
const cookie = ownerCanaryCookieHeader(issued.token, issued.ttlSeconds);
assert.match(cookie, new RegExp(`^${OWNER_AI_CANARY_COOKIE}=`));
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /Secure/);
assert.match(cookie, /SameSite=Strict/);
assert.match(clearOwnerCanaryCookieHeader(), /Max-Age=0/);
assert.doesNotMatch(cookie, new RegExp(credential));

assert.equal(
  selectOwnerCanaryAudience({
    cookieToken: issued.token,
    env: { ...env, AI_CORE_OWNER_CANARY_ENABLED: 'false' },
    nowMs,
  }).audience,
  'legacy',
);
assert.equal(
  selectOwnerCanaryAudience({ cookieToken: null, env, nowMs }).audience,
  'legacy',
);
assert.equal(
  selectOwnerCanaryAudience({ cookieToken: issued.token, env, nowMs })
    .audience,
  'owner_canary',
);
assert.deepEqual(ownerCanaryPlaceholderDecision(), {
  route: 'owner_ai_core_placeholder',
  runtimeConnected: false,
  fallbackToLegacyAllowed: false,
  errorCode: 'OWNER_AI_CORE_NOT_CONNECTED',
});

const first = mapSiteIdentity({
  sessionId: 'c846e840-abcc-40b4-bd26-c0fdec276da9',
  turnId: '11111111-aaaa-4111-8111-111111111111',
  env,
});
const repeated = mapSiteIdentity({
  sessionId: 'c846e840-abcc-40b4-bd26-c0fdec276da9',
  turnId: '11111111-aaaa-4111-8111-111111111111',
  env,
});
const next = mapSiteIdentity({
  sessionId: 'c846e840-abcc-40b4-bd26-c0fdec276da9',
  turnId: '22222222-bbbb-4222-8222-222222222222',
  env,
});
assert.deepEqual(first, repeated);
assert.equal(first.conversationThreadId, next.conversationThreadId);
assert.notEqual(first.messageId, next.messageId);
assert.doesNotMatch(first.conversationThreadId, /c846e840/);

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runAiWidgetLogMigrations(db);
runOwnerAiCanaryMigrations(db);
let state = ensureOwnerCanaryThread(db, {
  conversationThreadId: first.conversationThreadId,
  siteSessionId: first.siteSessionId,
  nowMs,
});
assert.equal(state.stateVersion, 0);
const requestPayload = { currentMessage: 'Два въезда', noPii: true };
assert.equal(registerOwnerCanaryMessage(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  siteTurnId: first.siteTurnId,
  requestPayload,
  nowMs,
}).created, true);
assert.equal(registerOwnerCanaryMessage(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  siteTurnId: first.siteTurnId,
  requestPayload,
  nowMs,
}).created, false);
assert.throws(() => registerOwnerCanaryMessage(db, {
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  siteTurnId: first.siteTurnId,
  requestPayload: { currentMessage: 'conflict' },
  nowMs,
}), /IDEMPOTENCY_CONFLICT/);

const mutation = {
  mutationId: '33333333-cccc-4333-8333-333333333333',
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  expectedStateVersion: 0,
  decisionPackageHash: 'a'.repeat(64),
  patch: {
    candidateFacts: [{ field: 'entrances_count', value: 2 }],
    activeQuestion: { field: 'exits_count' },
    conversationPreferences: { oneQuestionAtATime: true },
  },
};
const ack = applyOwnerCanaryMutation(db, mutation, nowMs + 1_000);
assert.equal(ack.status, 'applied');
assert.equal(ack.stateVersionAfter, 1);
assert.deepEqual(
  applyOwnerCanaryMutation(db, mutation, nowMs + 2_000),
  ack,
);
const conflictAck = applyOwnerCanaryMutation(db, {
  ...mutation,
  mutationId: '44444444-dddd-4444-8444-444444444444',
  expectedStateVersion: 0,
}, nowMs + 3_000);
assert.equal(conflictAck.status, 'rejected');
assert.equal(conflictAck.reason, 'STATE_VERSION_CONFLICT');
assert.equal(conflictAck.stateVersionAfter, 1);

state = ensureOwnerCanaryThread(db, {
  conversationThreadId: first.conversationThreadId,
  siteSessionId: first.siteSessionId,
  nowMs: nowMs + 4_000,
});
const coreRequest = buildOwnerCanaryCoreRequest({
  aiCoreRequestId: 'aicore_77777777-aaaa-4777-8777-777777777777',
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  currentMessage: 'Два въезда',
  sourcePage: '/parkovka',
  pageContextIntentHint: { selectedProblem: 'Убрать ручные пропуска' },
  state,
});
assert.equal(coreRequest.dryRun, true);
assert.equal(coreRequest.pageContextIntentHint.selectedProblem,
  'Убрать ручные пропуска');
assert.deepEqual(coreRequest.state.confirmedProjectFacts, []);
const decisionPackage = { route: 'clarify', visibleText: 'Уточните выезды' };
const validatedResponse = validateOwnerCanaryCoreResponse({
  contractVersion: coreRequest.contractVersion,
  aiCoreRequestId: coreRequest.aiCoreRequestId,
  decisionPackage,
  decisionPackageHash: decisionPackageHash(decisionPackage),
  mutationProposal: null,
});
assert.equal(validatedResponse.decisionPackage.route, 'clarify');
assert.throws(() => validateOwnerCanaryCoreResponse({
  contractVersion: coreRequest.contractVersion,
  aiCoreRequestId: coreRequest.aiCoreRequestId,
  decisionPackage,
  decisionPackageHash: '0'.repeat(64),
  mutationProposal: null,
}), /DECISION_PACKAGE_HASH_MISMATCH/);

revokeOwnerCanarySession(db, {
  jti: issued.payload.jti,
  expiresAtMs: issued.payload.exp * 1000,
  nowMs,
});
assert.equal(ownerCanarySessionRevoked(db, issued.payload.jti), true);
assert.equal(verifyOwnerCanarySession({
  token: issued.token,
  env,
  nowMs,
  isRevoked: (jti) => ownerCanarySessionRevoked(db, jti),
}), null);

const siteSessionId = '55555555-eeee-4555-8555-555555555555';
const siteTurnId = '66666666-ffff-4666-8666-666666666666';
beginAiWidgetTurn(db, {
  turnId: siteTurnId,
  sessionId: siteSessionId,
  requestId: '77777777-aaaa-4777-8777-777777777777',
  sourcePage: '/stati/test',
  userContent: 'Тест lifecycle',
  runtimeMode: 'production',
  nowMs,
});
recordAiWidgetServerEvent(db, {
  turnId: siteTurnId,
  eventName: 'turn_accepted',
  nowMs,
  idFactory: () => '88888888-bbbb-4888-8888-888888888888',
});
completeAiWidgetTurn(db, {
  turnId: siteTurnId,
  assistantContent: 'Ответ',
  route: 'legacy_fixture',
  elapsedMs: 10,
  nowMs: nowMs + 10,
});
recordAiWidgetServerEvent(db, {
  turnId: siteTurnId,
  eventName: 'answer_completed',
  route: 'legacy_fixture',
  elapsedMs: 10,
  nowMs: nowMs + 10,
  idFactory: () => '99999999-cccc-4999-8999-999999999999',
});
const telemetry = {
  turnId: siteTurnId,
  conversationThreadId: first.conversationThreadId,
  messageId: first.messageId,
  aiCoreRequestId: 'aicore_77777777-aaaa-4777-8777-777777777777',
  contractVersion: coreRequest.contractVersion,
  runtimeSha: 'a9066e'.padEnd(40, '0'),
  decisionPackageHash: decisionPackageHash(decisionPackage),
  plannedExecutor: 'not_connected',
  finalExecutor: 'not_connected',
  evaluationStatus: 'not_run',
  repairStatus: 'not_run',
  stateVersionBefore: 0,
  stateVersionAfter: 1,
  latencyMs: 10,
  siteTerminalEventId: '99999999-cccc-4999-8999-999999999999',
  createdAt: new Date(nowMs + 10).toISOString(),
};
assert.equal(recordOwnerCanaryTelemetry(db, telemetry).created, true);
assert.equal(recordOwnerCanaryTelemetry(db, telemetry).created, false);
assert.throws(() => recordOwnerCanaryTelemetry(db, {
  ...telemetry,
  latencyMs: 11,
}), /TELEMETRY_IDEMPOTENCY_CONFLICT/);
assert.deepEqual(
  listAiWidgetServerEvents(db, siteTurnId).map((item) => item.eventName),
  ['turn_accepted', 'answer_completed'],
);

const clientSource = readFileSync(
  new URL('../app/components/ai-widget/AiWidgetPilot.tsx', import.meta.url),
  'utf8',
);
assert.doesNotMatch(clientSource, /AI Core Owner Test/);
const apiSource = readFileSync(
  new URL('../app/lib/ai-widget-api.ts', import.meta.url),
  'utf8',
);
const coreSource = readFileSync(
  new URL('../app/lib/owner-ai-canary-core.ts', import.meta.url),
  'utf8',
);
assert.match(`${apiSource}${coreSource}`, /OWNER_AI_CORE_NOT_CONNECTED/);
assert.match(apiSource, /OWNER_CANARY_TURN_ALREADY_FINALIZED/);
const loginSource = readFileSync(
  new URL(
    '../app/api/ai-widget/owner-canary/login/route.ts',
    import.meta.url,
  ),
  'utf8',
);
const logoutSource = readFileSync(
  new URL(
    '../app/api/ai-widget/owner-canary/logout/route.ts',
    import.meta.url,
  ),
  'utf8',
);
assert.match(loginSource, /sameOrigin/);
assert.match(logoutSource, /LOGOUT_REVOCATION_FAILED/);
assert.doesNotMatch(`${loginSource}${logoutSource}`, new RegExp(credential));
const serializedEvidence = JSON.stringify({
  cookie,
  first,
  ack,
  placeholder: ownerCanaryPlaceholderDecision(),
});
assert.doesNotMatch(serializedEvidence, new RegExp(credential));

console.log('owner ai canary v1 tests: ok');
