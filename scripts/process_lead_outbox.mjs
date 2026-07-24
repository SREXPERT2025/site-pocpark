import {
  cleanupExpiredLeads,
  processLeadOutboxBatch,
} from '../app/lib/lead-registry-core.ts';
import { sendLeadToChannel } from '../lib/leads.ts';
import {
  loadLeadRegistryEnvironment,
  openLeadRegistryDatabase,
  requireLeadRegistryDatabasePath,
} from './lead_registry_cli_runtime.mjs';

loadLeadRegistryEnvironment();
if (process.env.LEAD_REGISTRY_ENABLED !== 'true') {
  throw new Error('LEAD_REGISTRY_ENABLED must be true.');
}
if (process.env.LEAD_OUTBOX_PROCESSING_ENABLED !== 'true') {
  throw new Error('LEAD_OUTBOX_PROCESSING_ENABLED must be true.');
}

const databasePath = requireLeadRegistryDatabasePath();

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

const db = openLeadRegistryDatabase(databasePath);

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
