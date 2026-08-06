import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const robots = readFileSync('app/robots.ts', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');
const middleware = readFileSync('middleware.ts', 'utf8');

const crawlBlockedRoutes = [
  '/admin/',
  '/api/',
  '/parkovka/embed',
  '/quiz',
  '/demo/arendar/',
  '/demo/gostevaya-zayavka',
  '/demo/vladelec-parkovki',
  '/demo/web-skidki',
];

for (const route of crawlBlockedRoutes) {
  assert.ok(robots.includes(`'${route}'`), `${route} must be blocked in robots.txt`);
  assert.ok(!sitemap.includes(`absoluteUrl('${route}')`), `${route} must stay out of sitemap`);
}

for (const route of ['/proshche', '/puzzle', '/test2', '/v4-1', '/v4-2']) {
  assert.ok(middleware.includes(`'${route}'`), `${route} must remain preview-only`);
  assert.ok(!sitemap.includes(`absoluteUrl('${route}')`), `${route} must stay out of sitemap`);
}

assert.ok(
  sitemap.includes("absoluteUrl('/parkovka')"),
  '/parkovka must remain in sitemap',
);
assert.ok(
  sitemap.includes("absoluteUrl('/parkovka-pod-klyuch')"),
  '/parkovka-pod-klyuch must remain in sitemap',
);
assert.ok(
  middleware.includes("'/parkovka-pod-klyuch'"),
  '/puzzle2 must continue redirecting to the public turnkey landing',
);

console.log('technical SEO delivery checks passed');
