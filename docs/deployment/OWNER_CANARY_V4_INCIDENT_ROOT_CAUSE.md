# Owner Canary V4 — incident root cause

Date: 2026-08-08  
Status: V3 closed fail-closed; V2/V3 must not be executed again  
Production baseline after recovery: Site `283841cfafbb71133fff8347d2f5e8f724bfcaac`, Owner Canary off, public HTTPS 200

## What happened

The V3 activation changed only the owner-canary flag and restarted the Site.
PM2 reported the replacement process as `online` before Next.js was ready to
serve through Nginx. The immediate public probe received a startup `502` and
the wrapper entered rollback.

The canonical deactivation script contained the same mixed BSD/GNU `stat`
expression as activation. On Ubuntu, GNU `stat -f` could emit output before the
fallback `stat -c` ran, so the combined command substitution did not equal
`600`. Automatic rollback therefore stopped before changing the flag. A
checksum-verified emergency procedure using a narrow GNU compatibility adapter
disabled the canary, restarted the Site once and proved public HTTPS 200.

## Proven causes

1. `PM2 online` was incorrectly treated as application readiness.
2. A single transient Nginx 502 caused premature activation failure.
3. Activation and rollback each carried an independent, platform-specific
   file-mode expression.
4. Rollback reported `attempted` without proving `Owner Canary=false` and full
   application readiness.

## V4 corrective boundary

- one portable file metadata helper is shared by activation and rollback;
- production-critical scripts contain no direct shell `stat` calls;
- readiness requires PM2 online, a stable PID, local application metadata,
  public HTTPS, exact Site SHA, three consecutive passes and at least two
  seconds of stable observations;
- connection refused, 502 and 503 are pending until the monotonic deadline;
- 401/403, wrong Site SHA, wrong runtime metadata and routing/auth violations
  fail closed immediately;
- normal failure uses the same tested rollback/readiness contract; emergency
  rollback remains last resort only.

No model, lead, MAX or CRM action is part of this incident remediation.

