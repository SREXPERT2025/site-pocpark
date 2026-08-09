import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  beginAiWidgetTurn,
  completeAiWidgetTurn,
  failAiWidgetTurn,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';
import {
  listAiWidgetServerEvents,
  recordAiWidgetServerEvent,
  tryRecordAiWidgetServerEvent,
} from '../app/lib/ai-widget-server-events-core.ts';

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
    { version: 3, name: 'server_confirmed_foundation_events' },
    { version: 4, name: 'server_event_ai_core_correlation_v1' },
  ],
);

const base = Date.now();
const answeredTurn = 'turn-foundation-event-answered-0001';
beginAiWidgetTurn(db, {
  turnId: answeredTurn,
  sessionId: 'session-foundation-event-000001',
  requestId: 'request-foundation-event-000001',
  sourcePage: '/parkovka',
  userContent: 'Тестовый вопрос',
  runtimeMode: 'production',
  nowMs: base,
});
const accepted = recordAiWidgetServerEvent(db, {
  turnId: answeredTurn,
  eventName: 'turn_accepted',
  nowMs: base,
  idFactory: () => 'event-foundation-accepted-00001',
});
assert.equal(accepted.created, true);
assert.equal(accepted.sourcePage, '/parkovka');

const acceptedRetry = recordAiWidgetServerEvent(db, {
  turnId: answeredTurn,
  eventName: 'turn_accepted',
  nowMs: base,
});
assert.equal(acceptedRetry.created, false);

completeAiWidgetTurn(db, {
  turnId: answeredTurn,
  assistantContent: 'Тестовый ответ',
  route: 'qwen36',
  elapsedMs: 1200,
  nowMs: base + 1200,
});
recordAiWidgetServerEvent(db, {
  turnId: answeredTurn,
  eventName: 'answer_completed',
  route: 'qwen36',
  elapsedMs: 1200,
  nowMs: base + 1200,
  idFactory: () => 'event-foundation-completed-0001',
});
assert.deepEqual(
  listAiWidgetServerEvents(db, answeredTurn).map((event) => event.eventName),
  ['turn_accepted', 'answer_completed'],
);

assert.throws(
  () => recordAiWidgetServerEvent(db, {
    turnId: answeredTurn,
    eventName: 'answer_completed',
    route: 'different-route',
    elapsedMs: 1200,
  }),
  /EVENT_IDEMPOTENCY_CONFLICT/,
);
assert.throws(
  () => recordAiWidgetServerEvent(db, {
    turnId: answeredTurn,
    eventName: 'answer_error',
    errorCode: 'LATE_ERROR',
  }),
  /EVENT_TURN_NOT_FAILED/,
);

const failedTurn = 'turn-foundation-event-failed-000001';
beginAiWidgetTurn(db, {
  turnId: failedTurn,
  sessionId: 'session-foundation-event-000002',
  requestId: 'request-foundation-event-000002',
  sourcePage: '/parkovka-pod-klyuch',
  userContent: 'Второй тестовый вопрос',
  runtimeMode: 'production',
  nowMs: base + 2000,
});
recordAiWidgetServerEvent(db, {
  turnId: failedTurn,
  eventName: 'turn_accepted',
  nowMs: base + 2000,
});
failAiWidgetTurn(db, {
  turnId: failedTurn,
  errorCode: 'GATEWAY_TIMEOUT',
  elapsedMs: 90_000,
  nowMs: base + 92_000,
});
recordAiWidgetServerEvent(db, {
  turnId: failedTurn,
  eventName: 'answer_error',
  errorCode: 'GATEWAY_TIMEOUT',
  elapsedMs: 90_000,
  conversationThreadId: 'thread-correlation-000000000001',
  messageId: 'message-correlation-00000000001',
  aiCoreRequestId: 'aicore-correlation-000000000001',
  runtimeTelemetryRef: 'owner-pre-gate:turn-foundation-event-failed-000001',
  nowMs: base + 92_000,
});
assert.deepEqual(
  listAiWidgetServerEvents(db, failedTurn).map((event) => event.eventName),
  ['turn_accepted', 'answer_error'],
);
const correlatedError = listAiWidgetServerEvents(db, failedTurn).at(-1);
assert.equal(
  correlatedError.conversationThreadId,
  'thread-correlation-000000000001',
);
assert.equal(
  correlatedError.runtimeTelemetryRef,
  'owner-pre-gate:turn-foundation-event-failed-000001',
);

const eventColumns = db.prepare(`
  SELECT name
  FROM pragma_table_info('ai_widget_server_events')
  ORDER BY cid
`).all().map((row) => row.name);
for (const forbidden of [
  'user_content',
  'assistant_content',
  'name',
  'contact',
  'email',
  'phone',
]) {
  assert.equal(eventColumns.includes(forbidden), false);
}

assert.equal(tryRecordAiWidgetServerEvent({
  enabled: false,
  database: () => {
    throw new Error('DATABASE_MUST_NOT_OPEN');
  },
  event: {
    turnId: answeredTurn,
    eventName: 'turn_accepted',
  },
}), false);
assert.equal(tryRecordAiWidgetServerEvent({
  enabled: true,
  database: () => {
    throw new Error('SIMULATED_EVENT_WRITER_FAILURE');
  },
  event: {
    turnId: answeredTurn,
    eventName: 'turn_accepted',
  },
}), false);

db.close();

const migrationDirectory = mkdtempSync(
  path.join(tmpdir(), 'rospark-server-events-migration-'),
);
const migrationDatabasePath = path.join(migrationDirectory, 'dialogues.sqlite');
const migrationBackupPath = path.join(migrationDirectory, 'dialogues.backup.sqlite');
try {
  const legacyDb = new Database(migrationDatabasePath);
  legacyDb.pragma('foreign_keys = ON');
  runAiWidgetLogMigrations(legacyDb);
  legacyDb.exec(`
    DROP TABLE ai_widget_server_events;
    DELETE FROM ai_widget_log_migrations WHERE version IN (3, 4);
  `);
  legacyDb.close();
  copyFileSync(migrationDatabasePath, migrationBackupPath);

  const upgradedDb = new Database(migrationDatabasePath);
  upgradedDb.pragma('foreign_keys = ON');
  runAiWidgetLogMigrations(upgradedDb);
  assert.equal(
    upgradedDb.prepare(`
      SELECT COUNT(*) AS count
      FROM ai_widget_log_migrations
      WHERE version = 4
    `).get().count,
    1,
  );
  upgradedDb.close();

  copyFileSync(migrationBackupPath, migrationDatabasePath);
  const rolledBackDb = new Database(migrationDatabasePath, {
    readonly: true,
  });
  assert.equal(
    rolledBackDb.prepare(`
      SELECT COUNT(*) AS count
      FROM ai_widget_log_migrations
      WHERE version = 4
    `).get().count,
    0,
  );
  assert.equal(
    rolledBackDb.prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'ai_widget_server_events'
    `).get().count,
    0,
  );
  rolledBackDb.close();
} finally {
  rmSync(migrationDirectory, { recursive: true, force: true });
}

console.log('AI widget server event checks: OK');
