import {
  chmodSync,
  chownSync,
  copyFileSync,
  lstatSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const targetPath = process.env.LEAD_OPS_ENV_FILE?.trim();
if (!targetPath || !path.isAbsolute(targetPath)) {
  throw new Error('LEAD_OPS_ENV_FILE must be an absolute path.');
}

const targetStat = lstatSync(targetPath);
if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
  throw new Error('LEAD_OPS_ENV_FILE must be a regular non-symlink file.');
}

function requiredSecret(key, minimumLength, maximumLength = 512) {
  const value = process.env[key];
  if (
    !value ||
    Buffer.byteLength(value, 'utf8') < minimumLength ||
    Buffer.byteLength(value, 'utf8') > maximumLength ||
    /[\r\n\0']/.test(value)
  ) {
    throw new Error(`${key} is missing or invalid.`);
  }
  return value;
}

function username(key, fallback) {
  const value = process.env[key]?.trim().toLowerCase() || fallback;
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(value)) {
    throw new Error(`${key} is invalid.`);
  }
  return value;
}

function passwordHash(key) {
  const value = requiredSecret(key, 100);
  if (!/^scrypt-v1\$[A-Za-z0-9_-]{20,}\$[A-Za-z0-9_-]{80,}$/.test(value)) {
    throw new Error(`${key} is not a supported scrypt hash.`);
  }
  return value;
}

function configuredInFile(contents, key) {
  const expression = new RegExp(
    `^\\s*(?:export\\s+)?${key}\\s*=\\s*(?!['\"]?\\s*['\"]?\\s*$).+`,
    'm',
  );
  return expression.test(contents);
}

function quote(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/\$/g, '\\$')}'`;
}

const current = readFileSync(targetPath, 'utf8');
const enableOutbox = process.env.LEAD_OPS_ENABLE_OUTBOX_PROCESSING === 'true';
if (
  enableOutbox &&
  (
    !configuredInFile(current, 'LEAD_MAX_BOT_TOKEN') ||
    !configuredInFile(current, 'LEAD_MAX_CHAT_ID')
  )
) {
  throw new Error('MAX lead delivery is not configured in the target env file.');
}

const values = new Map([
  ['LEAD_REGISTRY_DB_PATH', '/var/lib/rospark-leads/lead-registry.sqlite'],
  ['LEAD_REGISTRY_ENABLED', 'true'],
  ['LEAD_OUTBOX_CHANNELS', 'max'],
  ['LEAD_OUTBOX_PROCESSING_ENABLED', String(enableOutbox)],
  ['LEAD_ADMIN_ENABLED', 'true'],
  [
    'LEAD_ADMIN_SESSION_SECRET',
    quote(requiredSecret('LEAD_ADMIN_SESSION_SECRET', 32)),
  ],
  ['LEAD_ADMIN_SESSION_TTL_HOURS', '8'],
  [
    'LEAD_ADMIN_DIRECTOR_USERNAME',
    username('LEAD_ADMIN_DIRECTOR_USERNAME', 'andrey'),
  ],
  [
    'LEAD_ADMIN_DIRECTOR_PASSWORD_HASH',
    quote(passwordHash('LEAD_ADMIN_DIRECTOR_PASSWORD_HASH')),
  ],
  [
    'LEAD_ADMIN_SALES_USERNAME',
    username('LEAD_ADMIN_SALES_USERNAME', 'sergey'),
  ],
  [
    'LEAD_ADMIN_SALES_PASSWORD_HASH',
    quote(passwordHash('LEAD_ADMIN_SALES_PASSWORD_HASH')),
  ],
]);

const managedKeys = new Set(values.keys());
const retainedLines = current
  .split(/\r?\n/)
  .filter((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
    return !match || !managedKeys.has(match[1]);
  });
while (retainedLines.at(-1) === '') retainedLines.pop();

const updated = [
  ...retainedLines,
  '',
  '# Lead registry, outbox and protected operations console.',
  ...Array.from(values, ([key, value]) => `${key}=${value}`),
  '',
].join('\n');

const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
const backupPath = `${targetPath}.before-lead-ops-${timestamp}-${process.pid}`;
const temporaryPath = `${targetPath}.lead-ops-${process.pid}.tmp`;

copyFileSync(targetPath, backupPath);
chmodSync(backupPath, 0o600);
chownSync(backupPath, targetStat.uid, targetStat.gid);

writeFileSync(temporaryPath, updated, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
chmodSync(temporaryPath, 0o600);
chownSync(temporaryPath, targetStat.uid, targetStat.gid);
renameSync(temporaryPath, targetPath);
chmodSync(targetPath, 0o600);

process.stdout.write(`${JSON.stringify({
  backupPath,
  outboxProcessingEnabled: enableOutbox,
  updatedKeys: Array.from(values.keys()),
})}\n`);
