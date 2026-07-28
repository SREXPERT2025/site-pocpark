import 'server-only';

import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  cleanupExpiredAiWidgetLogs,
  runAiWidgetLogMigrations,
} from './ai-widget-log-core';

export const PRODUCTION_AI_WIDGET_LOG_PATH =
  '/var/lib/rospark-ai-widget/dialogs.sqlite';

declare global {
  // eslint-disable-next-line no-var
  var __rosparkAiWidgetLogDb: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __rosparkAiWidgetLogDbPath: string | undefined;
}

export function aiWidgetLoggingEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.AI_WIDGET_LOGGING_ENABLED === 'true';
}

export function aiWidgetLogDatabasePath(
  env: NodeJS.ProcessEnv = process.env,
) {
  const configured = env.AI_WIDGET_LOG_DB_PATH?.trim();
  if (configured) return path.resolve(configured);
  if (env.NODE_ENV === 'production') {
    return PRODUCTION_AI_WIDGET_LOG_PATH;
  }
  return path.join(process.cwd(), '.data', 'ai-widget-test.sqlite');
}

export function getAiWidgetLogDatabase() {
  const filePath = aiWidgetLogDatabasePath();
  if (global.__rosparkAiWidgetLogDb) {
    if (global.__rosparkAiWidgetLogDbPath !== filePath) {
      throw new Error(
        'Путь AI widget log нельзя менять после открытия соединения.',
      );
    }
    return global.__rosparkAiWidgetLogDb;
  }

  const directory = path.dirname(filePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const db = new Database(filePath);
  chmodSync(filePath, 0o600);
  db.pragma('journal_mode = WAL');
  for (const sidecarPath of [`${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(sidecarPath)) chmodSync(sidecarPath, 0o600);
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  runAiWidgetLogMigrations(db);
  cleanupExpiredAiWidgetLogs(db);

  global.__rosparkAiWidgetLogDb = db;
  global.__rosparkAiWidgetLogDbPath = filePath;
  return db;
}
