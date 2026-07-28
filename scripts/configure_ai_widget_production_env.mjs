import { randomBytes } from 'node:crypto';
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

const targetPath = process.env.AI_WIDGET_ENV_FILE?.trim();
if (!targetPath || !path.isAbsolute(targetPath)) {
  throw new Error('AI_WIDGET_ENV_FILE must be an absolute path.');
}
const targetStat = lstatSync(targetPath);
if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
  throw new Error('AI_WIDGET_ENV_FILE must be a regular non-symlink file.');
}

function existingValue(contents, key) {
  const expression = new RegExp(
    `^\\s*(?:export\\s+)?${key}\\s*=\\s*(.+?)\\s*$`,
    'm',
  );
  const match = contents.match(expression);
  if (!match) return '';
  const value = match[1].trim();
  if (
    value.length >= 2
    && value[0] === value.at(-1)
    && ['"', "'"].includes(value[0])
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function validSecret(value) {
  const length = Buffer.byteLength(value, 'utf8');
  return length >= 32 && length <= 512 && !/[\r\n\0']/.test(value);
}

function quote(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/\$/g, '\\$')}'`;
}

const current = readFileSync(targetPath, 'utf8');
if (existingValue(current, 'LEAD_REGISTRY_ENABLED') !== 'true') {
  throw new Error('LEAD_REGISTRY_ENABLED must already be true.');
}
if (!existingValue(current, 'LEAD_REGISTRY_DB_PATH')) {
  throw new Error('LEAD_REGISTRY_DB_PATH must already be configured.');
}

const publicOrigin = (
  process.env.AI_WIDGET_PRODUCTION_ORIGIN?.trim()
  || 'https://www.роспарк.рф'
);
const parsedOrigin = new URL(publicOrigin);
if (
  parsedOrigin.protocol !== 'https:'
  || parsedOrigin.username
  || parsedOrigin.password
  || parsedOrigin.pathname !== '/'
  || parsedOrigin.search
  || parsedOrigin.hash
  || publicOrigin.endsWith('/')
) {
  throw new Error(
    'AI_WIDGET_PRODUCTION_ORIGIN must be one exact HTTPS origin.',
  );
}

const gatewayUrlValue = process.env.AI_WIDGET_PRODUCTION_GATEWAY_URL?.trim();
if (!gatewayUrlValue) {
  throw new Error('AI_WIDGET_PRODUCTION_GATEWAY_URL is required.');
}
const gatewayUrl = new URL(gatewayUrlValue);
if (
  gatewayUrl.protocol !== 'https:'
  || gatewayUrl.username
  || gatewayUrl.password
  || gatewayUrl.search
  || gatewayUrl.hash
  || gatewayUrl.pathname.includes('..')
) {
  throw new Error(
    'AI_WIDGET_PRODUCTION_GATEWAY_URL must be a safe HTTPS URL.',
  );
}

const suppliedGatewaySecret = process.env.AI_WIDGET_GATEWAY_SECRET || '';
const currentGatewaySecret = existingValue(
  current,
  'AI_WIDGET_GATEWAY_SECRET',
);
const gatewaySecret = suppliedGatewaySecret || currentGatewaySecret;
if (!validSecret(gatewaySecret)) {
  throw new Error(
    'AI_WIDGET_GATEWAY_SECRET must already contain 32-512 safe bytes.',
  );
}

const suppliedRateSecret = process.env.AI_WIDGET_RATE_LIMIT_SECRET || '';
const currentRateSecret = existingValue(
  current,
  'AI_WIDGET_RATE_LIMIT_SECRET',
);
const rateSecret = suppliedRateSecret
  || currentRateSecret
  || randomBytes(32).toString('base64url');
if (!validSecret(rateSecret)) {
  throw new Error('AI_WIDGET_RATE_LIMIT_SECRET is invalid.');
}

const configuredLogPath = (
  process.env.AI_WIDGET_LOG_DB_PATH?.trim()
  || existingValue(current, 'AI_WIDGET_LOG_DB_PATH')
  || '/var/lib/rospark-ai-widget/dialogs.sqlite'
);
if (!path.isAbsolute(configuredLogPath) || /[\r\n\0']/.test(configuredLogPath)) {
  throw new Error('AI_WIDGET_LOG_DB_PATH must be one safe absolute path.');
}

const values = new Map([
  ['AI_WIDGET_ENABLED', 'true'],
  ['AI_WIDGET_RUNTIME_MODE', 'production'],
  ['AI_WIDGET_ALLOWED_ORIGINS', publicOrigin],
  ['AI_WIDGET_GATEWAY_URL', gatewayUrl.toString().replace(/\/$/, '')],
  ['AI_WIDGET_GATEWAY_SECRET', quote(gatewaySecret)],
  ['AI_WIDGET_RATE_LIMIT_SECRET', quote(rateSecret)],
  ['AI_WIDGET_HANDOFF_MODE', 'live'],
  ['AI_WIDGET_LOGGING_ENABLED', 'true'],
  ['AI_WIDGET_LOG_DB_PATH', quote(configuredLogPath)],
  ['AI_WIDGET_PILOT_ENABLED', 'false'],
  ['AI_WIDGET_PILOT_ORIGINS', ''],
]);
const managedKeys = new Set(values.keys());
const retainedLines = current
  .split(/\r?\n/)
  .filter((line) => {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/,
    );
    return !match || !managedKeys.has(match[1]);
  });
while (retainedLines.at(-1) === '') retainedLines.pop();

const updated = [
  ...retainedLines,
  '',
  '# ROSPARK AI widget production runtime.',
  ...Array.from(values, ([key, value]) => `${key}=${value}`),
  '',
].join('\n');
const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
const backupPath = (
  `${targetPath}.before-ai-widget-production-${timestamp}-${process.pid}`
);
const temporaryPath = `${targetPath}.ai-widget-production-${process.pid}.tmp`;

copyFileSync(targetPath, backupPath);
chmodSync(backupPath, 0o600);
chownSync(backupPath, targetStat.uid, targetStat.gid);
writeFileSync(temporaryPath, updated, {
  encoding: 'utf8',
  flag: 'wx',
  mode: 0o600,
});
chmodSync(temporaryPath, 0o600);
chownSync(temporaryPath, targetStat.uid, targetStat.gid);
renameSync(temporaryPath, targetPath);
chmodSync(targetPath, 0o600);

process.stdout.write(`${JSON.stringify({
  backupPath,
  generatedRateLimitSecret: !suppliedRateSecret && !currentRateSecret,
  updatedKeys: Array.from(values.keys()),
})}\n`);
