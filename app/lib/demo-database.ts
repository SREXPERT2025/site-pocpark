import 'server-only';

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { runDemoMigrations } from './demo-migrations';

declare global {
  // eslint-disable-next-line no-var
  var __rosparkDemoDb: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __rosparkDemoDbPath: string | undefined;
}

export function demoDatabasePath() {
  return process.env.DEMO_REQUESTS_DB_PATH || path.join(process.cwd(), '.data', 'guest-requests.sqlite');
}

export function getDemoDatabase() {
  const filePath = demoDatabasePath();
  if (global.__rosparkDemoDb) {
    if (global.__rosparkDemoDbPath !== filePath) {
      throw new Error('Путь demo-базы нельзя менять после открытия соединения.');
    }
    return global.__rosparkDemoDb;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runDemoMigrations(db);

  global.__rosparkDemoDb = db;
  global.__rosparkDemoDbPath = filePath;
  return db;
}
