import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  AI_WIDGET_TEST_TRANSCRIPT_RETENTION_MS,
  beginAiWidgetTurn,
  buildAiWidgetTurnsCsv,
  cleanupExpiredAiWidgetLogs,
  completeAiWidgetTurn,
  consumeAiWidgetRateLimit,
  getAiWidgetSession,
  listAiWidgetSessions,
  registerAiWidgetProductionLead,
  registerAiWidgetTestLead,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runAiWidgetLogMigrations(db);

assert.deepEqual(
  db.prepare(`
    SELECT version, name
    FROM ai_widget_log_migrations
    ORDER BY version
  `).all(),
  [
    { version: 1, name: 'test_transcript_foundation' },
    { version: 2, name: 'production_runtime_and_lead_links' },
  ],
);

const nowMs = Date.UTC(2026, 6, 28, 9, 0, 0);
const sessionId = 'session-20260728-test-0001';
const turnId = 'turn-20260728-test-0000001';
const requestId = 'request-20260728-test-0001';

const pending = beginAiWidgetTurn(db, {
  turnId,
  sessionId,
  requestId,
  sourcePage: '/demo',
  userContent: 'Как работает гостевой доступ?',
  nowMs,
});
assert.equal(pending.status, 'pending');

const answer = completeAiWidgetTurn(db, {
  turnId,
  assistantContent: 'Арендатор создаёт гостевую заявку.',
  route: 'faq',
  templateId: 'FAQ-001',
  elapsedMs: 850,
  nowMs: nowMs + 850,
});
assert.equal(answer.status, 'answered');
assert.equal(answer.elapsedMs, 850);

const retry = beginAiWidgetTurn(db, {
  turnId,
  sessionId,
  requestId: 'request-20260728-test-retry',
  sourcePage: '/demo',
  userContent: 'Как работает гостевой доступ?',
  nowMs: nowMs + 1_000,
});
assert.equal(retry.status, 'answered');
assert.equal(
  db.prepare('SELECT COUNT(*) AS count FROM ai_widget_turns').get().count,
  1,
);

assert.throws(
  () => registerAiWidgetTestLead(db, {
    sessionId,
    submissionId: 'submission-20260728-test-0001',
    sourcePage: '/demo',
    name: 'Тест Андрей',
    contact: '+7 000 000-00-01',
    objectDescription: 'Тестовый бизнес-центр',
    taskDescription: 'Проверить гостевой доступ',
    consent: false,
    consentVersion: 'ai-widget-test-synthetic-v1',
    nowMs,
  }),
  /TEST_CONSENT_REQUIRED/,
);

const lead = registerAiWidgetTestLead(db, {
  sessionId,
  submissionId: 'submission-20260728-test-0001',
  sourcePage: '/demo',
  name: 'Тест Андрей',
  contact: '+7 000 000-00-01',
  objectDescription: 'Тестовый бизнес-центр',
  taskDescription: 'Проверить гостевой доступ',
  consent: true,
  consentVersion: 'ai-widget-test-synthetic-v1',
  nowMs: nowMs + 2_000,
  idFactory: () => 'a89a0364-0000-4000-8000-000000000001',
});
assert.equal(lead.created, true);
assert.equal(lead.publicId, 'TEST-WGT-A89A0364');
assert.match(lead.maxPreview, /^ТЕСТ — AI-ВИДЖЕТ РОСПАРК/m);
assert.match(lead.maxPreview, /Не является реальным обращением клиента/);

const session = getAiWidgetSession(db, sessionId);
assert.equal(session.turns.length, 1);
assert.equal(session.testLeads.length, 1);
assert.equal(session.productionLeads.length, 0);
assert.equal(session.mode, 'preview');

const productionSessionId = 'session-20260728-production-0001';
const productionTurnId = 'turn-20260728-production-00001';
beginAiWidgetTurn(db, {
  turnId: productionTurnId,
  sessionId: productionSessionId,
  requestId: 'request-20260728-production-01',
  sourcePage: '/resheniya/biznes-centry',
  userContent: 'Нужен доступ для сотрудников.',
  runtimeMode: 'production',
  nowMs: nowMs + 3_000,
});
completeAiWidgetTurn(db, {
  turnId: productionTurnId,
  assistantContent: 'Можно использовать распознавание номеров и расписание.',
  route: 'faq',
  elapsedMs: 500,
  nowMs: nowMs + 3_500,
});
const productionLead = registerAiWidgetProductionLead(db, {
  sessionId: productionSessionId,
  submissionId: 'submission-20260728-production-01',
  sourcePage: '/resheniya/biznes-centry',
  registryLeadId: 'a89a0364000040008000000000000002',
  publicId: 'RSP-A89A0364',
  nowMs: nowMs + 4_000,
  idFactory: () => 'a89a0364-0000-4000-8000-000000000003',
});
assert.equal(productionLead.created, true);

const productionSession = getAiWidgetSession(db, productionSessionId);
assert.equal(productionSession.mode, 'production');
assert.equal(productionSession.productionLeads.length, 1);
assert.equal(productionSession.testLeads.length, 0);

const list = listAiWidgetSessions(db);
assert.equal(list.total, 2);
assert.equal(
  list.items.find((item) => item.id === sessionId).testLeadCount,
  1,
);
assert.equal(
  list.items.find((item) => item.id === productionSessionId)
    .productionLeadCount,
  1,
);

const csv = buildAiWidgetTurnsCsv([session]);
assert.match(csv, /Как работает гостевой доступ/);
assert.match(csv, /Арендатор создаёт гостевую заявку/);

const rateKey = 'a'.repeat(64);
assert.equal(consumeAiWidgetRateLimit(db, {
  scope: 'chat',
  keyHash: rateKey,
  windowMs: 60_000,
  limit: 2,
  nowMs,
}).allowed, true);
assert.equal(consumeAiWidgetRateLimit(db, {
  scope: 'chat',
  keyHash: rateKey,
  windowMs: 60_000,
  limit: 2,
  nowMs: nowMs + 1_000,
}).allowed, true);
assert.equal(consumeAiWidgetRateLimit(db, {
  scope: 'chat',
  keyHash: rateKey,
  windowMs: 60_000,
  limit: 2,
  nowMs: nowMs + 2_000,
}).allowed, false);

const cleanup = cleanupExpiredAiWidgetLogs(
  db,
  nowMs + AI_WIDGET_TEST_TRANSCRIPT_RETENTION_MS + 10_000,
);
assert.equal(cleanup.expiredTurns, 2);
assert.equal(cleanup.expiredTestLeads, 1);
assert.equal(cleanup.expiredProductionLeads, 1);
assert.equal(cleanup.expiredSessions, 2);

db.close();
console.log('AI widget transcript log checks: OK');
