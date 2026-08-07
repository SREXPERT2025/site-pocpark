# Owner AI Canary Runtime V1.1.4 — release candidate

Date: 2026-08-07  
Status: prepared offline; production activation forbidden  
Default: `AI_CORE_OWNER_CANARY_ENABLED=false`

## Frozen dependencies

- AI Core Runtime: `5713258de76d4aa689baf30eae016df54cd8d579`.
- Contract V1: `8834367e7412656b5a83d0c01b05dbffae6d3dee`.
- Owner Canary foundation: `2f5560909d31aa9df732cab74f269c0259c15529`.
- Gateway A remains active independently; this release does not change its
  route order or `shadow_only` semantics.
- Executor: only `qwen3.6:27b`; Codex and model fallback are forbidden.

The Runtime is delivered as a deterministic archive. Its directory name is
the full Runtime SHA. `AI_CORE_RUNTIME_RELEASE_MANIFEST.json` contains a SHA-256
for every included file. The gateway refuses a symlink, shortened/mutable path,
wrong manifest, wrong file hash, wrong Contract SHA, wrong Runtime version, or
an import resolved outside that immutable directory.

## Routing and failure semantics

With the flag off, owner authentication is not evaluated and every request
continues through the pre-existing legacy route. With the flag on, only a valid
signed, unexpired and non-revoked owner cookie selects `owner_ai_core`.

The owner route is:

`Site request -> Contract 1.0 -> exact Runtime -> Qwen -> deterministic repair
-> evaluation -> Site mutation batch -> mutation acknowledgement -> Site B
terminal event -> visible owner response`.

Any transport, pin, schema, state-version, mutation-ack, evaluation,
publication or evidence-write failure is visible to the owner as a safe test
error. It records Site B `answer_error` and never silently invokes legacy Qwen.
Ordinary visitors remain on `/v1/chat`.

## Identity and durable state

- one HMAC-derived `conversation_thread_id` per Site session;
- one immutable HMAC-derived `message_id` per Site turn;
- composite idempotency tuple:
  `(conversation_thread_id, message_id, idempotency_key)`;
- durable owner history (maximum 20 messages sent to Runtime), not the legacy
  browser window of 12 messages;
- confirmed facts, candidate hints, conflicts, active question, asked
  questions, preferences, state version and last acknowledgement remain
  separate;
- landing/demo/article/UI context is always an unconfirmed intent hint;
- a mutation batch is checked against one expected state version, applied in
  one SQLite transaction and advances the state version exactly once;
- version conflict fails closed.

Telemetry records the exact Runtime SHA on every owner turn together with raw
status, repair applied, final status, blocking reason codes, executor trace,
component versions, state versions and the linked Site B terminal event.

## Offline acceptance

No model was called. Deterministic checks cover:

- exact Runtime archive and all file hashes;
- Contract request built by Site and processed by the packaged Runtime;
- response correlation and immutable Decision Package hash;
- stable identity and composite idempotency;
- durable history/state and atomic mutation acknowledgement;
- version conflict;
- Site B `turn_accepted`, `answer_completed` and error-source wiring;
- signed owner auth, forged-cookie rejection, expiry, revocation/logout source;
- Qwen-only executor trace, final evaluation/publication gate;
- visible owner marker and no silent legacy fallback;
- existing 47 gateway tests, 66 Context Gate tests and legacy Site tests.

## Activation boundary

This commit is only a release candidate. Preparing/deploying the immutable
Runtime and Site candidate must leave the flag false. A separate owner approval
is required to run `activate_owner_ai_canary_for_owner_live_test.sh` with the
exact final Site SHA. The script rechecks Site cleanliness, exact pins,
authenticated gateway health and the immutable Runtime/Contract evidence before
changing only the canary flag.

`deactivate_owner_ai_canary.sh` changes only that flag back to false. It does
not roll back Gateway A, Site Foundation B, the Site release, or diagnostic
evidence.
