import assert from 'node:assert/strict';

const baseUrl = new URL(process.env.SEO_CHECK_BASE_URL ?? 'http://127.0.0.1:3111');

async function get(pathOrUrl) {
  const url = new URL(pathOrUrl, baseUrl);
  const response = await fetch(url, { redirect: 'follow' });
  const body = await response.text();
  return { url, response, body };
}

const sitemapResult = await get('/sitemap.xml');
assert.equal(sitemapResult.response.status, 200, 'sitemap must return 200');

const sitemapUrls = Array.from(
  sitemapResult.body.matchAll(/<loc>(.*?)<\/loc>/g),
  (match) => match[1].replaceAll('&amp;', '&'),
);
assert.ok(sitemapUrls.length > 0, 'sitemap must contain public URLs');

const publicPaths = sitemapUrls.map((url) => new URL(url).pathname);
assert.equal(new Set(publicPaths).size, publicPaths.length, 'sitemap paths must be unique');

const internalTargets = new Set();
const descriptions = new Map();
const repeatedBrandTitles = [];

for (const path of publicPaths) {
  const page = await get(path);
  assert.equal(page.response.status, 200, `${path} must return 200`);

  const title = page.body.match(/<title>(.*?)<\/title>/i)?.[1] ?? '';
  assert.ok(title, `${path} must render a title`);
  if (/роспарк\s*(?:\||—|-)\s*роспарк/iu.test(title)) {
    repeatedBrandTitles.push([path, title]);
  }

  const canonical = page.body.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  )?.[1];
  assert.ok(canonical, `${path} must render a canonical`);
  assert.equal(new URL(canonical).pathname, path, `${path} canonical must be self-referential`);

  const robots = page.body.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  assert.ok(!robots?.toLowerCase().includes('noindex'), `${path} must not be noindex`);

  const description = page.body.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (description) {
    const paths = descriptions.get(description) ?? [];
    paths.push(path);
    descriptions.set(description, paths);
  }

  for (const match of page.body.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    const href = match[1];
    const target = new URL(href, baseUrl);
    if (target.origin === baseUrl.origin) internalTargets.add(target.pathname);
  }
}

assert.deepEqual(
  repeatedBrandTitles,
  [],
  `public titles must not contain an adjacent repeated brand: ${JSON.stringify(repeatedBrandTitles)}`,
);

const duplicateDescriptions = Array.from(descriptions.entries()).filter(
  ([, paths]) => paths.length > 1,
);
assert.deepEqual(
  duplicateDescriptions,
  [],
  `public meta descriptions must be unique: ${JSON.stringify(duplicateDescriptions)}`,
);

for (const path of internalTargets) {
  const target = await get(path);
  assert.ok(
    target.response.status >= 200 && target.response.status < 400,
    `internal target ${path} must resolve, got ${target.response.status}`,
  );
}

console.log(
  `built SEO release checks passed: sitemap=${publicPaths.length}, internal_targets=${internalTargets.size}`,
);
