import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = mkdtempSync(path.join(tmpdir(), 'rospark-ai-widget-env-'));
const envFile = path.join(directory, '.env.production.local');
writeFileSync(envFile, 'EXISTING_KEY=preserved\n', { mode: 0o600 });

const run = spawnSync(
  process.execPath,
  ['scripts/configure_ai_widget_pilot_env.mjs'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AI_WIDGET_ENV_FILE: envFile,
      AI_WIDGET_PILOT_ORIGIN: 'https://srtestrealme.ru:3001',
    },
    encoding: 'utf8',
  },
);
assert.equal(run.status, 0, run.stderr);

const result = JSON.parse(run.stdout);
const configured = readFileSync(envFile, 'utf8');
assert.match(configured, /^EXISTING_KEY=preserved$/m);
assert.match(configured, /^AI_WIDGET_PILOT_ENABLED=true$/m);
assert.match(configured, /^AI_WIDGET_ENABLED=true$/m);
assert.match(configured, /^AI_WIDGET_RUNTIME_MODE=preview$/m);
assert.match(
  configured,
  /^AI_WIDGET_ALLOWED_ORIGINS=https:\/\/srtestrealme\.ru:3001$/m,
);
assert.match(
  configured,
  /^AI_WIDGET_PILOT_ORIGINS=https:\/\/srtestrealme\.ru:3001$/m,
);
assert.match(
  configured,
  /^AI_WIDGET_GATEWAY_URL=http:\/\/127\.0\.0\.1:8787$/m,
);
assert.match(
  configured,
  /^AI_WIDGET_GATEWAY_SECRET='[A-Za-z0-9_-]{43}'$/m,
);
assert.match(configured, /^AI_WIDGET_GATEWAY_MODE=preview$/m);
assert.match(configured, /^AI_WIDGET_HANDOFF_MODE=test$/m);
assert.match(configured, /^AI_WIDGET_LOGGING_ENABLED=true$/m);
assert.match(
  configured,
  /^AI_WIDGET_LOG_DB_PATH='.*ai-widget-test\.sqlite'$/m,
);
assert.equal(result.generatedSecret, true);
assert.equal(statSync(envFile).mode & 0o777, 0o600);
assert.equal(statSync(result.backupPath).mode & 0o777, 0o600);

console.log('AI widget env configuration checks: OK');
