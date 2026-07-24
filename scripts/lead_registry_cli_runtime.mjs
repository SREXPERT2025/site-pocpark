import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';
import Database from 'better-sqlite3';
import { runLeadRegistryMigrations } from '../app/lib/lead-registry-core.ts';

let environmentLoaded = false;

export function loadLeadRegistryEnvironment() {
  if (environmentLoaded) return;
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
  nextEnv.loadEnvConfig(
    process.cwd(),
    process.env.NODE_ENV !== 'production',
  );
  environmentLoaded = true;
}

export function requireLeadRegistryDatabasePath() {
  const databasePath = process.env.LEAD_REGISTRY_DB_PATH?.trim();
  if (!databasePath || !path.isAbsolute(databasePath)) {
    throw new Error('LEAD_REGISTRY_DB_PATH must be an absolute path.');
  }
  return databasePath;
}

export function openLeadRegistryDatabase(databasePath) {
  const directory = path.dirname(databasePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);

  const db = new Database(databasePath);
  chmodSync(databasePath, 0o600);
  db.pragma('journal_mode = WAL');
  for (const sidecarPath of [`${databasePath}-wal`, `${databasePath}-shm`]) {
    if (existsSync(sidecarPath)) chmodSync(sidecarPath, 0o600);
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  runLeadRegistryMigrations(db);
  return db;
}
