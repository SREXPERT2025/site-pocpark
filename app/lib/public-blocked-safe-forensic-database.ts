import 'server-only';

import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  cleanupExpiredPublicBlockedSafeForensics,
  runPublicBlockedSafeForensicMigrations,
} from './public-blocked-safe-forensic-core.ts';

export const PRODUCTION_PUBLIC_BLOCKED_SAFE_FORENSIC_PATH =
  '/var/lib/rospark-ai-widget/public-blocked-forensics.sqlite';

declare global {
  // eslint-disable-next-line no-var
  var __rosparkPublicBlockedForensicDb: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __rosparkPublicBlockedForensicDbPath: string | undefined;
}

export function publicBlockedSafeForensicDatabasePath(
  env: NodeJS.ProcessEnv = process.env,
) {
  const configured = env.PUBLIC_BLOCKED_SAFE_FORENSIC_DB_PATH?.trim();
  if (configured) return path.resolve(configured);
  if (env.NODE_ENV === 'production') {
    return PRODUCTION_PUBLIC_BLOCKED_SAFE_FORENSIC_PATH;
  }
  return path.join(process.cwd(), '.data', 'public-blocked-forensics.sqlite');
}

export function getPublicBlockedSafeForensicDatabase() {
  const filePath = publicBlockedSafeForensicDatabasePath();
  if (global.__rosparkPublicBlockedForensicDb) {
    if (global.__rosparkPublicBlockedForensicDbPath !== filePath) {
      throw new Error('Public blocked forensic database path changed after open.');
    }
    return global.__rosparkPublicBlockedForensicDb;
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
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = FULL');
  runPublicBlockedSafeForensicMigrations(db);
  cleanupExpiredPublicBlockedSafeForensics(db);
  global.__rosparkPublicBlockedForensicDb = db;
  global.__rosparkPublicBlockedForensicDbPath = filePath;
  return db;
}
