import 'server-only';

import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { runLeadRegistryMigrations } from './lead-registry-core';

export const PRODUCTION_LEAD_REGISTRY_PATH =
  '/var/lib/rospark-leads/lead-registry.sqlite';

declare global {
  // eslint-disable-next-line no-var
  var __rosparkLeadRegistryDb: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __rosparkLeadRegistryDbPath: string | undefined;
}

export function leadRegistryDatabasePath() {
  const configured = process.env.LEAD_REGISTRY_DB_PATH?.trim();
  if (configured) return path.resolve(configured);
  if (process.env.NODE_ENV === 'production') return PRODUCTION_LEAD_REGISTRY_PATH;
  return path.join(process.cwd(), '.data', 'lead-registry.sqlite');
}

export function getLeadRegistryDatabase() {
  const filePath = leadRegistryDatabasePath();
  if (global.__rosparkLeadRegistryDb) {
    if (global.__rosparkLeadRegistryDbPath !== filePath) {
      throw new Error('Путь lead registry нельзя менять после открытия соединения.');
    }
    return global.__rosparkLeadRegistryDb;
  }

  const directory = path.dirname(filePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const db = new Database(filePath);
  chmodSync(filePath, 0o600);
  db.pragma('journal_mode = WAL');
  for (const sidecarPath of [`${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(/* turbopackIgnore: true */ sidecarPath)) {
      chmodSync(sidecarPath, 0o600);
    }
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  runLeadRegistryMigrations(db);

  global.__rosparkLeadRegistryDb = db;
  global.__rosparkLeadRegistryDbPath = filePath;
  return db;
}
