# Owner Canary V4 — canonical readiness contract

Status: production candidate; execution requires a separate owner gate.

## Predicates

One observation is successful only when all predicates hold:

1. `rospark-site` is `online` in PM2;
2. PM2 exposes a positive PID;
3. local `127.0.0.1:3000/api/ai-widget/status` returns 200 for the production
   Host and reports `runtimeMode=production` and `serverEventsEnabled=true`;
4. public HTTPS through Nginx returns 200;
5. the checked worktree HEAD equals the exact target Site SHA;
6. the same PID satisfies all predicates for three consecutive observations;
7. the stable observation span is at least 2,000 milliseconds.

The default deadline is 120 seconds measured with a monotonic clock. Polling
never performs a restart. Every poll logs timestamp, attempt, PM2 state/PID,
local and public status, SHA match, runtime metadata match, consecutive count
and stable span.

## Startup transients

Connection failure (`000`), 502 and 503 are `readiness_pending`. They reset the
consecutive pass counter but do not fail activation until the deadline.

401/403, another HTTP status, wrong Site SHA or a 200 response with wrong Site
runtime metadata are hard failures. Auth, checksum, route and pin checks are
outside the transient class and always fail closed.

## Two-phase use

- Phase A: exact Site target, canary off, full readiness.
- Phase B: exact Runtime/Contract health and deterministic Site↔Core tests,
  forged auth rejection, no model request.
- Phase C: set canary on, exactly one PM2 restart, full readiness again, then
  owner/legacy/forged/expired routing acceptance.

The same readiness function is used after canary disable and automatic
rollback.

