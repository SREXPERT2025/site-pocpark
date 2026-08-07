# Owner AI Canary Runtime V1.1.4 — gated runbook

This runbook is documentation only. Nothing in it authorizes production
execution.

## Gate 1 — immutable candidate preparation (canary remains off)

1. Verify the Site candidate is a clean full 40-character commit based on
   foundation `2f5560909d31aa9df732cab74f269c0259c15529`.
2. Verify the deterministic Runtime archive checksum and extract it to a new
   directory whose basename is exactly
   `5713258de76d4aa689baf30eae016df54cd8d579`.
3. Verify every file against `AI_CORE_RUNTIME_RELEASE_MANIFEST.json`.
4. Back up the current production gateway release, wrapper, environment,
   launchd configuration, PID/path/listener/health evidence and Site env/DB.
5. Add only `AI_CORE_OWNER_RUNTIME_DIR=<immutable full-SHA path>` to the
   production gateway wrapper/config. Preserve port 8788, `--skip-warmup`,
   `qwen3.6:27b`, keep-alive, Gateway A `shadow_only` and preview 8787.
6. Deploy the Site candidate with all owner variables present but
   `AI_CORE_OWNER_CANARY_ENABLED=false`.
7. Restart/check the gateway and Site only within a separately approved
   rollback-aware release. Confirm `/health` reports the exact Runtime and
   Contract SHA. Do not send an owner message.
8. Compare a normal visitor deterministic request before/after: route,
   Gateway A behavior, legacy Qwen path and Site B lifecycle must be unchanged.

Kill criteria: wrong SHA/path/hash/model/port, preview change, Gateway A change,
Site B failure, ordinary visitor route change, model request, or any lead/MAX/
CRM mutation. Roll back only the candidate changes; retain evidence.

## Gate 2 — owner live test (not authorized by candidate preparation)

After exact owner approval, run the checksum-verified activation script with:

`activate_owner_ai_canary_for_owner_live_test.sh APP_DIR EXACT_SITE_SHA [ENV]`

It enables only the canary flag after authenticated health/pin checks. Then the
owner signs in and performs the separately specified live conversation. No
ordinary visitor is routed to AI Core.

## Deactivation

`deactivate_owner_ai_canary.sh APP_DIR EXACT_SITE_SHA [ENV]`

This explicitly returns owner sessions to legacy by turning the flag off. It
does not erase state or telemetry and does not roll back Gateway A or Site B.
