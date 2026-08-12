import assert from 'node:assert/strict';
import {
  assertPublicAiCoreEnv,
  updatePublicAiCoreEnv,
} from './configure_public_ai_core_env.mjs';

const base = [
  'AI_CORE_OWNER_CANARY_ENABLED=false',
  'AI_CORE_PUBLIC_ENABLED=false',
  'AI_CORE_PUBLIC_URL=https://gateway.example.ts.net',
  `AI_CORE_PUBLIC_SECRET=${'s'.repeat(32)}`,
  `AI_CORE_IDENTITY_HMAC_KEY=${'i'.repeat(32)}`,
  `AI_CORE_PUBLIC_SITE_SHA=${'a'.repeat(40)}`,
  `AI_CORE_PUBLIC_GATEWAY_SHA=${'b'.repeat(40)}`,
].join('\n');

const enabled = updatePublicAiCoreEnv(base, true);
assert.match(enabled, /AI_CORE_PUBLIC_ENABLED=true/);
assert.match(enabled, /AI_CORE_PUBLIC_RUNTIME_SHA=37efd4d17280e4f2781819a98d013d8909d2f750/);
assert.match(enabled, /AI_CORE_PUBLIC_CONTRACT_SHA=6cd71a5596346925ecdd2ffeb9d45262d881ee93/);
const disabled = updatePublicAiCoreEnv(enabled, false);
assert.doesNotThrow(() => assertPublicAiCoreEnv(enabled, true));
assert.doesNotThrow(() => assertPublicAiCoreEnv(disabled, false));
assert.throws(() => assertPublicAiCoreEnv(base, false), /CONFIGURATOR_OUTPUT_MISSING/);
assert.match(disabled, /AI_CORE_PUBLIC_ENABLED=false/);
assert.equal((disabled.match(/AI_CORE_PUBLIC_ENABLED=/g) ?? []).length, 1);
assert.throws(
  () => updatePublicAiCoreEnv(
    enabled.replace('AI_CORE_OWNER_CANARY_ENABLED=false',
      'AI_CORE_OWNER_CANARY_ENABLED=true'),
    true,
  ),
  /OWNER_CANARY_MUST_BE_OFF/,
);
assert.throws(
  () => updatePublicAiCoreEnv(
    `${base}\nAI_CORE_PUBLIC_ENABLED=false\n`,
    true,
  ),
  /DUPLICATE_AI_CORE_PUBLIC_ENABLED/,
);

console.log('public ai core env config tests: ok');
