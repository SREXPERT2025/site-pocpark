import assert from 'node:assert/strict';
import {
  assertOwnerCanaryEnv,
  updateOwnerCanaryEnv,
} from './configure_owner_ai_canary_env.mjs';

const base = [
  'AI_CORE_OWNER_CANARY_ENABLED=false',
  'AI_CORE_OWNER_CANARY_URL=https://gateway.example.ts.net',
  `AI_CORE_OWNER_CANARY_SECRET=${'s'.repeat(32)}`,
  `AI_CORE_OWNER_CANARY_COOKIE_KEY=${'c'.repeat(32)}`,
  `AI_CORE_IDENTITY_HMAC_KEY=${'i'.repeat(32)}`,
  `AI_CORE_OWNER_CANARY_SITE_SHA=${'a'.repeat(40)}`,
  'UNCHANGED=value',
  '',
].join('\n');
const enabled = updateOwnerCanaryEnv(base, true);
assert.match(enabled, /AI_CORE_OWNER_CANARY_ENABLED=true/);
assert.match(enabled, /AI_CORE_OWNER_CANARY_RUNTIME_SHA=32afc91b3358c115ae03fc3d20db96fef5e0fbfe/);
assert.match(enabled, /AI_CORE_OWNER_CANARY_CONTRACT_SHA=4d75773d60f3453279cbfcee1453f54b15b66567/);
assert.match(enabled, /OWNER_CANARY_PUBLIC_ORIGIN=https:\/\/www\.xn--80aukedde\.xn--p1ai/);
assert.doesNotMatch(enabled, /AI_CORE_OWNER_CANARY_SITE_SHA=/);
assert.match(enabled, /UNCHANGED=value/);
const disabled = updateOwnerCanaryEnv(enabled, false);
assert.doesNotThrow(() => assertOwnerCanaryEnv(enabled, true));
assert.doesNotThrow(() => assertOwnerCanaryEnv(disabled, false));
assert.throws(() => assertOwnerCanaryEnv(base, false), /CONFIGURATOR_OUTPUT_MISSING/);
assert.match(disabled, /AI_CORE_OWNER_CANARY_ENABLED=false/);
assert.equal((disabled.match(/AI_CORE_OWNER_CANARY_ENABLED=/g) ?? []).length, 1);
assert.equal((disabled.match(/OWNER_CANARY_PUBLIC_ORIGIN=/g) ?? []).length, 1);
assert.throws(() => updateOwnerCanaryEnv(
  'AI_CORE_OWNER_CANARY_ENABLED=false\nAI_CORE_OWNER_CANARY_ENABLED=false\n',
  false,
), /DUPLICATE/);
assert.throws(() => updateOwnerCanaryEnv(
  'OWNER_CANARY_PUBLIC_ORIGIN=https://wrong.example\n'
    + 'OWNER_CANARY_PUBLIC_ORIGIN=https://wrong.example\n',
  false,
), /DUPLICATE/);
assert.throws(() => updateOwnerCanaryEnv(
  'AI_CORE_OWNER_CANARY_ENABLED=false\n', true,
), /REQUIRED_CONFIG_INVALID/);
console.log('owner canary env config tests: ok');
