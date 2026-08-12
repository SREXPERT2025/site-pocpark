# AI_TRACE_VIEWER_V1

This additive observability contour captures structured input/output evidence
around the unchanged AI Core business contract. `AI_CORE_RUNTIME_TRACE_V1`
travels outside `response-v1`; the Site validates it, adds Site publication and
durable-mutation evidence, sanitizes it, and stores `AI_TRACE_VIEWER_V1`.

Security and retention:

- full trace payloads are available to the `director` permission only for 14 days;
- immutable aggregate metadata is retained for 90 days;
- owner annotations are append-only records separate from execution evidence;
- no public trace route exists;
- cookie, credential, token, API-key, raw environment, and hidden-reasoning
  fields are redacted or rejected;
- no chain-of-thought is requested or captured;
- storage and composition failures are fail-open relative to a valid customer
  response, while existing business-critical gates remain fail-closed.

The trace entity is keyed by turn, request, thread, and message identities. It
supports published, blocked, and pre-Runtime failures. Historical turns created
before this schema report trace unavailable instead of affecting the customer
path.
