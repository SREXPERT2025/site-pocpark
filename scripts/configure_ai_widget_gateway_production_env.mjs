import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  openSync,
  closeSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const targetPath = process.env.AI_WIDGET_GATEWAY_ENV_FILE?.trim();
if (!targetPath || !path.isAbsolute(targetPath)) {
  throw new Error('AI_WIDGET_GATEWAY_ENV_FILE must be an absolute path.');
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
    && !/[\r\n\0'\\]/.test(value)
  );
}

let current = '';
let backupPath = null;
let targetExisted = false;

try {
  const targetStat = lstatSync(targetPath);
  if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
    throw new Error(
      'AI_WIDGET_GATEWAY_ENV_FILE must be a regular non-symlink file.',
    );
  }
  current = readFileSync(targetPath, 'utf8');
  targetExisted = true;
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const suppliedSecret = process.env.AI_WIDGET_GATEWAY_SECRET || '';
const currentSecret = existingValue(current, 'AI_WIDGET_GATEWAY_SECRET');
const generatedSecret = randomBytes(48).toString('base64url');
const secret = suppliedSecret || currentSecret || generatedSecret;
if (!validSecret(secret)) {
  throw new Error(
    'AI_WIDGET_GATEWAY_SECRET must contain 32-512 safe bytes.',
  );
}

const contents = [
  '# ROSPARK AI widget production gateway. Keep mode 600.',
  `AI_WIDGET_GATEWAY_SECRET='${secret}'`,
  'AI_WIDGET_GATEWAY_MODE=production',
  '',
].join('\n');
const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
const temporaryPath = `${targetPath}.tmp-${process.pid}`;

if (targetExisted) {
  backupPath = `${targetPath}.before-${timestamp}-${process.pid}`;
  copyFileSync(targetPath, backupPath);
  chmodSync(backupPath, 0o600);
}

let descriptor;
try {
  descriptor = openSync(temporaryPath, 'wx', 0o600);
  writeFileSync(descriptor, contents, { encoding: 'utf8' });
  closeSync(descriptor);
  descriptor = undefined;
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, targetPath);
  chmodSync(targetPath, 0o600);
} catch (error) {
  if (descriptor !== undefined) closeSync(descriptor);
  try {
    unlinkSync(temporaryPath);
  } catch (cleanupError) {
    if (cleanupError?.code !== 'ENOENT') throw cleanupError;
  }
  throw error;
}

process.stdout.write(`${JSON.stringify({
  targetPath,
  created: !targetExisted,
  backupPath,
  generatedSecret: !suppliedSecret && !currentSecret,
  runtimeMode: 'production',
})}\n`);
