# Owner AI Canary V1 — State Contract

Status: migration definition prepared offline; not applied to production.

## Site-owned state

The minimal thread record contains:

- `conversation_thread_id` and `site_session_id`;
- `state_version`;
- confirmed project facts;
- candidate facts;
- conflicts;
- active question;
- asked questions;
- conversation preferences;
- last mutation acknowledgement;
- update timestamps.

This is deliberately not a full PotentialProject model. It contains no Contact,
Organization, Lead, Opportunity, channel identity or commercial outcome.

## Mutation protocol

1. AI Core may return an immutable Decision Package and a separate mutation
   proposal.
2. Site verifies the Decision Package SHA-256 and proposal schema.
3. Site compares `expected_state_version` with the durable current version.
4. On match, Site applies only allow-listed fields and increments the version.
5. On mismatch, Site stores a rejected acknowledgement without changing state.
6. Repeating the same `mutation_id` and proposal returns the stored ack.
7. Reusing a mutation ID with different content fails closed.
8. The conditional update must affect exactly one row or the transaction aborts.

The Decision Package itself is never rewritten by the Site adapter. The applied
state mutation and acknowledgement reference its hash.

## Telemetry contract

Owner telemetry records only after the Site turn exists and references its
terminal Site B event. Fields are:

- audience, conversation thread, message and Site turn IDs;
- AI Core request ID and contract version;
- runtime SHA and Decision Package hash;
- planned and final executor;
- evaluation and repair status;
- state version before and after;
- latency;
- Site terminal event reference.

Telemetry writes are idempotent per Site turn; conflicting evidence fails
closed. The schema does not store free-form messages, credentials or contacts.

## Migration isolation

`runOwnerAiCanaryMigrations` is a separate explicit function. It is not added to
the Site B production migration path. Applying it requires a later owner-approved
release and database backup procedure.
