import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  cleanupExpiredLeads,
  processLeadOutboxBatch,
  runLeadRegistryMigrations,
} from '../app/lib/lead-registry-core.ts';
import { sendLeadToChannel } from '../lib/leads.ts';

if (process.env.LEAD_REGISTRY_ENABLED !== 'true') {
  throw new Error('LEAD_REGISTRY_ENABLED must be true.');
}
if (process.env.LEAD_OUTBOX_PROCESSING_ENABLED !== 'true') {
  throw new Error('LEAD_OUTBOX_PROCESSING_ENABLED must be true.');
}

const databasePath = process.env.LEAD_REGISTRY_DB_PATH?.trim();
if (!databasePath || !path.isAbsolute(databasePath)) {
  throw new Error('LEAD_REGISTRY_DB_PATH must be an absolute path.');
}

function optionalString(context, key) {
  const value = context[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function optionalStringArray(context, key) {
  const value = context[key];
  return Array.isArray(value) ? value : undefined;
}

function notificationPayload(job) {
  const utm = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'yclid',
    'gclid',
    'fbclid',
  ].reduce((result, key) => {
    const value = optionalString(job.context, key);
    if (value) result[key] = value;
    return result;
  }, {});

  return {
    name: job.name || 'Не указано',
    phone: `+${job.phone}`,
    phoneNormalized: job.phone,
    company: optionalString(job.context, 'company'),
    objectType: optionalString(job.context, 'object_type'),
    city: optionalString(job.context, 'city'),
    accessPoints: optionalString(job.context, 'access_points'),
    projectStage: optionalString(job.context, 'project_stage'),
    requestGoal: optionalString(job.context, 'request_goal'),
    currentSystem: optionalString(job.context, 'current_system'),
    projectInterests: optionalStringArray(job.context, 'project_interests'),
    message: optionalString(job.context, 'message'),
    source: job.source,
    intent: optionalString(job.context, 'intent'),
    product: optionalString(job.context, 'product'),
    packageName: optionalString(job.context, 'package_name'),
    consent: true,
    sourcePage: job.sourcePage || undefined,
    sourceSection: job.sourceSection || undefined,
    utm: Object.keys(utm).length > 0 ? utm : undefined,
    timestamp: job.receivedAt,
    registryLeadId: job.leadId,
    registryDuplicate: job.duplicate,
    registryKind: job.kind,
  };
}

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

try {
  const result = await processLeadOutboxBatch(
    db,
    async (job) => {
      await sendLeadToChannel(notificationPayload(job), job.channel);
    },
    { limit: 20 },
  );
  const expiredRemoved = cleanupExpiredLeads(db);
  process.stdout.write(`${JSON.stringify({ ...result, expiredRemoved })}\n`);
  if (result.dead > 0) process.exitCode = 2;
} finally {
  db.close();
}
