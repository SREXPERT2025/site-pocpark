import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const bundlePath = path.resolve('public/parkovka-assets/app.js');
const bundle = readFileSync(bundlePath, 'utf8');
const rasterPattern = /\/parkovka-assets\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g)/gi;
const rasterAssets = [...new Set(bundle.match(rasterPattern) ?? [])].sort();

assert.ok(rasterAssets.length > 0, 'parkovka bundle has no raster assets');
assert.deepEqual(
  rasterAssets.filter((asset) => /\.(?:png|jpe?g)$/i.test(asset)),
  [],
  'parkovka bundle must reference WebP instead of PNG or JPEG',
);

let totalBytes = 0;
for (const asset of rasterAssets) {
  const assetPath = path.resolve('public', asset.slice(1));
  assert.equal(existsSync(assetPath), true, `${asset} is missing`);
  const bytes = statSync(assetPath).size;
  assert.ok(bytes <= 250_000, `${asset} is too large: ${bytes} bytes`);
  totalBytes += bytes;
}

assert.ok(
  totalBytes <= 2_000_000,
  `parkovka raster payload is too large: ${totalBytes} bytes`,
);

console.log(
  JSON.stringify({
    status: 'ok',
    rasterAssets: rasterAssets.length,
    totalBytes,
  }),
);
