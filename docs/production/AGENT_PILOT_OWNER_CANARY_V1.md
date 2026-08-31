# Agent Pilot Optimized Runtime Freeze + Owner Canary V1

## Frozen runtime

- Agent Pilot SHA: `abb48a11b4437be55deb5c99a4af2421f1bfa997`.
- Execution: sequential.
- Low-Risk Direct Path: enabled.
- Knowledge Call Elimination: enabled.
- Models, inherited defaults, prompts, Critic, evidence rules and authorization
  boundaries are unchanged from the frozen Agent Pilot commit.
- The Site bridge imports an immutable detached worktree at the exact SHA and
  refuses to start when the SHA differs or tracked files are dirty.

## Audience and routing

Normal visitors always use the existing Legacy gateway.  The Pilot route is
selected only after the Site verifies the signed, expiring owner cookie and the
server-side `AGENT_PILOT_OWNER_CANARY_ENABLED=true` flag.

The browser never receives the Pilot service credential.  The Site calls the
authenticated Mac Studio bridge.  The bridge validates the expected Runtime
SHA before each turn.

## Exact fallback

Any of the following sends the same request to the existing Legacy gateway:

- canary flag disabled;
- invalid Pilot configuration;
- timeout or unavailable bridge;
- non-2xx response;
- Runtime SHA mismatch;
- malformed response;
- internal Pilot fallback.

An unsuccessful Pilot turn is rolled back from Pilot conversation state before
the Legacy response is published.  The Site annotates owner-only responses with
`X-Agent-Pilot-Fallback: true`; it does not return the Pilot error text.

## Owner trace

The append-only host trace is stored at:

`~/Library/Application Support/ROSPARK/agent-pilot-owner-canary/traces/owner-turns.jsonl`

Each turn records latency, actual role calls, Critic/reconsideration use,
fallback state, selected evidence metadata/excerpts and the final answer.  It
does not store credentials, system prompts or private reasoning.

## Local service

- LaunchAgent: `ai.pocpark.agent-pilot-owner-canary`.
- Local bind: `127.0.0.1:8791`.
- Tailscale route: `/agent-pilot`.
- Health response exposes the exact Runtime SHA and frozen optimization flags;
  it requires the service Bearer secret.

## Release gates

Before owner activation:

1. Agent Pilot deterministic matrix passes.
2. Retrieval oracle passes with zero missing approved source.
3. Authorization tests pass.
4. Widget and production build pass.
5. Public-with-flag, owner-success, flag-off, upstream-error and Runtime-mismatch
   routing pass through the HTTP harness.
6. Public AI Core remains disabled.
7. A rollback build and environment backup are retained on the VPS.

Public rollout is not part of this release.
