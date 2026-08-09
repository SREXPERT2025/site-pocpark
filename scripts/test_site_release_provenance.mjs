import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evaluateSiteReleaseProvenance,
  requireOwnerCanarySiteRelease,
} from '../app/lib/site-release-provenance.ts';

const deployed = '55c3162efc08e25e29f95b57f6120e1e27e5031f';
const stale = '283841cfafbb71133fff8347d2f5e8f724bfcaac';

const current = evaluateSiteReleaseProvenance({
  actualDeployedSiteSha: deployed,
  configuredOwnerSiteSha: null,
});
assert.equal(current.ready, true);
assert.equal(current.reportedSiteSha, deployed);
assert.equal(requireOwnerCanarySiteRelease({
  actualDeployedSiteSha: deployed,
  configuredOwnerSiteSha: deployed,
}), deployed);

const mismatch = evaluateSiteReleaseProvenance({
  actualDeployedSiteSha: deployed,
  configuredOwnerSiteSha: stale,
});
assert.equal(mismatch.ready, false);
assert.equal(mismatch.reasonCode, 'SITE_RELEASE_SHA_MISMATCH');
assert.throws(() => requireOwnerCanarySiteRelease({
  actualDeployedSiteSha: deployed,
  configuredOwnerSiteSha: stale,
}), /SITE_RELEASE_SHA_MISMATCH/);

assert.equal(evaluateSiteReleaseProvenance({
  actualDeployedSiteSha: 'main',
}).reasonCode, 'SITE_RELEASE_SHA_INVALID');

const nextConfig = readFileSync(
  new URL('../next.config.js', import.meta.url),
  'utf8',
);
assert.match(nextConfig, /git'\s*,\s*\['rev-parse', '--verify', 'HEAD\^\{commit\}'\]/);
assert.match(nextConfig, /ROSPARK_DEPLOYED_SITE_SHA: deployedSiteSha/);
assert.doesNotMatch(nextConfig, /latest|rev-parse[^\n]*--short/);

console.log('site release provenance tests: ok; current=pass; stale=fail_closed');
