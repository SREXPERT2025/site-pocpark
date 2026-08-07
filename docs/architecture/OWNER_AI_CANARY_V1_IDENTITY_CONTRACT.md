# Owner AI Canary V1 — Identity Contract

## Mapping

| Site value | Canary value | Derivation |
|---|---|---|
| `sessionId` | `conversation_thread_id` | `cth_v1_` + HMAC-SHA-256 |
| `turnId` plus thread ID | `message_id` | `msg_v1_` + HMAC-SHA-256 |

The secret is `AI_CORE_IDENTITY_HMAC_KEY` and must contain at least 32 bytes.
The same Site IDs and key always produce the same canary IDs; distinct turns in
one session keep the thread ID and receive distinct message IDs. Raw Site UUIDs
are not embedded in the derived public representation.

## Transport rules

- `sessionId` and `turnId` are optional for backward-compatible gateway input.
- When present, both must match the existing identifier grammar and length.
- Validation preserves them instead of rebuilding a payload that drops them.
- They are provenance and correlation fields only.
- They cannot select a legacy route, alter a prompt or change visible content.

## Semantic rules

Page, demo and article context is an intent hint. It never becomes a confirmed
project fact without client confirmation and a version-checked Site mutation.
No PII, contact details, owner credential or cookie material belongs in either
identifier.

## Idempotency

`message_id` is the request idempotency key. Reuse with an identical payload is
accepted as a duplicate; reuse with different content fails with
`IDEMPOTENCY_CONFLICT`. A turn finalized in legacy cannot later be returned as a
cached answer to an authenticated owner canary request.
