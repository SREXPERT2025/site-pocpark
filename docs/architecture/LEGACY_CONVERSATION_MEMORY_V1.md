# Legacy Conversation Memory V1

Status: local candidate; production deployment is not authorized.

## Scope and isolation

This change applies only to the Legacy AI Widget path in `POCPARK_SITE_AI`.
It does not change Agent Pilot Runtime, owner-canary eligibility, Frozen AI Core,
public routing, models, or knowledge content.

Memory is scoped by the existing server-issued widget `session_id`. There is no
cross-session or cross-customer lookup. OpenClaw and Active Memory are not used.

## Confirmed root cause

The audit of the exact production Site base and the running local production
Legacy Gateway confirmed the following:

- the browser request contract accepts at most 12 messages;
- the widget sends `.slice(-12)`;
- the Gateway builds model history from `messages[:-1][-10:]` and appends the
  current question separately;
- the durable SQLite transcript retention is seven days;
- the server did not reconstruct Legacy context from that transcript;
- browser reload retained `session_id`, but not the displayed message history;
- the production Legacy process runs `qwen3.6:27b` with `num_ctx=32000`;
- 52 recent production Qwen telemetry rows used 8,318-9,148 prompt tokens.

The active production Gateway source before this candidate had SHA-256
`1aceca1866491cfc9bb4d1b98945de4dcab7b5f451b539f08fb4d20041325e9f`,
which exactly matched the Gateway source at Site base
`8dc1a7601e45374b5fa958ff09fb00ff174a76ab`.

Therefore the current bottleneck is context assembly, not the model's context
window: facts beyond the recent browser window, and nearly all facts after a
reload, never reached the Legacy model despite remaining in SQLite.

## Architecture

For each Legacy turn, the Site now performs this bounded server-side pipeline:

1. Read the full raw transcript for exactly one `session_id` from
   `ai_widget_turns`.
2. Rebuild a deterministic structured snapshot from direct user statements.
3. Persist that derived snapshot separately in `ai_widget_legacy_memory`, with
   the same expiry as the raw conversation.
4. Send the Legacy Gateway:
   - the latest 12 raw user/assistant messages, including the current query;
   - the structured rolling memory;
   - full-transcript turn count and SHA-256 provenance metadata.
5. The Gateway keeps its bounded ten-message history plus current-query
   contract and adds the confirmed structured memory to the current model
   prompt.

The complete transcript is the durable source and rebuild input. It is not
duplicated unbounded into every model prompt; doing that would duplicate the
recent window and make latency/context size grow without limit. This preserves
the requested full-transcript architecture while keeping model input bounded.

The browser separately retains the latest 20 display messages in
`sessionStorage`, namespaced by `session_id`, so a normal reload restores the
visible dialogue. The server transcript remains authoritative for model
context.

## Rolling-memory contract

Only deterministic facts directly stated by the user are stored as confirmed:

- object type;
- parking capacity and daily traffic as distinct fields;
- entrances and exits;
- user segments;
- identification preferences;
- payment and payment amount;
- current system / new build and modernization intent;
- integrations;
- budget;
- active requirements;
- objections;
- assistant questions already asked;
- sales stage.

Every fact contains `sourceTurnId`, a bounded source excerpt,
`provenance=direct_user`, and `confidence=confirmed`. A later direct correction
marks the old fact `superseded` and links it to the correcting turn. Only active
facts are sent to the Gateway. Ambiguous bare vehicle counts are not typed as
capacity or daily traffic.

Memory input is schema-validated and size-limited by the Gateway. Raw user
snippets inside memory are explicitly treated as visitor data, not system
instructions.

## Storage and retention

Raw and derived data stay separate:

- raw transcript: existing `ai_widget_sessions` / `ai_widget_turns`;
- derived memory: new `ai_widget_legacy_memory` table;
- browser display cache: versioned `sessionStorage` key scoped by session ID.

The memory row uses a foreign key with cascade deletion and the same session
expiry. Existing cleanup deletes expired memory before expired turns/sessions.

## Verification

Deterministic local coverage includes:

- 10-, 20-, and 30-turn conversations;
- long sales dialogue and facts outside the recent window;
- browser reload storage restoration;
- numeric and boolean correction/supersede;
- repeated-question memory;
- capacity versus daily-traffic disambiguation;
- ambiguous bare count fail-closed behavior;
- negative A-to-B session isolation;
- SQLite migration, persistence, expiry integration;
- Gateway schema validation and model-prompt propagation.

The rolling-memory rebuild benchmark is under 1 ms for a 30-turn dialogue on
the development host (500-run microbenchmark). A real local-Qwen paired test is
also required before handoff and records prompt tokens, answer quality, and
wall latency for baseline versus candidate.

### Local acceptance evidence — 2026-09-04

- deterministic 10/20/30-turn, long-dialogue, reload-storage,
  correction/supersede, known-question, disambiguation and A-to-B isolation
  suite: PASS;
- rolling-memory rebuild: approximately 0.34 ms per 30-turn dialogue;
- Gateway contract/model-prompt tests: 48/48 PASS;
- AI Trace Viewer regression: 21/21 PASS;
- AI Widget customer UX regression: 29/29 PASS;
- Site typecheck and lint: PASS;
- immutable production build with Next.js webpack: PASS (112/112 static pages);
- real browser reload on the built local Site: question and completed answer
  both restored after a full reload;
- no Agent Pilot/Trace Viewer runtime-file diff from the production base.

Real local `qwen3.6:27b` paired result using identical recent messages:

- baseline without rolling memory: quality 2/12, 8,553 prompt tokens,
  TTFT 13,181 ms, total 17,834 ms;
- candidate with compact rolling memory: quality 12/12, 8,675 prompt tokens,
  TTFT 13,810 ms, total 23,706 ms;
- impact: +122 prompt tokens, +629 ms TTFT and +5,872 ms total wall time;
- the longer total is attributable mainly to a useful 121-token answer versus
  the baseline's incorrect 58-token "no parameters supplied" answer;
- the corrected capacity 450 was recalled, and superseded value 300 was absent.

## Deployment handoff (not executed)

A separately owner-approved deployment must use a clean immutable Site commit
and coordinate both pieces from that same commit:

1. Back up the production Site environment and
   `/var/lib/rospark-ai-widget/dialogs.sqlite`.
2. Fresh-extract/build the exact Site commit and run migrations.
3. Switch the local Legacy Gateway to the exact candidate Gateway script.
4. Activate the exact Site build without changing public or owner routing.
5. Verify migration 5, session-isolated memory rows, headers, Legacy recall at
   10/20/30 turns, reload, and a real browser dialogue.
6. Confirm public remains Legacy and the existing Agent Pilot Runtime SHA and
   owner-canary state are unchanged.

Rollback restores the Site build and Legacy Gateway script from base
`8dc1a7601e45374b5fa958ff09fb00ff174a76ab`. Migration 5 is additive and may
remain; the old code does not read the new table. No production action is part
of this candidate stage.
