# Owner Canary V4 — rollback contract

Status: production candidate; no production execution authorized.

## Normal automatic rollback

After any failure following the canary mutation:

1. stop normal acceptance and disable the owner-canary flag first;
2. perform at most one PM2 restart for the rollback phase;
3. wait through the canonical readiness contract;
4. prove the exact Site SHA remains active;
5. prove `AI_CORE_OWNER_CANARY_ENABLED=false`;
6. prove public HTTPS 200 and normal visitor legacy routing;
7. retain diagnostic evidence;
8. leave Gateway A and Site Foundation B unchanged.

Rollback never restores a backup containing `Owner Canary=true`. A failed
rollback is reported as a distinct critical result and never as `attempted` or
successful.

## Manual disable

The canonical deactivation script sources the same portable metadata and
readiness library. If the flag is already off it does not restart; it only
proves readiness. If the flag is on it changes the flag to false, restarts PM2
once and waits for the same readiness predicates.

## Emergency boundary

Emergency rollback is allowed only after a proven failure of the canonical
rollback. It must still be checksum verified, canary-scoped and must not change
Gateway A, Site Foundation B, the model, prompts, public routing or databases.

## Locking

Activation/disable uses one non-blocking lock. Existing live, unrelated,
corrupt or stale metadata fails closed and is not automatically removed. The
lock is released only after accepted activation or verified rollback/disable.

