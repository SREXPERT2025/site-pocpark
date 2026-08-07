# Owner AI Canary V1 — Architecture

Status: offline release candidate. Production activation is not authorized.

## Fixed baselines

- Site Foundation B: `ec4172a10451c23b6e862e332d61217425261f9d`.
- Gateway Foundation A: `e0b4edd34d5fecaf8850e64aa03a33c2661b51f9`.
- AI Core Site Contract V1 dependency: `8834367e7412656b5a83d0c01b05dbffae6d3dee`.
- Approved future runtime reference: `a9066e`; it is not connected here.

This candidate combines the active Site B and Gateway A code lines and adds only
the owner-canary identity, transport, durable-state and security boundary. It
does not change the Fast Route Context Gate, Qwen, prompts, response repair,
Sales Controller, Evaluation Integrity or public routing.

## Routing boundary

1. Site validates its existing `sessionId` and `turnId`.
2. The gateway preserves both identifiers as transport/provenance fields.
3. With `AI_CORE_OWNER_CANARY_ENABLED` absent or not exactly `true`, all users
   follow the existing legacy route.
4. With the flag enabled, only a valid, non-expired, non-revoked owner cookie
   selects `owner_canary`.
5. The current candidate intentionally returns the visible
   `OWNER_AI_CORE_NOT_CONNECTED` error. It does not call AI Core and does not
   fall back to legacy.
6. Public users and invalid/forged cookies remain on the unchanged legacy path.

IDs never enter the legacy prompt, knowledge retrieval, boundary decision or
answer composition. Regression tests compare a deterministic legacy response
with and without the IDs.

## Prepared, not activated

- POST-only same-origin owner login and logout endpoints.
- Signed HttpOnly owner session cookie.
- HMAC mapping from Site identity to AI Core identity.
- An offline Site-owned SQLite migration for minimal conversation state.
- A contract adapter for future request/Decision Package validation.
- Idempotent proposal/apply/ack state mutation.
- Owner-only telemetry schema linked to the existing Site B terminal event.
- A marker rendered only after an authenticated canary response header.

The standard Site B migration runner does not call the canary migration. Thus a
build or ordinary server start cannot create these tables in production.

## Failure policy

Owner canary failures are explicit and terminal. State unavailability, identity
failure, an already-finalized legacy turn, a bad Decision Package hash, version
conflict, telemetry conflict, or logout revocation failure cannot silently
continue through legacy. Normal visitors are unaffected.

## Explicit non-goals

- No real AI Core request and no model request.
- No PotentialProject aggregate, Contact, Organization, Lead or Opportunity.
- No prompt, executor, Qwen, Gateway Context Gate or public UX changes.
- No lead, MAX or CRM mutation.
- No production migration, flag activation, push or deployment.

## Next owner gate

After code review, the next decision is whether to authorize a separate
checksum-verified release preparation. Runtime connection, production migration
and owner-canary activation each remain separately gated.
