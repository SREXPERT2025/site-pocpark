import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const script = path.join(
  root,
  'scripts/configure_ai_widget_gateway_production_env.mjs',
);

function run(target, extraEnv = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AI_WIDGET_GATEWAY_ENV_FILE: target,
      ...extraEnv,
    },
  });
}

const directory = mkdtempSync(
  path.join(tmpdir(), 'rospark-ai-widget-gateway-env-'),
);
const target = path.join(directory, '.env.ai-widget-production.local');

const first = run(target);
assert.equal(first.status, 0, first.stderr);
const firstResult = JSON.parse(first.stdout);
assert.equal(firstResult.created, true);
assert.equal(firstResult.generatedSecret, true);
assert.equal(firstResult.runtimeMode, 'production');
assert.equal(lstatSync(target).mode & 0o777, 0o600);

const firstContents = readFileSync(target, 'utf8');
const secret = firstContents.match(
  /^AI_WIDGET_GATEWAY_SECRET='([^']+)'$/m,
)?.[1];
assert.ok(secret);
assert.ok(secret.length >= 32);
assert.match(firstContents, /^AI_WIDGET_GATEWAY_MODE=production$/m);

const second = run(target);
assert.equal(second.status, 0, second.stderr);
const secondResult = JSON.parse(second.stdout);
assert.equal(secondResult.created, false);
assert.equal(secondResult.generatedSecret, false);
assert.ok(secondResult.backupPath);
assert.equal(lstatSync(secondResult.backupPath).mode & 0o777, 0o600);
assert.equal(
  readFileSync(target, 'utf8').match(
    /^AI_WIDGET_GATEWAY_SECRET='([^']+)'$/m,
  )?.[1],
  secret,
);

const supplied = randomBytes(48).toString('base64url');
const third = run(target, { AI_WIDGET_GATEWAY_SECRET: supplied });
assert.equal(third.status, 0, third.stderr);
assert.equal(
  readFileSync(target, 'utf8').match(
    /^AI_WIDGET_GATEWAY_SECRET='([^']+)'$/m,
  )?.[1],
  supplied,
);

const invalid = run(target, { AI_WIDGET_GATEWAY_SECRET: 'short' });
assert.notEqual(invalid.status, 0);
assert.match(invalid.stderr, /32-512 safe bytes/);

const symlinkTarget = path.join(directory, 'linked.env');
const regularTarget = path.join(directory, 'regular.env');
writeFileSync(regularTarget, 'AI_WIDGET_GATEWAY_MODE=preview\n');
symlinkSync(regularTarget, symlinkTarget);
const symlinkResult = run(symlinkTarget);
assert.notEqual(symlinkResult.status, 0);
assert.match(symlinkResult.stderr, /regular non-symlink/);

process.stdout.write(
  'AI widget production gateway env configuration checks: OK\n',
);
