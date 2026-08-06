import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getAllContentMeta, getContentBySlug } from '../lib/content-parser.ts';

const originalCwd = process.cwd();
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rospark-content-dates-'));

try {
  const contentDir = path.join(fixtureRoot, 'content', 'test');
  fs.mkdirSync(contentDir, { recursive: true });

  fs.writeFileSync(
    path.join(contentDir, 'without-date.md'),
    ['---', 'title: Without date', 'description: Test', '---', '', 'Body'].join('\n')
  );
  fs.writeFileSync(
    path.join(contentDir, 'with-date.md'),
    [
      '---',
      'title: With date',
      'description: Test',
      'datePublished: 2026-07-26',
      'lastModified: 2026-08-05',
      '---',
      '',
      'Body',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(contentDir, 'with-invalid-date.md'),
    [
      '---',
      'title: Invalid date',
      'description: Test',
      'lastModified: definitely-not-a-date',
      '---',
      '',
      'Body',
    ].join('\n')
  );

  process.chdir(fixtureRoot);

  const metaBySlug = new Map(getAllContentMeta('test').map((item) => [item.slug, item]));
  assert.equal(metaBySlug.get('without-date')?.lastModified, undefined);
  assert.equal(metaBySlug.get('without-date')?.datePublished, undefined);
  assert.equal(metaBySlug.get('with-date')?.lastModified, '2026-08-05');
  assert.equal(metaBySlug.get('with-date')?.datePublished, '2026-07-26');
  assert.equal(metaBySlug.get('with-invalid-date')?.lastModified, undefined);

  assert.equal(getContentBySlug('test', 'without-date')?.lastModified, undefined);
  assert.equal(getContentBySlug('test', 'without-date')?.datePublished, undefined);
  assert.equal(getContentBySlug('test', 'with-date')?.lastModified, '2026-08-05');
  assert.equal(getContentBySlug('test', 'with-date')?.datePublished, '2026-07-26');
  assert.equal(getContentBySlug('test', 'with-invalid-date')?.lastModified, undefined);
} finally {
  process.chdir(originalCwd);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('content editorial date checks passed');
