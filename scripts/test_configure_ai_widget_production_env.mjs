import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = mkdtempSync(
  path.join(tmpdir(), 'rospark-ai-widget-production-env-'),
);
const envFile = path.join(directory, '.env.production');
writeFileSync(envFile, [
  'EXISTING_KEY=preserved',
  'LEAD_REGISTRY_ENABLED=true',
  'LEAD_REGISTRY_DB_PATH=/var/lib/rospark-leads/lead-registry.sqlite',
  '',
].join('\n'), { mode: 0o600 });

const run = spawnSync(
  process.execPath,
  ['scripts/configure_ai_widget_production_env.mjs'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AI_WIDGET_ENV_FILE: envFile,
      AI_WIDGET_PRODUCTION_ORIGIN: 'https://www.роспарк.рф',
      AI_WIDGET_PRODUCTION_GATEWAY_URL:
        'https://ai-gateway.rospark.internal',
      AI_WIDGET_GATEWAY_SECRET: 'g'.repeat(48),
    },
    encoding: 'utf8',
  },
);
assert.equal(run.status, 0, run.stderr);

const result = JSON.parse(run.stdout);
const configured = readFileSync(envFile, 'utf8');
assert.match(configured, /^EXISTING_KEY=preserved$/m);
assert.match(configured, /^AI_WIDGET_ENABLED=true$/m);
assert.match(configured, /^AI_WIDGET_RUNTIME_MODE=production$/m);
assert.match(
  configured,
  /^AI_WIDGET_ALLOWED_ORIGINS=https:\/\/www\.роспарк\.рф$/m,
);
assert.match(
  configured,
  /^AI_WIDGET_GATEWAY_URL=https:\/\/ai-gateway\.rospark\.internal$/m,
);
assert.match(configured, /^AI_WIDGET_GATEWAY_SECRET='g{48}'$/m);
assert.match(
  configured,
  /^AI_WIDGET_RATE_LIMIT_SECRET='[A-Za-z0-9_-]{43}'$/m,
);
assert.match(configured, /^AI_WIDGET_HANDOFF_MODE=live$/m);
assert.match(configured, /^AI_WIDGET_LOGGING_ENABLED=true$/m);
assert.match(
  configured,
  /^AI_WIDGET_LOG_DB_PATH='\/var\/lib\/rospark-ai-widget\/dialogs\.sqlite'$/m,
);
assert.match(configured, /^AI_WIDGET_PILOT_ENABLED=false$/m);
assert.equal(result.generatedRateLimitSecret, true);
assert.equal(statSync(envFile).mode & 0o777, 0o600);
assert.equal(statSync(result.backupPath).mode & 0o777, 0o600);

console.log('AI widget production env checks: OK');
