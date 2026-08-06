import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getAllContentMeta, getContentBySlug } from '../lib/content-parser.ts';

const expectedArticleDates = new Map([
  ['avtomatizaciya-parkovki-torgovogo-centra', '2026-07-06'],
  ['ispravlenie-oshibok-oplaty-parkovki', '2026-07-06'],
  ['iz-chego-sostoit-parkovochnaya-sistema', '2026-07-06'],
  ['kak-vybrat-sistemu-avtomatizacii-parkovki', '2026-07-06'],
  ['parkovka-biznes-centra-arendatory-gosti-limity', '2026-07-06'],
  ['onlain-oplata-parkovki-kak-vnedrit', '2026-07-08'],
  ['oshibki-vnedreniya-parkovochnoj-sistemy', '2026-07-08'],
  ['parkovka-zhilogo-kompleksa-rezidenty-gosti-podryadchiki', '2026-07-08'],
  ['raspoznavanie-nomerov-dlya-parkovki', '2026-07-08'],
  ['gostevoy-dostup-na-parkovku', '2026-07-26'],
  ['oplata-parkovki-gostey', '2026-07-26'],
  ['otchetnost-vladelca-parkovki', '2026-07-26'],
]);

const articles = getAllContentMeta('stati');
assert.equal(articles.length, expectedArticleDates.size);
for (const article of articles) {
  assert.equal(article.datePublished, expectedArticleDates.get(article.slug), article.slug);
}

const priorityCases = [
  'elektronika-na-presne',
  'amaks-otel-kazan',
  'arktika',
  'burgas-sochi',
  'gorizont-rostov',
  'poklonka-place',
  'spar-saransk',
  'w-plaza',
  'elma-kuryanovo',
  'mosflim',
  'plazma-murmansk',
];

for (const slug of priorityCases) {
  const item = getContentBySlug('keysy', slug);
  assert.ok(item, slug);
  assert.ok(item.customer, `${slug}: customer`);
  assert.ok(item.city, `${slug}: city`);
  assert.ok(item.region, `${slug}: region`);
  assert.ok(item.objectType, `${slug}: objectType`);
  assert.ok(item.equipment?.length, `${slug}: equipment`);
  assert.equal(item.datePublished, undefined, `${slug}: unverified publication date must be omitted`);
  assert.equal(item.lastModified, undefined, `${slug}: unverified modification date must be omitted`);
}

assert.equal(getContentBySlug('keysy', 'gorizont-rostov')?.metrics?.[0]?.value, '400-500');
assert.equal(getContentBySlug('keysy', 'w-plaza')?.metrics?.[0]?.value, '500-600 (проектная нагрузка)');
assert.equal(getContentBySlug('keysy', 'mosflim')?.metrics?.[0]?.value, '200-300');

const elmaSource = fs.readFileSync(path.join(process.cwd(), 'content/keysy/elma-kuryanovo.md'), 'utf8');
assert.doesNotMatch(elmaSource, /воровств/i);
assert.doesNotMatch(elmaSource, /терминал для наличной и безналичной/i);

const articleSchemaSource = fs.readFileSync(
  path.join(process.cwd(), 'app/components/content/ArticleJsonLd.tsx'),
  'utf8'
);
assert.match(articleSchemaSource, /datePublished/);
assert.match(articleSchemaSource, /Команда РОСПАРК/);
assert.match(articleSchemaSource, /ООО «СР Эксперт»/);
assert.match(articleSchemaSource, /\/logo\.png/);

const organizationSchemaSource = fs.readFileSync(
  path.join(process.cwd(), 'app/components/content/OrganizationJsonLd.tsx'),
  'utf8'
);
assert.match(organizationSchemaSource, /\/logo\.png/);
assert.doesNotMatch(organizationSchemaSource, /sameAs/);

console.log('GEO content package checks passed');
