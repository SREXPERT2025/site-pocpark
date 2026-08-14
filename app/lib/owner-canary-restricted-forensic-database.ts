import 'server-only';

import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  cleanupExpiredOwnerCanaryRestrictedForensics,
  ownerCanaryRestrictedForensicError,
  runOwnerCanaryRestrictedForensicMigrations,
} from './owner-canary-restricted-forensic-core.ts';

export const PRODUCTION_OWNER_CANARY_RESTRICTED_FORENSIC_PATH =
  '/var/lib/rospark-ai-widget/owner-forensics.sqlite';

declare global {
  // eslint-disable-next-line no-var
  var __rosparkOwnerCanaryForensicDb: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __rosparkOwnerCanaryForensicDbPath: string | undefined;
}

export function ownerCanaryRestrictedForensicDatabasePath(
  env: NodeJS.ProcessEnv = process.env,
) {
  const configured = env.OWNER_CANARY_RESTRICTED_FORENSIC_DB_PATH?.trim();
  if (configured) return path.resolve(configured);
  if (env.NODE_ENV === 'production') {
    return PRODUCTION_OWNER_CANARY_RESTRICTED_FORENSIC_PATH;
  }
  return path.join(process.cwd(), '.data', 'owner-forensics.sqlite');
}

export function getOwnerCanaryRestrictedForensicDatabase() {
  const filePath = ownerCanaryRestrictedForensicDatabasePath();
  if (global.__rosparkOwnerCanaryForensicDb) {
    if (global.__rosparkOwnerCanaryForensicDbPath !== filePath) {
      throw ownerCanaryRestrictedForensicError(
        new Error('OWNER_RESTRICTED_FORENSIC_DATABASE_PATH_CHANGED'),
        'database_open',
      );
    }
    return global.__rosparkOwnerCanaryForensicDb;
  }

  const directory = path.dirname(filePath);
  let db: Database.Database;
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    db = new Database(filePath);
    chmodSync(filePath, 0o600);
  } catch (error) {
    throw ownerCanaryRestrictedForensicError(error, 'database_open');
  }
  try {
    db.pragma('journal_mode = WAL');
    for (const sidecarPath of [`${filePath}-wal`, `${filePath}-shm`]) {
      if (existsSync(/* turbopackIgnore: true */ sidecarPath)) {
        chmodSync(sidecarPath, 0o600);
      }
    }
    db.pragma('busy_timeout = 5_000');
    db.pragma('synchronous = FULL');
    runOwnerCanaryRestrictedForensicMigrations(db);
    cleanupExpiredOwnerCanaryRestrictedForensics(db);
  } catch (error) {
    try {
      db.close();
    } catch {
      // Preserve the initialization failure as the primary storage cause.
    }
    throw ownerCanaryRestrictedForensicError(error, 'database_initialize');
  }

  global.__rosparkOwnerCanaryForensicDb = db;
  global.__rosparkOwnerCanaryForensicDbPath = filePath;
  return db;
}
