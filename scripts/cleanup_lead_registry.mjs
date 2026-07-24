import { cleanupExpiredLeads } from '../app/lib/lead-registry-core.ts';
import {
  loadLeadRegistryEnvironment,
  openLeadRegistryDatabase,
  requireLeadRegistryDatabasePath,
} from './lead_registry_cli_runtime.mjs';

loadLeadRegistryEnvironment();
if (process.env.LEAD_REGISTRY_ENABLED !== 'true') {
  throw new Error('LEAD_REGISTRY_ENABLED must be true.');
}

const databasePath = requireLeadRegistryDatabasePath();
const db = openLeadRegistryDatabase(databasePath);

try {
  const expiredRemoved = cleanupExpiredLeads(db);
  process.stdout.write(`${JSON.stringify({ expiredRemoved })}\n`);
} finally {
  db.close();
}
