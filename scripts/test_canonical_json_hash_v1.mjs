import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  CANONICALIZATION_VERSION,
  CanonicalizationError,
  canonicalJson,
  canonicalSha256,
} from '../app/lib/canonical-json-hash-v1.ts';
import {
  AI_CORE_CONTRACT_VERSION,
  buildPublicAiCoreRequest,
  validateDecisionPackageHash,
  validateOwnerCanaryCoreResponse,
} from '../app/lib/owner-ai-canary-adapter.ts';
import {
  applyOwnerCanaryMutationBatch,
  ensureOwnerCanaryThread,
  registerOwnerCanaryMessage,
  runOwnerAiCanaryMigrations,
} from '../app/lib/owner-ai-canary-state.ts';

const root = new URL('../release/ai-core-canonical-json-hash-v1/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('RELEASE_MANIFEST.json', root), 'utf8'));
const corpus = JSON.parse(readFileSync(
  new URL('canonical-json-hash-v1-golden.json', root), 'utf8',
));
const incident = JSON.parse(readFileSync(
  new URL('failed-live-decision-package.json', root), 'utf8',
));
const fileSha256 = (relative) => createHash('sha256')
  .update(readFileSync(new URL(relative, root))).digest('hex');
assert.equal(manifest.canonicalization_version, CANONICALIZATION_VERSION);
assert.equal(
  fileSha256('canonical-json-hash-v1-golden.json'),
  manifest.shared_golden_corpus.sha256,
);
assert.equal(
  fileSha256('failed-live-decision-package.json'),
  manifest.incident_regression.sha256,
);
assert.equal(
  fileSha256('ai-core-runtime-20afd06ba703338541cf65ab167f3b218af09699.tar.gz'),
  manifest.runtime_archive.sha256,
);

assert.equal(corpus.canonicalization_version, CANONICALIZATION_VERSION);
for (const vector of corpus.valid_vectors) {
  const value = JSON.parse(vector.semantic_json);
  assert.equal(canonicalJson(value), vector.expected_canonical_utf8, vector.id);
  assert.equal(canonicalSha256(value), vector.expected_sha256, vector.id);
}
const rejected = new Map([
  ['NaN', Number.NaN],
  ['Infinity', Number.POSITIVE_INFINITY],
  ['-Infinity', Number.NEGATIVE_INFINITY],
  ['9007199254740992', 9007199254740992],
  ['unpaired_high_surrogate', '\ud800'],
]);
for (const vector of corpus.rejection_vectors) {
  assert.throws(
    () => canonicalJson(rejected.get(vector.runtime_value)),
    (error) => error instanceof CanonicalizationError
      && error.message === vector.expected_error,
    vector.id,
  );
}

assert.equal(incident.integral_float_count, 57);
assert.equal(
  canonicalSha256(incident.decision_package),
  incident.expected_canonical_sha256,
);

const conversationThreadId = 'thread_canonical_hash_v1_0001';
const messageId = 'message_canonical_hash_v1_0001';
const state = {
  conversationThreadId,
  stateVersion: 0,
  confirmedProjectFacts: [],
  candidateFacts: [],
  conflicts: [],
  activeQuestion: null,
  askedQuestions: [],
  conversationPreferences: {},
  lastMutationAcknowledgement: null,
};
const request = buildPublicAiCoreRequest({
  aiCoreRequestId: 'aicore_canonical_hash_v1_0001',
  conversationThreadId,
  messageId,
  currentMessage: 'Что выбрать: номера, карты или билеты?',
  sourcePage: '/',
  recentMessages: [],
  state,
  siteRelease: 'cdf244d034e4a76a9de3cd43cc5f61a3a7dce9f9',
  gatewayRelease: 'e0b4edd34d5fecaf8850e64aa03a33c2661b51f9',
  sentAt: '2026-08-08T17:24:00.000Z',
  dryRun: true,
});
assert.equal(request.contract_version, AI_CORE_CONTRACT_VERSION);
assert.equal(request.canonicalization_version, CANONICALIZATION_VERSION);

const runtime = spawnSync(
  'python3', ['scripts/run_owner_ai_core_deterministic_contract_probe.py'],
  { input: JSON.stringify(request), encoding: 'utf8' },
);
assert.equal(runtime.status, 0, runtime.stderr);
const transported = JSON.parse(runtime.stdout);
const runtimeDecisionPackage = validateDecisionPackageHash(
  transported.response,
);
assert.equal(
  transported.response.decision_package_hash,
  incident.expected_canonical_sha256,
);
assert.deepEqual(runtimeDecisionPackage, incident.decision_package);
assert.equal(
  transported.response.telemetry.canonicalization_version,
  CANONICALIZATION_VERSION,
);

// The real deterministic Runtime fixture is intentionally evaluation-blocked
// for an unknown project. Preserve its package and mutation proposals while
// exercising the Site publication-envelope acceptance independently.
const acceptedFixture = structuredClone(transported);
acceptedFixture.response.evaluation_result.status = 'pass';
acceptedFixture.response.evaluation_result.reason_codes = [];
acceptedFixture.response.telemetry.evaluation.final_status = 'pass';
acceptedFixture.response.telemetry.publication.candidate_status = 'allowed';
const accepted = validateOwnerCanaryCoreResponse(acceptedFixture, request);

const db = new Database(':memory:');
runOwnerAiCanaryMigrations(db);
ensureOwnerCanaryThread(db, {
  conversationThreadId,
  siteSessionId: 'session_canonical_hash_v1_0001',
});
registerOwnerCanaryMessage(db, {
  conversationThreadId,
  messageId,
  siteTurnId: 'turn_canonical_hash_v1_0001',
  requestPayload: { currentMessage: request.payload.current_message },
});
const mutations = accepted.response.state_mutations;
assert.ok(Array.isArray(mutations) && mutations.length > 0);
const applied = applyOwnerCanaryMutationBatch(db, {
  conversationThreadId,
  messageId,
  requestId: request.request_id,
  responseId: accepted.response.response_id,
  mutations,
  nowMs: Date.UTC(2026, 7, 8, 17, 24, 1),
});
assert.equal(applied.accepted, true);
assert.equal(applied.acknowledgement.contract_version, AI_CORE_CONTRACT_VERSION);
assert.equal(
  applied.acknowledgement.canonicalization_version,
  CANONICALIZATION_VERSION,
);

const ack = spawnSync(
  'python3', ['scripts/run_ai_core_canonical_hash_v1_ack_probe.py'],
  {
    input: JSON.stringify({ request, acknowledgement: applied.acknowledgement }),
    encoding: 'utf8',
  },
);
assert.equal(ack.status, 0, ack.stderr);
const acknowledgement = JSON.parse(ack.stdout);
assert.equal(acknowledgement.accepted, true);
assert.equal(
  acknowledgement.canonicalization_version,
  CANONICALIZATION_VERSION,
);

const mismatch = structuredClone(transported);
mismatch.response.decision_package_hash = '0'.repeat(64);
assert.throws(
  () => validateDecisionPackageHash(mismatch.response),
  /DECISION_PACKAGE_HASH_MISMATCH/,
);
const unsupported = structuredClone(transported);
unsupported.canonicalization_version = 'CANONICAL_JSON_HASH_V2';
assert.throws(
  () => validateOwnerCanaryCoreResponse(unsupported, request),
  /CANONICALIZATION_VERSION_UNSUPPORTED/,
);
const unsupportedResponse = structuredClone(transported.response);
unsupportedResponse.canonicalization_version = 'CANONICAL_JSON_HASH_V2';
assert.throws(
  () => validateDecisionPackageHash(unsupportedResponse),
  /CANONICALIZATION_VERSION_UNSUPPORTED/,
);
const canonicalizerFailure = structuredClone(transported.response);
canonicalizerFailure.decision_package = { value: Number.NaN };
assert.throws(
  () => validateDecisionPackageHash(canonicalizerFailure),
  /CANONICAL_JSON_NON_FINITE_NUMBER/,
);
db.close();

console.log(JSON.stringify({
  canonicalization_version: CANONICALIZATION_VERSION,
  golden_vectors: corpus.valid_vectors.length,
  rejection_vectors: corpus.rejection_vectors.length,
  incident_hash: incident.expected_canonical_sha256,
  runtime_hash: accepted.response.decision_package_hash,
  site_hash: canonicalSha256(accepted.response.decision_package),
  mutation_acknowledgement: 'pass',
  response_envelope: 'pass',
  model_requests: 0,
  result: 'pass',
}));
