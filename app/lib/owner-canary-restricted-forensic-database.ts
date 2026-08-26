import 'server-only';

import path from 'node:path';
import type Database from 'better-sqlite3';
import {
  ownerCanaryRestrictedForensicError,
  openOwnerCanaryRestrictedForensicDatabase,
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

  const db = openOwnerCanaryRestrictedForensicDatabase(filePath);

  global.__rosparkOwnerCanaryForensicDb = db;
  global.__rosparkOwnerCanaryForensicDbPath = filePath;
  return db;
}
