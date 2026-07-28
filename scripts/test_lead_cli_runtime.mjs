import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';

const repoRoot = process.cwd();
const temporaryDirectory = mkdtempSync(
  path.join(os.tmpdir(), 'rospark-lead-cli-'),
);
const databasePath = path.join(temporaryDirectory, 'data', 'lead-registry.sqlite');
const environmentPath = path.join(temporaryDirectory, '.env.production');

function runScript(relativePath) {
  const result = spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      '--experimental-strip-types',
      path.join(repoRoot, relativePath),
    ],
    {
      cwd: temporaryDirectory,
      encoding: 'utf8',
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('LEAD_')),
      ),
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout.trim());
}

function runConfigure(targetEnvironmentPath, enableOutbox) {
  const sessionSecret = 'test-session-secret-with-more-than-32-bytes';
  const directorHash = `scrypt-v1$${'A'.repeat(22)}$${'B'.repeat(86)}`;
  const salesHash = `scrypt-v1$${'C'.repeat(22)}$${'D'.repeat(86)}`;
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'scripts/configure_lead_ops_env.mjs')],
    {
      cwd: temporaryDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        LEAD_OPS_ENV_FILE: targetEnvironmentPath,
        LEAD_OPS_ENABLE_OUTBOX_PROCESSING: String(enableOutbox),
        LEAD_ADMIN_SESSION_SECRET: sessionSecret,
        LEAD_ADMIN_DIRECTOR_PASSWORD_HASH: directorHash,
        LEAD_ADMIN_SALES_PASSWORD_HASH: salesHash,
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.includes(sessionSecret), false);
  assert.equal(result.stdout.includes(directorHash), false);
  assert.equal(result.stdout.includes(salesHash), false);
  return {
    directorHash,
    payload: JSON.parse(result.stdout.trim()),
    salesHash,
    sessionSecret,
  };
}

