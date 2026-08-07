import assert from 'node:assert/strict';
import { updateOwnerCanaryEnv } from './configure_owner_ai_canary_env.mjs';

const base = [
  'AI_CORE_OWNER_CANARY_ENABLED=false',
  'AI_CORE_OWNER_CANARY_URL=https://gateway.example.ts.net',
  `AI_CORE_OWNER_CANARY_SECRET=${'s'.repeat(32)}`,
  `AI_CORE_OWNER_CANARY_COOKIE_KEY=${'c'.repeat(32)}`,
  `AI_CORE_IDENTITY_HMAC_KEY=${'i'.repeat(32)}`,
  'UNCHANGED=value',
  '',
].join('\n');
const enabled = updateOwnerCanaryEnv(base, true);
assert.match(enabled, /AI_CORE_OWNER_CANARY_ENABLED=true/);
assert.match(enabled, /AI_CORE_OWNER_CANARY_RUNTIME_SHA=5713258de76d4aa689baf30eae016df54cd8d579/);
assert.match(enabled, /AI_CORE_OWNER_CANARY_CONTRACT_SHA=8834367e7412656b5a83d0c01b05dbffae6d3dee/);
assert.match(enabled, /UNCHANGED=value/);
const disabled = updateOwnerCanaryEnv(enabled, false);
assert.match(disabled, /AI_CORE_OWNER_CANARY_ENABLED=false/);
assert.equal((disabled.match(/AI_CORE_OWNER_CANARY_ENABLED=/g) ?? []).length, 1);
assert.throws(() => updateOwnerCanaryEnv(
  'AI_CORE_OWNER_CANARY_ENABLED=false\nAI_CORE_OWNER_CANARY_ENABLED=false\n',
  false,
), /DUPLICATE/);
assert.throws(() => updateOwnerCanaryEnv(
  'AI_CORE_OWNER_CANARY_ENABLED=false\n', true,
), /REQUIRED_CONFIG_INVALID/);
console.log('owner canary env config tests: ok');
