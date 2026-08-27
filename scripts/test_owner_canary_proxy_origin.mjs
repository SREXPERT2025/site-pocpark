import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ownerCanaryOriginFailureStatus,
  validateOwnerCanaryOrigin,
} from '../app/lib/owner-canary-origin.ts';
import {
  clearOwnerCanaryCookieHeader,
  issueOwnerCanarySession,
  ownerCanaryCookieHeader,
  selectOwnerCanaryAudience,
  verifyOwnerCanarySession,
} from '../app/lib/owner-ai-canary-core.ts';
import {
  AI_CORE_CONTRACT_SHA,
  AI_CORE_RUNTIME_SHA,
} from '../app/lib/owner-ai-canary-adapter.ts';
import { CANONICALIZATION_VERSION } from '../app/lib/canonical-json-hash-v1.ts';
import { updateOwnerCanaryEnv } from './configure_owner_ai_canary_env.mjs';

const publicOrigin = 'https://www.xn--80aukedde.xn--p1ai';
const env = {
  OWNER_CANARY_PUBLIC_ORIGIN: publicOrigin,
  AI_CORE_OWNER_CANARY_ENABLED: 'true',
  AI_CORE_OWNER_CANARY_CREDENTIAL: 'credential-owner-canary-0000000000000001',
  AI_CORE_OWNER_CANARY_COOKIE_KEY: 'cookie-owner-canary-key-000000000000001',
  AI_CORE_OWNER_CANARY_SESSION_VERSION: 'v1',
};
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function headers(values = {}) {
  return new Headers({
    origin: publicOrigin,
    host: 'www.xn--80aukedde.xn--p1ai',
    'x-forwarded-proto': 'https',
    ...values,
  });
}

function decision(values = {}, customEnv = env) {
  return validateOwnerCanaryOrigin({
    headers: headers(values),
    env: customEnv,
  });
}

function denied(reason, values = {}, customEnv = env) {
  const result = decision(values, customEnv);
  check(result.allowed === false && result.reason === reason, reason);
}

check(decision().allowed, 'exact production Origin passes');
check(decision({
  origin: 'https://www.xn--80aukedde.xn--p1ai:443',
  host: 'www.xn--80aukedde.xn--p1ai:443',
}).allowed, 'default HTTPS port normalizes');
check(decision({
  'x-forwarded-host': 'www.xn--80aukedde.xn--p1ai',
}).allowed, 'canonical forwarded host passes');
check(validateOwnerCanaryOrigin({
  headers: headers(), env,
}).canonicalOrigin === publicOrigin, 'internal upstream URL is not authoritative');

denied('OWNER_PUBLIC_ORIGIN_CONFIG_INVALID', {}, {
  ...env, OWNER_CANARY_PUBLIC_ORIGIN: undefined,
});
denied('OWNER_PUBLIC_ORIGIN_CONFIG_INVALID', {}, {
  ...env, OWNER_CANARY_PUBLIC_ORIGIN: 'http://www.xn--80aukedde.xn--p1ai',
});
denied('OWNER_PUBLIC_ORIGIN_CONFIG_INVALID', {}, {
  ...env, OWNER_CANARY_PUBLIC_ORIGIN: `${publicOrigin}/owner`,
});
denied('OWNER_ORIGIN_MISSING', { origin: '' });
denied('OWNER_ORIGIN_NULL', { origin: 'null' });
denied('OWNER_ORIGIN_MISMATCH', { origin: 'https://evil.example' });
denied('OWNER_ORIGIN_MISMATCH', {
  origin: 'https://owner.www.xn--80aukedde.xn--p1ai',
});
denied('OWNER_ORIGIN_MISMATCH', {
  origin: 'https://www.xn--80aukedde.xn--p1ai.evil.example',
});
denied('OWNER_ORIGIN_MISMATCH', {
  origin: 'https://evil-www.xn--80aukedde.xn--p1ai',
});
denied('OWNER_ORIGIN_SCHEME_MISMATCH', {
  origin: 'http://www.xn--80aukedde.xn--p1ai',
});
denied('OWNER_ORIGIN_MISMATCH', {
  origin: 'https://www.xn--80aukedde.xn--p1ai:444',
});
denied('OWNER_ORIGIN_AMBIGUOUS', {
  origin: `${publicOrigin}, https://evil.example`,
});
denied('OWNER_ORIGIN_INVALID', { origin: `${publicOrigin}/path` });
denied('OWNER_HOST_MISSING', { host: '' });
denied('OWNER_HOST_MISMATCH', { host: 'evil.example' });
denied('OWNER_HOST_AMBIGUOUS', {
  host: 'www.xn--80aukedde.xn--p1ai,evil.example',
});
denied('OWNER_FORWARDED_HOST_MISMATCH', {
  'x-forwarded-host': 'evil.example',
});
denied('OWNER_FORWARDED_HOST_AMBIGUOUS', {
  'x-forwarded-host': 'www.xn--80aukedde.xn--p1ai,evil.example',
});
denied('OWNER_FORWARDED_PROTO_MISSING', {
  'x-forwarded-proto': '',
});
denied('OWNER_FORWARDED_PROTO_MISMATCH', {
  'x-forwarded-proto': 'http',
});
denied('OWNER_FORWARDED_PROTO_AMBIGUOUS', {
  'x-forwarded-proto': 'https,http',
});

