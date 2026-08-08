# Owner Canary V4.1 — endpoint capability matrix

Status: offline wrapper candidate; production execution requires a separate
owner gate.

| Endpoint / check | Required on baseline `283841c` | Required on target `c74049b` before canary | Required after canary on | Expected status / invariant |
| --- | --- | --- | --- | --- |
| `GET /` through public Nginx | yes | yes | yes | HTTP 200 |
| `GET /api/ai-widget/status` | yes | yes | yes | HTTP 200; `runtimeMode=production`; `serverEventsEnabled=true` |
| authenticated Gateway `/health` | yes | yes | yes | HTTP 200; exact Runtime and Contract pins |
| `POST /api/ai-widget/owner-canary/login` with forged credential | yes | yes | yes | HTTP 403 |
| `GET /api/ai-widget/owner-canary/status`, no cookie | **no**; expected 404 and never called by wrapper | yes | yes | before canary: HTTP 200, `enabled=false`, `route=legacy`; after canary: HTTP 200, `enabled=true`, `route=legacy` |
| `GET /api/ai-widget/owner-canary/status`, forged cookie | no | no | yes | HTTP 401; `OWNER_AUTH_DENIED`; `route=legacy` |
| `GET /api/ai-widget/owner-canary/status`, expired signed cookie | no | no | yes | HTTP 401; `route=legacy` |
| `GET /api/ai-widget/owner-canary/status`, valid owner cookie | no | no | yes | HTTP 200; `route=ai_core`; exact Runtime and Contract; owner marker |
| `POST /api/ai-widget/owner-canary/logout` | no | no | yes | HTTP 200 |

## Ordering rule

Baseline acceptance ends without addressing any target-only endpoint. The
target owner-status capability is first probed only after all of the following
are true:

1. production Git HEAD is the exact target Site SHA;
2. target build and environment with canary off are installed;
3. PM2 has restarted once;
4. canonical readiness has observed the same PID and complete local/public
   health three times over at least two seconds.

If the target owner-status endpoint is still missing or returns anything other
than the expected 200/off/legacy envelope, activation fails before canary-on
and the automatic Site rollback restores the baseline. After baseline restore,
rollback uses only baseline-compatible evidence and never calls owner status.
