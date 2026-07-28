import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';
import Database from 'better-sqlite3';

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
nextEnv.loadEnvConfig(
  process.cwd(),
  process.env.NODE_ENV !== 'production',
);

function required(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function requireExact(value, expected, key) {
  if (value !== expected) {
    throw new Error(`${key} must be ${expected}.`);
  }
}

function inspectDatabase(filePath, migrationTable, expectedVersions) {
  if (!path.isAbsolute(filePath) || !existsSync(filePath)) {
    throw new Error(`Database does not exist: ${filePath}`);
  }
  const mode = statSync(filePath).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new Error(`Database permissions are too broad: ${filePath}`);
  }
  const db = new Database(filePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    db.pragma('query_only = ON');
    const quickCheck = db.pragma('quick_check', { simple: true });
    if (quickCheck !== 'ok') {
      throw new Error(`quick_check failed for ${filePath}: ${quickCheck}`);
    }
    const foreignKeys = db.pragma('foreign_key_check');
    if (foreignKeys.length > 0) {
      throw new Error(`foreign_key_check failed for ${filePath}.`);
    }
    const versions = db.prepare(`
      SELECT version
      FROM ${migrationTable}
      ORDER BY version
    `).all().map((item) => item.version);
    if (JSON.stringify(versions) !== JSON.stringify(expectedVersions)) {
      throw new Error(
        `Unexpected migrations in ${filePath}: ${versions.join(',')}`,
      );
    }
    return {
      path: filePath,
      mode: mode.toString(8),
      quickCheck,
      migrations: versions,
    };
  } finally {
    db.close();
  }
}

requireExact(required('AI_WIDGET_ENABLED'), 'true', 'AI_WIDGET_ENABLED');
requireExact(
  required('AI_WIDGET_RUNTIME_MODE'),
  'production',
  'AI_WIDGET_RUNTIME_MODE',
);
requireExact(
  required('AI_WIDGET_HANDOFF_MODE'),
  'live',
  'AI_WIDGET_HANDOFF_MODE',
);
requireExact(
  required('AI_WIDGET_LOGGING_ENABLED'),
  'true',
  'AI_WIDGET_LOGGING_ENABLED',
);
requireExact(
  required('LEAD_REGISTRY_ENABLED'),
  'true',
  'LEAD_REGISTRY_ENABLED',
);

const allowedOrigins = required('AI_WIDGET_ALLOWED_ORIGINS')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (
  allowedOrigins.length !== 1
  || new URL(allowedOrigins[0]).protocol !== 'https:'
) {
  throw new Error('AI_WIDGET_ALLOWED_ORIGINS must contain one HTTPS origin.');
}

const gatewayUrl = new URL(required('AI_WIDGET_GATEWAY_URL'));
if (
  gatewayUrl.protocol !== 'https:'
  || gatewayUrl.username
  || gatewayUrl.password
  || gatewayUrl.search
  || gatewayUrl.hash
) {
  throw new Error('AI_WIDGET_GATEWAY_URL must be a safe HTTPS URL.');
}
const gatewaySecret = required('AI_WIDGET_GATEWAY_SECRET');
if (Buffer.byteLength(gatewaySecret, 'utf8') < 32) {
  throw new Error('AI_WIDGET_GATEWAY_SECRET is too short.');
}
if (Buffer.byteLength(required('AI_WIDGET_RATE_LIMIT_SECRET'), 'utf8') < 32) {
  throw new Error('AI_WIDGET_RATE_LIMIT_SECRET is too short.');
}

const widgetDatabase = inspectDatabase(
  required('AI_WIDGET_LOG_DB_PATH'),
  'ai_widget_log_migrations',
  [1, 2],
);
const leadDatabasePath = required('LEAD_REGISTRY_DB_PATH');
const leadDatabase = inspectDatabase(
  leadDatabasePath,
  'lead_schema_migrations',
  [1, 2, 3, 4],
);

const healthUrl = `${gatewayUrl.toString().replace(/\/$/, '')}/health`;
const healthResponse = await fetch(healthUrl, {
  headers: {
    Authorization: `Bearer ${gatewaySecret}`,
  },
  cache: 'no-store',
  signal: AbortSignal.timeout(10_000),
});
if (!healthResponse.ok) {
  throw new Error(`AI gateway health returned ${healthResponse.status}.`);
}
const health = await healthResponse.json();
if (health?.status !== 'ok' || health?.runtime_mode !== 'production') {
  throw new Error('AI gateway is not ready in production mode.');
}

const leadDb = new Database(leadDatabasePath, {
  readonly: true,
  fileMustExist: true,
});
let outbox;
try {
  leadDb.pragma('query_only = ON');
  outbox = leadDb.prepare(`
    SELECT status, COUNT(*) AS count
    FROM lead_notification_outbox
    GROUP BY status
    ORDER BY status
  `).all();
} finally {
  leadDb.close();
}

process.stdout.write(`${JSON.stringify({
  status: 'ready',
  allowedOrigin: allowedOrigins[0],
  gateway: {
    status: health.status,
    runtimeMode: health.runtime_mode,
  },
  widgetDatabase,
  leadDatabase,
  outbox,
  externalMessagesSentByCheck: 0,
})}\n`);
