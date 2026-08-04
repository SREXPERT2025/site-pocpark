import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const envPath = process.env.LANDING_ENV_FILE?.trim();
if (!envPath || !path.isAbsolute(envPath) || !existsSync(envPath)) {
  throw new Error('LANDING_ENV_FILE must point to the production env file.');
}

function value(contents, key) {
  const match = contents.match(
    new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.+?)\\s*$`, 'm'),
  );
  if (!match) return '';
  const raw = match[1].trim();
  return raw.length >= 2 && raw[0] === raw.at(-1)
    ? raw.slice(1, -1)
    : raw;
}

const env = readFileSync(envPath, 'utf8');
const expected = new Map([
  ['ROSPARK_LANDING_RUNTIME_MODE', 'production'],
  ['ROSPARK_LANDING_INDEXABLE', 'false'],
  ['NEXT_PUBLIC_GOOGLE_ANALYTICS_ID', 'G-3Z9KNN3MMK'],
  ['NEXT_PUBLIC_YANDEX_METRIKA_ID', '110980303'],
  ['LEAD_REGISTRY_ENABLED', 'true'],
  ['LEAD_OUTBOX_PROCESSING_ENABLED', 'true'],
  ['AI_WIDGET_ENABLED', 'true'],
  ['AI_WIDGET_RUNTIME_MODE', 'production'],
  ['AI_WIDGET_HANDOFF_MODE', 'live'],
]);
for (const [key, expectedValue] of expected) {
  assert.equal(value(env, key), expectedValue, `${key} mismatch`);
}

for (const requiredPath of [
  'app/parkovka/page.tsx',
  'app/parkovka/ParkovkaLeadModal.tsx',
  'app/puzzle2/page.tsx',
  'app/puzzle2/Puzzle2Experience.tsx',
  'app/parkovka-pod-klyuch/page.tsx',
  'app/parkovka-pod-klyuch/layout.tsx',
  'app/lib/ai-widget-links.ts',
]) {
  assert.equal(existsSync(path.resolve(requiredPath)), true, `${requiredPath} missing`);
}

process.stdout.write(`${JSON.stringify({
  status: 'ready',
  publicLandings: ['/parkovka', '/parkovka-pod-klyuch'],
  compatibilityRedirect: '/puzzle2 -> /parkovka-pod-klyuch',
  previewOnlyLandings: ['/proshche', '/puzzle', '/test2', '/v4-1', '/v4-2'],
  analytics: {
    google: 'G-3Z9KNN3MMK',
    yandex: '110980303',
  },
  forms: 'live-lead-registry',
  aiWidget: 'production-live',
  externalMessagesSentByCheck: 0,
})}\n`);