const confusedHeaders = {
  get(name) {
    const values = {
      origin: publicOrigin,
      host: 'www.xn--80aukedde.xn--p1ai',
      'x-forwarded-proto': 'https\r\nX-Forwarded-Host: evil.example',
    };
    return values[name.toLowerCase()] ?? null;
  },
};
const confused = validateOwnerCanaryOrigin({
  headers: confusedHeaders,
  env,
});
check(
  !confused.allowed
    && confused.reason === 'OWNER_HEADER_CONTROL_CHARACTER',
  'CRLF/header confusion fails closed',
);
check(
  ownerCanaryOriginFailureStatus('OWNER_PUBLIC_ORIGIN_CONFIG_INVALID') === 503
    && ownerCanaryOriginFailureStatus('OWNER_ORIGIN_MISMATCH') === 403,
  'config and request failures have distinct statuses',
);

const nowMs = 1_786_248_000_000;
const issued = issueOwnerCanarySession({
  credential: env.AI_CORE_OWNER_CANARY_CREDENTIAL,
  env,
  nowMs,
  ttlSeconds: 600,
  idFactory: () => 'owner-origin-test-session-0001',
});
check(Boolean(verifyOwnerCanarySession({
  token: issued.token, env, nowMs,
})), 'legitimate signed owner session verifies');
check(verifyOwnerCanarySession({
  token: `${issued.token}forged`, env, nowMs,
}) === null, 'forged owner cookie rejected');
check(verifyOwnerCanarySession({
  token: issued.token, env, nowMs: nowMs + 601_000,
}) === null, 'expired owner cookie rejected');
check(selectOwnerCanaryAudience({
  cookieToken: issued.token, env, nowMs,
}).audience === 'owner_canary', 'valid owner selects AI Core audience');
check(selectOwnerCanaryAudience({
  cookieToken: null, env, nowMs,
}).audience === 'legacy', 'normal visitor stays legacy');
check(selectOwnerCanaryAudience({
  cookieToken: issued.token,
  env,
  nowMs,
  isRevoked: () => true,
}).audience === 'legacy', 'revoked/logout session stays legacy');

const cookie = ownerCanaryCookieHeader(issued.token, issued.ttlSeconds);
check(
  cookie.includes('HttpOnly')
    && cookie.includes('Secure')
    && cookie.includes('SameSite=Strict')
    && !cookie.includes(env.AI_CORE_OWNER_CANARY_CREDENTIAL),
  'owner cookie flags unchanged and credential absent',
);
check(
  clearOwnerCanaryCookieHeader().includes('Max-Age=0')
    && clearOwnerCanaryCookieHeader().includes('SameSite=Strict'),
  'logout clears the strict secure cookie',
);

const updatedEnv = updateOwnerCanaryEnv([
  'AI_CORE_OWNER_CANARY_ENABLED=false',
  'AI_CORE_OWNER_CANARY_URL=https://gateway.example.ts.net',
  `AI_CORE_OWNER_CANARY_SECRET=${'s'.repeat(32)}`,
  `AI_CORE_OWNER_CANARY_COOKIE_KEY=${'c'.repeat(32)}`,
  `AI_CORE_IDENTITY_HMAC_KEY=${'i'.repeat(32)}`,
  '',
].join('\n'), true);
check(
  updatedEnv.includes(`OWNER_CANARY_PUBLIC_ORIGIN=${publicOrigin}`),
  'release config pins the canonical public Origin',
);

for (const route of ['login', 'status', 'logout']) {
  const source = readFileSync(
    new URL(`../app/api/ai-widget/owner-canary/${route}/route.ts`, import.meta.url),
    'utf8',
  );
  check(source.includes('validateOwnerCanaryOrigin'), `${route} uses shared Origin gate`);
  check(!source.includes('new URL(request.url).origin'), `${route} ignores internal upstream Origin`);
}

const apiSource = readFileSync(
  new URL('../app/lib/ai-widget-api.ts', import.meta.url), 'utf8',
);
check(
  apiSource.includes('Legacy-маршрут не использован')
    && apiSource.includes("aiCoreAudience === 'owner_canary'"),
  'owner AI Core failure still has no silent legacy fallback',
);
check(
  AI_CORE_RUNTIME_SHA === '651738a5db1a748fa252d5df4f6df3e843ef1f92',
  'Runtime exact pin unchanged',
);
check(
  AI_CORE_CONTRACT_SHA === '4d75773d60f3453279cbfcee1453f54b15b66567',
  'Contract exact pin unchanged',
);
check(
  CANONICALIZATION_VERSION === 'CANONICAL_JSON_HASH_V1',
  'canonicalization version unchanged',
);

console.log([
  'owner canary proxy-aware origin tests: ok',
  `assertions=${assertions}`,
  'legitimate_origin=pass',
  'nginx_proxy_fixture=pass',
  'forged_forwarded_headers=pass',
  'cookie_security=pass',
  'routing_invariants=pass',
  'model_requests=0',
].join('; '));
