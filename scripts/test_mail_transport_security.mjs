import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mailModules = ['lib/leads.ts', 'lib/leads2.ts'];

for (const modulePath of mailModules) {
  const source = await readFile(new URL(`../${modulePath}`, import.meta.url), 'utf8');
  const transport = source.match(/nodemailer\.createTransport\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';

  assert.match(
    transport,
    /disableFileAccess:\s*true/u,
    `${modulePath}: SMTP transport must disable file access`,
  );
  assert.match(
    transport,
    /disableUrlAccess:\s*true/u,
    `${modulePath}: SMTP transport must disable URL access`,
  );
}

console.log('ok');
