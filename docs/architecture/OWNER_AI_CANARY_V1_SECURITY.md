# Owner AI Canary V1 — Security

## Authentication

Authentication is POST-only and same-origin. The submitted owner credential is
compared in constant time and is never placed in a URL, cookie payload, response
or log. A successful login produces a signed opaque cookie:

- name: `__Host-rospark-owner-ai-canary`;
- `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`;
- versioned payload with issued time, expiry and random session ID;
- maximum lifetime 24 hours.

The signing key and credential must each contain at least 32 bytes. Missing or
weak configuration fails closed.

## Revocation and logout

Logout is POST-only and same-origin. A valid session ID is added to the Site
revocation store before the browser cookie is cleared. If durable revocation
cannot be confirmed, logout returns a visible 503 while still clearing the local
cookie; it does not falsely claim successful revocation.

Changing `AI_CORE_OWNER_CANARY_SESSION_VERSION` revokes all older cookies.
Turning the feature flag off immediately routes every request through legacy.

## Audience isolation

- Default flag: `AI_CORE_OWNER_CANARY_ENABLED=false`.
- No cookie, expired/revoked/forged cookie, or flag off: legacy.
- Valid cookie plus flag on: owner canary only.
- Owner core/state error: explicit error, no legacy fallback.
- Owner marker is supplied only by the authenticated server response and is not
  present in public static client markup.

## Data minimization

HMAC-derived IDs are non-PII correlation references. State and telemetry avoid
credentials, cookies, contacts and full message bodies. Page context remains an
unconfirmed hint. Runtime SHA and package hashes support provenance without
exposing configuration secrets.

## Operational boundary

This candidate neither reads nor changes production configuration. It does not
connect runtime `a9066e`, execute Qwen/Codex, activate the migration, create a
lead, send MAX, mutate CRM, push or deploy.
