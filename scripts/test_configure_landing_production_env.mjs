import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(os.tmpdir(), 'rospark-landing-env-'));
const envFile = path.join(directory, '.env.production');
writeFileSync(envFile, [
  'LEAD_REGISTRY_ENABLED=true',
  'LEAD_OUTBOX_PROCESSING_ENABLED=true',
  'AI_WIDGET_ENABLED=true',
  'AI_WIDGET_RUNTIME_MODE=production',
  'AI_WIDGET_HANDOFF_MODE=live',
  'KEEP_ME=safe',
  '',
].join('\n'), { mode: 0o600 });

const output = execFileSync(
  process.execPath,
  ['scripts/configure_landing_production_env.mjs'],
  {
    cwd: process.cwd(),
    env: { ...process.env, LANDING_ENV_FILE: envFile },
    encoding: 'utf8',
  },
);
const result = JSON.parse(output);
const configured = readFileSync(envFile, 'utf8');

assert.match(configured, /^ROSPARK_LANDING_RUNTIME_MODE=production$/m);
assert.match(configured, /^ROSPARK_LANDING_INDEXABLE=true$/m);
assert.match(configured, /^NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-3Z9KNN3MMK$/m);
assert.match(configured, /^NEXT_PUBLIC_YANDEX_METRIKA_ID=110980303$/m);
assert.match(configured, /^KEEP_ME=safe$/m);
assert.equal(statSync(envFile).mode & 0o777, 0o600);
assert.equal(statSync(result.backupPath).mode & 0o777, 0o600);

execFileSync(
  process.execPath,
  ['scripts/check_landing_release_readiness.mjs'],
  {
    cwd: process.cwd(),
    env: { ...process.env, LANDING_ENV_FILE: envFile },
    stdio: 'pipe',
  },
);

process.stdout.write('landing production env checks: OK\n');
