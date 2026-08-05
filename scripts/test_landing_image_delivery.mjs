import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagePath = path.resolve('app/puzzle2/page.tsx');
const pageSource = readFileSync(pagePath, 'utf8');
const nextImageCount = (pageSource.match(/<Image\b/g) ?? []).length;
const unoptimizedCount = (pageSource.match(/\bunoptimized\b/g) ?? []).length;

assert.ok(nextImageCount >= 9, 'puzzle2 must keep its Next Image components');
assert.equal(
  unoptimizedCount,
  0,
  'puzzle2 must use responsive Next Image delivery instead of unoptimized originals',
);

console.log(
  JSON.stringify({
    status: 'ok',
    page: '/parkovka-pod-klyuch',
    nextImageCount,
    unoptimizedCount,
  }),
);
