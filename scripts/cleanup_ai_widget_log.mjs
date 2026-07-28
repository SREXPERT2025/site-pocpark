import { chmodSync, existsSync } from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';
import Database from 'better-sqlite3';
import {
  cleanupExpiredAiWidgetLogs,
  runAiWidgetLogMigrations,
} from '../app/lib/ai-widget-log-core.ts';

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
nextEnv.loadEnvConfig(
  process.cwd(),
  process.env.NODE_ENV !== 'production',
);
if (process.env.AI_WIDGET_LOGGING_ENABLED !== 'true') {
  throw new Error('AI_WIDGET_LOGGING_ENABLED must be true.');
}
const databasePath = process.env.AI_WIDGET_LOG_DB_PATH?.trim();
if (!databasePath || !path.isAbsolute(databasePath)) {
  throw new Error('AI_WIDGET_LOG_DB_PATH must be an absolute path.');
}
if (!existsSync(databasePath)) {
  throw new Error('AI widget log database does not exist.');
}

const db = new Database(databasePath);
try {
  chmodSync(databasePath, 0o600);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  runAiWidgetLogMigrations(db);
  const result = cleanupExpiredAiWidgetLogs(db);
  const quickCheck = db.pragma('quick_check', { simple: true });
  if (quickCheck !== 'ok') {
    throw new Error(`AI widget log quick_check failed: ${quickCheck}`);
  }
  process.stdout.write(`${JSON.stringify({
    ...result,
    quickCheck,
  })}\n`);
} finally {
  db.close();
}
