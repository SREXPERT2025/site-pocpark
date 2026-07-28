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
  return (
    Buffer.byteLength(value, 'utf8') >= 32
    && Buffer.byteLength(value, 'utf8') <= 512
    && !/[\r\n\0']/.test(value)
  );
}

function quote(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/\$/g, '\\$')}'`;
}

const current = readFileSync(targetPath, 'utf8');
const suppliedSecret = process.env.AI_WIDGET_GATEWAY_SECRET || '';
const currentSecret = existingValue(current, 'AI_WIDGET_GATEWAY_SECRET');
const secret = suppliedSecret || currentSecret || randomBytes(32).toString('base64url');
if (!validSecret(secret)) {
  throw new Error('AI_WIDGET_GATEWAY_SECRET is invalid.');
}

const previewOrigin = (
  process.env.AI_WIDGET_PILOT_ORIGIN?.trim()
  || 'https://srtestrealme.ru:3001'
);
const parsedOrigin = new URL(previewOrigin);
if (parsedOrigin.origin !== previewOrigin || parsedOrigin.protocol !== 'https:') {
  throw new Error('AI_WIDGET_PILOT_ORIGIN must be one exact HTTPS origin.');
}

const configuredLogPath = (
  process.env.AI_WIDGET_LOG_DB_PATH?.trim()
  || existingValue(current, 'AI_WIDGET_LOG_DB_PATH')
  || path.join(path.dirname(targetPath), '.data', 'ai-widget-test.sqlite')
);
if (!path.isAbsolute(configuredLogPath) || /[\r\n\0']/.test(configuredLogPath)) {
  throw new Error('AI_WIDGET_LOG_DB_PATH must be one safe absolute path.');
}

const values = new Map([
  ['AI_WIDGET_PILOT_ENABLED', 'true'],
  ['AI_WIDGET_PILOT_ORIGINS', previewOrigin],
  ['AI_WIDGET_GATEWAY_URL', 'http://127.0.0.1:8787'],
  ['AI_WIDGET_GATEWAY_SECRET', quote(secret)],
  ['AI_WIDGET_HANDOFF_MODE', 'test'],
  ['AI_WIDGET_LOGGING_ENABLED', 'true'],
  ['AI_WIDGET_LOG_DB_PATH', quote(configuredLogPath)],
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
  '# Short-lived ROSPARK AI widget preview pilot.',
  ...Array.from(values, ([key, value]) => `${key}=${value}`),
  '',
].join('\n');

const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
const backupPath = `${targetPath}.before-ai-widget-${timestamp}-${process.pid}`;
const temporaryPath = `${targetPath}.ai-widget-${process.pid}.tmp`;

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
  generatedSecret: !suppliedSecret && !currentSecret,
  updatedKeys: Array.from(values.keys()),
})}\n`);
