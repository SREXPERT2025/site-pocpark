import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import Database from 'better-sqlite3';
import {
  beginAiWidgetTurn,
  completeAiWidgetTurn,
  getAiWidgetSession,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';
import {
  LEGACY_CONVERSATION_MEMORY_VERSION,
  buildLegacyConversationMemory,
  getLegacyConversationMemory,
  legacyGatewayMemory,
  legacyRecentMessages,
  prepareLegacyConversationContext,
} from '../app/lib/ai-widget-legacy-memory-core.ts';
import {
  aiWidgetBrowserHistoryKey,
  clearAiWidgetBrowserHistory,
  readAiWidgetBrowserHistory,
  writeAiWidgetBrowserHistory,
} from '../app/components/ai-widget/ai-widget-conversation-storage.ts';

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runAiWidgetLogMigrations(db);

assert.deepEqual(
  db.prepare(`
    SELECT version, name
    FROM ai_widget_log_migrations
    ORDER BY version
  `).all().at(-1),
  { version: 5, name: 'legacy_conversation_memory_v1' },
);

const baseNow = Date.now();

function ids(prefix, index) {
  const serial = String(index).padStart(8, '0');
  return {
    turnId: `${prefix}-turn-${serial}`,
    requestId: `${prefix}-request-${serial}`,
  };
}

function addTurn(sessionId, index, userContent, assistantContent) {
  const identity = ids(sessionId, index);
  beginAiWidgetTurn(db, {
    ...identity,
    sessionId,
    sourcePage: '/',
    userContent,
    runtimeMode: 'production',
    nowMs: baseNow + index * 1_000,
  });
  completeAiWidgetTurn(db, {
    turnId: identity.turnId,
    assistantContent,
    route: 'qwen36',
    elapsedMs: 1_000,
    nowMs: baseNow + index * 1_000 + 500,
  });
}

const sessionA = 'legacy-memory-session-a-00000001';
addTurn(
  sessionA,
  1,
  'У нас бизнес-центр на 300 парковочных мест, два въезда и два выезда.',
  'Зафиксировал. Каким группам пользователей нужен доступ?',
);
addTurn(
  sessionA,
  2,
  'Есть сотрудники, арендаторы и гости. Хотим основной въезд по госномеру.',
  'Понял. Где должна происходить оплата?',
);
addTurn(
  sessionA,
  3,
  'Оплата нужна на выезде, интеграция с 1С обязательна.',
  'Принято. Система уже установлена или проектируется с нуля?',
);
for (let index = 4; index <= 20; index += 1) {
  addTurn(
    sessionA,
    index,
    `Дополнительная реплика ${index} без изменения параметров объекта.`,
    `Ответ ${index}.`,
  );
}
addTurn(
  sessionA,
  21,
  'Исправление: не 300, а 450 парковочных мест.',
  'Исправление принято.',
);
for (let index = 22; index <= 29; index += 1) {
  addTurn(
    sessionA,
    index,
    `Продолжение длинного диалога ${index}.`,
    `Ответ ${index}.`,
  );
}
addTurn(
  sessionA,
  30,
  'Какие данные об объекте вы уже знаете?',
  'Перечисляю подтверждённые данные.',
);

const detailsA = getAiWidgetSession(db, sessionA);
assert.ok(detailsA);
assert.equal(detailsA.turns.length, 30);

for (const count of [10, 20, 30]) {
  const memory = buildLegacyConversationMemory(
    sessionA,
    detailsA.turns.slice(0, count),
    baseNow + 40_000,
  );
  assert.equal(memory.sourceTurnCount, count);
  assert.equal(memory.version, LEGACY_CONVERSATION_MEMORY_VERSION);
}

const contextA = prepareLegacyConversationContext(
  db,
  sessionA,
  detailsA.turns,
  detailsA.expiresAtMs,
  baseNow + 40_000,
);
assert.equal(contextA.fullTranscript.length, 60);
assert.equal(contextA.recentMessages.length, 12);
assert.equal(
  contextA.recentMessages.some((message) => message.content.includes('300')),
  false,
  'The old fact must be outside the short recent window.',
);
assert.equal(contextA.gatewayMemory.confirmedFacts.object_type, 'бизнес-центр');
assert.equal(contextA.gatewayMemory.confirmedFacts.parking_capacity, 450);
assert.equal(contextA.gatewayMemory.confirmedFacts.entrances, 2);
assert.equal(contextA.gatewayMemory.confirmedFacts.exits, 2);
assert.equal(contextA.gatewayMemory.confirmedFacts['user_segment.employees'], true);
assert.equal(contextA.gatewayMemory.confirmedFacts['user_segment.tenants'], true);
assert.equal(contextA.gatewayMemory.confirmedFacts['user_segment.guests'], true);
assert.equal(contextA.gatewayMemory.confirmedFacts['identification.license_plate'], true);
assert.equal(contextA.gatewayMemory.confirmedFacts.payment, 'on_exit');
assert.equal(contextA.gatewayMemory.confirmedFacts['integration.1c'], true);
assert.equal(
  contextA.gatewayMemory.alreadyAskedQuestions.some(
    (item) => item.text.includes('Каким группам пользователей'),
  ),
  true,
  'Already-asked discovery questions remain available after 30 turns.',
);
assert.equal(contextA.memory.alreadyAskedQuestions.some(
  (item) => item.text.includes('Каким группам пользователей'),
), true);

const capacityHistory = contextA.memory.facts.filter(
  (fact) => fact.key === 'parking_capacity',
);
assert.equal(capacityHistory.length, 2);
assert.equal(capacityHistory[0].value, 300);
assert.equal(capacityHistory[0].status, 'superseded');
assert.equal(capacityHistory[0].supersededByTurnId, ids(sessionA, 21).turnId);
assert.equal(capacityHistory[1].value, 450);
assert.equal(capacityHistory[1].status, 'active');
assert.equal(capacityHistory[1].provenance, 'direct_user');

const persistedA = getLegacyConversationMemory(db, sessionA);
assert.equal(persistedA?.transcriptSha256, contextA.memory.transcriptSha256);
assert.equal(persistedA?.sourceTurnCount, 30);

const correctionSession = 'legacy-memory-correction-0000001';
addTurn(
  correctionSession,
  1,
  'Хотим въезд по картам, интеграция с 1С обязательна.',
  'Принято.',
);
addTurn(
  correctionSession,
  2,
  'Исправление: карты не хотим, интеграция с 1С больше не нужна.',
  'Исправление принято.',
);
const correction = getAiWidgetSession(db, correctionSession);
assert.ok(correction);
const correctedMemory = buildLegacyConversationMemory(
  correctionSession,
  correction.turns,
);
const correctedFacts = legacyGatewayMemory(correctedMemory).confirmedFacts;
assert.equal(correctedFacts['identification.card'], false);
assert.equal(correctedFacts['integration.1c'], false);
for (const key of ['identification.card', 'integration.1c']) {
  const history = correctedMemory.facts.filter((fact) => fact.key === key);
  assert.equal(history.length, 2);
  assert.equal(history[0]?.status, 'superseded');
  assert.equal(history[1]?.status, 'active');
}

const sessionB = 'legacy-memory-session-b-00000001';
addTurn(
  sessionB,
  1,
  'У нас складской комплекс на 80 парковочных мест и один въезд.',
  'Понял параметры второго объекта.',
);
const detailsB = getAiWidgetSession(db, sessionB);
assert.ok(detailsB);
const memoryB = buildLegacyConversationMemory(sessionB, detailsB.turns);
const gatewayB = legacyGatewayMemory(memoryB);
assert.equal(gatewayB.confirmedFacts.object_type, 'складской комплекс');
assert.equal(gatewayB.confirmedFacts.parking_capacity, 80);
assert.equal(gatewayB.confirmedFacts.entrances, 1);
assert.equal(JSON.stringify(gatewayB).includes('450'), false);
assert.equal(JSON.stringify(gatewayB).includes(sessionA), false);

const trafficSession = 'legacy-memory-traffic-000000001';
addTurn(
  trafficSession,
  1,
  'Бизнес-центр, 300 автомобилей в сутки.',
  'Принято.',
);
const traffic = getAiWidgetSession(db, trafficSession);
assert.ok(traffic);
const trafficFacts = legacyGatewayMemory(
  buildLegacyConversationMemory(trafficSession, traffic.turns),
).confirmedFacts;
assert.equal(trafficFacts.daily_traffic, 300);
assert.equal('parking_capacity' in trafficFacts, false);

const ambiguousSession = 'legacy-memory-ambiguous-0000001';
addTurn(
  ambiguousSession,
  1,
  'У нас бизнес-центр и примерно 300 автомобилей.',
  'Нужно уточнить, это вместимость или суточный трафик.',
);
const ambiguous = getAiWidgetSession(db, ambiguousSession);
assert.ok(ambiguous);
const ambiguousFacts = legacyGatewayMemory(
  buildLegacyConversationMemory(ambiguousSession, ambiguous.turns),
).confirmedFacts;
assert.equal('parking_capacity' in ambiguousFacts, false);
assert.equal('daily_traffic' in ambiguousFacts, false);

const recent = legacyRecentMessages(detailsA.turns);
assert.equal(recent.length, 12);
assert.equal(recent.at(-1)?.content, 'Перечисляю подтверждённые данные.');

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const storage = new MemoryStorage();
const browserMessages = [
  { id: 'greeting', role: 'assistant', content: 'Здравствуйте!' },
  { id: ids(sessionA, 30).turnId, role: 'user', content: 'Что вы знаете?' },
  { id: 'answer-0000000000001', role: 'assistant', content: 'Бизнес-центр на 450 мест.' },
];
writeAiWidgetBrowserHistory(storage, sessionA, browserMessages);
assert.deepEqual(readAiWidgetBrowserHistory(storage, sessionA), browserMessages);
assert.ok(storage.getItem(aiWidgetBrowserHistoryKey(sessionA)));
assert.deepEqual(readAiWidgetBrowserHistory(storage, sessionB), []);
clearAiWidgetBrowserHistory(storage, sessionA);
assert.deepEqual(readAiWidgetBrowserHistory(storage, sessionA), []);

const benchmarkRuns = 500;
const legacyStarted = performance.now();
for (let index = 0; index < benchmarkRuns; index += 1) {
  legacyRecentMessages(detailsA.turns);
}
const legacyMs = performance.now() - legacyStarted;
const candidateStarted = performance.now();
for (let index = 0; index < benchmarkRuns; index += 1) {
  buildLegacyConversationMemory(sessionA, detailsA.turns, baseNow);
}
const candidateMs = performance.now() - candidateStarted;
const candidatePerTurnMs = candidateMs / benchmarkRuns;
assert.ok(candidatePerTurnMs < 10, `Memory build too slow: ${candidatePerTurnMs}ms`);

console.log(JSON.stringify({
  status: 'PASS',
  scenarios: {
    messages_10: 'PASS',
    messages_20: 'PASS',
    messages_30: 'PASS',
    browser_reload: 'PASS',
    long_sales_dialogue: 'PASS',
    correction_supersede: 'PASS',
    boolean_correction_supersede: 'PASS',
    repeated_known_data_context: 'PASS',
    isolation_a_to_b: 'PASS',
    capacity_vs_daily_traffic: 'PASS',
    ambiguous_bare_count: 'PASS',
  },
  latency: {
    recent_window_500_runs_ms: Number(legacyMs.toFixed(3)),
    memory_build_500_runs_ms: Number(candidateMs.toFixed(3)),
    memory_build_per_30_turn_dialogue_ms: Number(candidatePerTurnMs.toFixed(4)),
  },
}, null, 2));
