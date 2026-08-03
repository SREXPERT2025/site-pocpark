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

const targetPath = process.env.LANDING_ENV_FILE?.trim();
if (!targetPath || !path.isAbsolute(targetPath)) {
  throw new Error('LANDING_ENV_FILE must be an absolute path.');
}
const targetStat = lstatSync(targetPath);
if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
  throw new Error('LANDING_ENV_FILE must be a regular non-symlink file.');
}

function existingValue(contents, key) {
  const match = contents.match(
    new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.+?)\\s*$`, 'm'),
  );
  if (!match) return '';
  const value = match[1].trim();
  if (value.length >= 2 && value[0] === value.at(-1) && ['"', "'"].includes(value[0])) {
    return value.slice(1, -1);
  }
  return value;
}

const current = readFileSync(targetPath, 'utf8');
const requiredCurrent = new Map([
  ['LEAD_REGISTRY_ENABLED', 'true'],
  ['LEAD_OUTBOX_PROCESSING_ENABLED', 'true'],
  ['AI_WIDGET_ENABLED', 'true'],
  ['AI_WIDGET_RUNTIME_MODE', 'production'],
  ['AI_WIDGET_HANDOFF_MODE', 'live'],
]);
for (const [key, expected] of requiredCurrent) {
  if (existingValue(current, key) !== expected) {
    throw new Error(`${key} must already be ${expected}.`);
  }
}

const values = new Map([
  ['ROSPARK_LANDING_RUNTIME_MODE', 'production'],
  ['ROSPARK_LANDING_INDEXABLE', 'false'],
  ['NEXT_PUBLIC_GOOGLE_ANALYTICS_ID', 'G-3Z9KNN3MMK'],
  ['NEXT_PUBLIC_YANDEX_METRIKA_ID', '110980303'],
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
  '# Approved ROSPARK advertising landings.',
  ...Array.from(values, ([key, value]) => `${key}=${value}`),
  '',
].join('\n');
const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
const backupPath = `${targetPath}.before-landing-release-${timestamp}-${process.pid}`;
const temporaryPath = `${targetPath}.landing-release-${process.pid}.tmp`;

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
  updatedKeys: Array.from(values.keys()),
  indexable: false,
})}\n`);

