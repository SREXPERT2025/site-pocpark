import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const component = fs.readFileSync(path.join(root, 'app/components/landing/Hero.tsx'), 'utf8');
const config = fs.readFileSync(path.join(root, 'next.config.js'), 'utf8');
const assetPath = path.join(root, 'public/hero-v2-20260805.mp4');

assert.ok(fs.existsSync(assetPath), 'versioned hero video must exist');
assert.ok(fs.statSync(assetPath).size <= 2 * 1024 * 1024, 'hero video must stay within 2 MiB');
assert.match(component, /src="\/hero-v2-20260805\.mp4"/);
assert.match(component, /preload="metadata"/);
assert.doesNotMatch(component, /src="\/hero\.mp4"/);
assert.match(config, /source: '\/hero-v2-20260805\.mp4'/);
assert.match(config, /public, max-age=31536000, immutable/);

console.log('home hero media checks passed');