try {
  writeFileSync(environmentPath, [
    'NODE_ENV=production',
    `LEAD_REGISTRY_DB_PATH='${databasePath}'`,
    'LEAD_REGISTRY_ENABLED=true',
    'LEAD_OUTBOX_CHANNELS=max',
    'LEAD_OUTBOX_PROCESSING_ENABLED=true',
    '',
  ].join('\n'), { mode: 0o600 });
  chmodSync(environmentPath, 0o600);

  assert.deepEqual(
    runScript('scripts/cleanup_lead_registry.mjs'),
    { expiredRemoved: 0 },
  );
  assert.equal(statSync(path.dirname(databasePath)).mode & 0o777, 0o700);
  assert.equal(statSync(databasePath).mode & 0o777, 0o600);

  const db = new Database(databasePath, { readonly: true });
  assert.equal(db.pragma('quick_check', { simple: true }), 'ok');
  assert.deepEqual(
    db.prepare(`
      SELECT version, name
      FROM lead_schema_migrations
      ORDER BY version
    `).all(),
    [
      { version: 1, name: 'lead_registry_foundation' },
      { version: 2, name: 'lead_notification_outbox' },
      { version: 3, name: 'lead_admin_audit' },
      { version: 4, name: 'lead_notification_receipts' },
    ],
  );
  db.close();

  assert.deepEqual(
    runScript('scripts/process_lead_outbox.mjs'),
    {
      claimed: 0,
      sent: 0,
      failed: 0,
      dead: 0,
      expiredRemoved: 0,
    },
  );

  assert.match(
    readFileSync(environmentPath, 'utf8'),
    /LEAD_REGISTRY_ENABLED=true/,
  );

  const configuredEnvironmentPath = environmentPath;
  writeFileSync(configuredEnvironmentPath, [
    '# Existing production values stay intact.',
    'UNRELATED_VALUE=keep-me',
    "LEAD_MAX_BOT_TOKEN='test-max-token'",
    'LEAD_MAX_CHAT_ID=123456',
    'LEAD_REGISTRY_ENABLED=false',
    'LEAD_REGISTRY_ENABLED=false',
    '',
  ].join('\n'), { mode: 0o644 });

  const firstConfiguration = runConfigure(configuredEnvironmentPath, false);
  const configuredContents = readFileSync(configuredEnvironmentPath, 'utf8');
  assert.equal(statSync(configuredEnvironmentPath).mode & 0o777, 0o600);
  assert.equal(
    statSync(firstConfiguration.payload.backupPath).mode & 0o777,
    0o600,
  );
  assert.match(configuredContents, /UNRELATED_VALUE=keep-me/);
  assert.match(configuredContents, /LEAD_MAX_CHAT_ID=123456/);
  assert.match(configuredContents, /LEAD_OUTBOX_PROCESSING_ENABLED=false/);
  assert.match(
    configuredContents,
    new RegExp(`LEAD_ADMIN_SESSION_SECRET='${firstConfiguration.sessionSecret}'`),
  );
  assert.match(
    configuredContents,
    new RegExp(
      `LEAD_ADMIN_DIRECTOR_PASSWORD_HASH='${firstConfiguration.directorHash
        .replace(/\$/g, '\\\\\\$')}'`,
    ),
  );
  assert.equal(
    (configuredContents.match(/^LEAD_REGISTRY_ENABLED=/gm) ?? []).length,
    1,
  );

  const envLoadProbe = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      [
        "import nextEnv from '@next/env';",
        `nextEnv.loadEnvConfig(${JSON.stringify(temporaryDirectory)}, false);`,
        'process.stdout.write(JSON.stringify({',
        'secret: process.env.LEAD_ADMIN_SESSION_SECRET,',
        'director: process.env.LEAD_ADMIN_DIRECTOR_PASSWORD_HASH,',
        'sales: process.env.LEAD_ADMIN_SALES_PASSWORD_HASH,',
        '}));',
      ].join(''),
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('LEAD_')),
      ),
    },
  );
  assert.equal(envLoadProbe.status, 0, envLoadProbe.stderr);
  const loadedSecrets = JSON.parse(envLoadProbe.stdout);
  assert.equal(loadedSecrets.secret, firstConfiguration.sessionSecret);
  assert.equal(loadedSecrets.director, firstConfiguration.directorHash);
  assert.equal(loadedSecrets.sales, firstConfiguration.salesHash);

  const secondConfiguration = runConfigure(configuredEnvironmentPath, true);
  assert.equal(secondConfiguration.payload.outboxProcessingEnabled, true);
  assert.match(
    readFileSync(configuredEnvironmentPath, 'utf8'),
    /LEAD_OUTBOX_PROCESSING_ENABLED=true/,
  );

  const invalidEnvironmentPath = path.join(
    temporaryDirectory,
    'missing-max.env.production',
  );
  writeFileSync(invalidEnvironmentPath, [
    "LEAD_MAX_BOT_TOKEN=''",
    'LEAD_MAX_CHAT_ID=',
    '',
  ].join('\n'), { mode: 0o600 });
  const invalidConfiguration = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'scripts/configure_lead_ops_env.mjs')],
    {
      cwd: temporaryDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        LEAD_OPS_ENV_FILE: invalidEnvironmentPath,
        LEAD_OPS_ENABLE_OUTBOX_PROCESSING: 'true',
        LEAD_ADMIN_SESSION_SECRET: firstConfiguration.sessionSecret,
        LEAD_ADMIN_DIRECTOR_PASSWORD_HASH: firstConfiguration.directorHash,
        LEAD_ADMIN_SALES_PASSWORD_HASH: firstConfiguration.salesHash,
      },
    },
  );
  assert.notEqual(invalidConfiguration.status, 0);
  assert.match(invalidConfiguration.stderr, /MAX lead delivery is not configured/);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log('Lead CLI production env, permissions, migrations and no-send smoke passed.');
