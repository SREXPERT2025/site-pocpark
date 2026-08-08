# Public AI Core Cutover Preparation V1

Status: prepared offline; production cutover is not authorized.

## Scope

- Owner Canary remains implemented but is not in the public release critical path.
- `AI_CORE_OWNER_CANARY_ENABLED=false` remains the required baseline.
- `AI_CORE_PUBLIC_ENABLED=false` sends every ordinary visitor to the existing
  legacy route.
- `AI_CORE_PUBLIC_ENABLED=true` sends ordinary generative turns to the exact AI
  Core Runtime and Contract pinned below.
- Gateway Foundation A remains unchanged and its boundary stays `shadow_only`.
- Site Foundation B remains active and unchanged.

Exact dependencies:

- Runtime SHA: `5713258de76d4aa689baf30eae016df54cd8d579`
- Contract SHA: `8834367e7412656b5a83d0c01b05dbffae6d3dee`
- Gateway A SHA: `e0b4edd34d5fecaf8850e64aa03a33c2661b51f9`
- Executor: Qwen `qwen3.6:27b`; no Codex or second model is enabled.

## Proven Ubuntu defect

The exact safe error object produced during the failed Ubuntu probe was:

```json
{
  "contract_version": "1.0",
  "success": false,
  "request_id": "req_qwen_001",
  "error": {
    "code": "VALIDATION_ERROR",
    "category": "validation",
    "retryable": false,
    "safe_message_code": "VALIDATION_ERROR",
    "stage": "validation"
  },
  "trace_id": "trace:qwen:001"
}
```

It is validated against the immutable Runtime schema
`generated/contracts/AI_CORE_SITE_CONTRACT_V1/error-envelope-v1.schema.json`.
With Ajv available the object is valid and the invalid field is `null`.

The failure was not JSON ordering, locale, encoding, nullable fields, enum
values, `request_id`, `retryable`, `details`, `timestamp`, or unknown
`additionalProperties`. The Runtime invokes its Node schema validator from an
archive extracted under a temporary directory. On Ubuntu that subprocess could
not resolve `require('ajv')` from the Site installation. The immutable Runtime's
development fallback pointed to a Mac-only workspace path, so validation
returned `validator_unavailable`. While converting that result into the safe
error above, the same unavailable validator was invoked again and raised
`RuntimeError: safe_error_envelope_invalid`.

Pre-fix evidence from the exact validator process:

```text
Error: Cannot find module 'ajv'
```

Local passing environment: macOS, Node 22.23.1, Python 3.14.5. Ubuntu staging
acceptance environment: Ubuntu 24.04, Node 22.23.2, Python 3.12.3. The
environment difference was module resolution, not a contract-data difference.

## Minimal correction

Ajv 6.15.0 is now a direct production dependency of the Site. Before loading
the immutable Runtime, the Site bridge verifies
`node_modules/ajv/package.json`, prepends the resolved Site `node_modules` to
`NODE_PATH`, and fails closed if the dependency is absent. Runtime code,
Contract schema, Decision Package, evaluator, Response Repair, Qwen prompt,
Gateway A, and Site Foundation B were not changed.

## Public routing and state

The public route reuses canonical Contract V1 identity and durable state:

- stable `conversation_thread_id`, immutable per-turn `message_id`, and
  composite idempotency;
- confirmed facts, candidate facts, conflicts, active question, asked
  questions, preferences, state version, and last mutation acknowledgement;
- exact Runtime and Contract pins on every request and acknowledgement;
- route evidence stored with planned route, actual route, safe fallback reason,
  state versions, response hash, and component versions.

`AI_CORE_PUBLIC_ENABLED=false` is the release default and rollback action.

## Initial release fallback policy

Before any AI Core project-state mutation, exactly one legacy request is
allowed only for an explicitly tagged transport failure:

- HTTP 502, 503, or 504 from the AI Core transport;
- transport timeout;
- transport unavailable.

The trace records:

```text
planned_route=ai_core
actual_route=legacy
fallback_reason=<safe transport code>
```

Contract errors, schema errors, state conflicts, evaluator rejection,
programming errors, and any failure after mutation do not fall back. They fail
visible. This prevents two answers and double project-state mutation.

## Offline acceptance

The clean Ubuntu staging gate covers, without a real model request:

1. valid AI Core response;
2. schema-valid safe error envelope;
3. malformed request;
4. unavailable exact Runtime;
5. Contract validation error;
6. deterministic engineering request;
7. mutation acknowledgement;
8. duplicate/idempotent request;
9. ordinary visitor through OFF, ON, hard-transport-fallback, and rollback OFF.

The HTTP harness also requires one terminal Site B event, zero duplicate
answers, zero duplicate mutations, and Owner Canary OFF.

## Future owner-approved production gate

The activation package must verify checksums and the exact target, acquire a
single-flight lock, install the Site with the public flag OFF, wait for stable
local and public readiness, run only deterministic acceptance, then enable the
public flag and repeat readiness. A real Qwen public smoke is a separate owner
approval. Rollback changes only `AI_CORE_PUBLIC_ENABLED=false`, restarts Site in
the controlled release procedure, verifies public health and legacy routing,
and does not roll back Gateway A or Site Foundation B.
