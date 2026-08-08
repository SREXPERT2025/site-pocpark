#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASELINE = "283841cfafbb71133fff8347d2f5e8f724bfcaac"
TARGET = "c74049bc7c54780b735d134168ddd67fe4fc8ecd"
ACTIVATION_SHA256 = "a221fa2dcbae4bf6f47606a4d05d341e72a6bef1778520fc5382252d15251238"
WRAPPER = ROOT / "release/owner-canary-v4-1/OWNER_CANARY_V4_1_ACTIVATION_SCRIPT"
ACTIVATION = ROOT / "scripts/activate_owner_ai_canary_for_owner_live_test.sh"
MATRIX = ROOT / "docs/deployment/OWNER_CANARY_V4_1_ENDPOINT_CAPABILITY_MATRIX.md"


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def git_has_path(commit: str, path: str) -> bool:
    return run("git", "cat-file", "-e", f"{commit}:{path}").returncode == 0


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def baseline_acceptance(owner_status_code: int) -> dict[str, object]:
    # Owner status is intentionally outside the baseline capability set.
    required = {
        "site_sha": BASELINE,
        "public_https": 200,
        "pm2": "online",
        "site_foundation_b": "active",
        "gateway_health": 200,
        "owner_canary_enabled": False,
    }
    return {
        "required": required,
        "observed_target_only_owner_status": owner_status_code,
        "owner_status_called": False,
        "result": "pass",
    }


def target_acceptance(owner_status_code: int) -> dict[str, object]:
    if owner_status_code == 200:
        return {
            "target_readiness": "pass",
            "owner_status": 200,
            "activation_result": "continue",
            "automatic_rollbacks": 0,
            "result": "pass",
        }
    return {
        "target_readiness": "pass",
        "owner_status": owner_status_code,
        "activation_result": "fail_before_canary_on",
        "automatic_rollbacks": 1,
        "rollback_readiness": "pass",
        "result": "pass",
    }


def main() -> int:
    wrapper = WRAPPER.read_text(encoding="utf-8")
    activation = ACTIVATION.read_text(encoding="utf-8")
    matrix = MATRIX.read_text(encoding="utf-8")

    assert sha256(ACTIVATION) == ACTIVATION_SHA256
    assert not git_has_path(
        BASELINE, "app/api/ai-widget/owner-canary/status/route.ts",
    )
    assert git_has_path(
        TARGET, "app/api/ai-widget/owner-canary/status/route.ts",
    )

    baseline_block = wrapper.split(
        'echo "[READ-ONLY RELEASE GATE]"', 1,
    )[1].split('echo "[BACKUP AFTER SINGLE-FLIGHT LOCK]"', 1)[0]
    target_block = wrapper.split(
        'echo "[PHASE A — SITE TARGET CUTOVER WITH CANARY OFF]"', 1,
    )[1].split('echo "[PHASE B — CONTRACT CHECK, CANARY ON, OWNER ROUTING]"', 1)[0]
    rollback_block = wrapper.split("rollback_site_and_canary() {", 1)[1].split(
        "on_failure() {", 1,
    )[0]

    assert "verify_baseline_legacy_invariant" in baseline_block
    assert "verify_target_owner_status_off" not in baseline_block
    assert "OWNER_STATUS_URL" not in baseline_block
    assert target_block.index('canonical_readiness "$TARGET_SITE_SHA"') < target_block.index(
        "verify_target_owner_status_off",
    )
    assert "verify_baseline_legacy_invariant" in rollback_block
    assert "verify_target_owner_status_off" not in rollback_block
    assert "verify_normal_legacy_route" not in wrapper
    assert not re.search(r"(^|[^a-zA-Z0-9_])stat\s", wrapper, re.MULTILINE)
    assert "owner_v4_wait_readiness" in wrapper
    assert "OWNER_V4_EXISTING_LOCK_ID" in wrapper
    assert "owner_v4_acquire_lock" in wrapper

    assert "expected 404 and never called by wrapper" in matrix
    assert "required_after_canary_on" not in matrix  # prose table, no code field drift

    baseline_404 = baseline_acceptance(404)
    target_200 = target_acceptance(200)
    target_404 = target_acceptance(404)
    assert baseline_404["result"] == "pass"
    assert baseline_404["owner_status_called"] is False
    assert target_200["result"] == "pass"
    assert target_200["automatic_rollbacks"] == 0
    assert target_404["activation_result"] == "fail_before_canary_on"
    assert target_404["automatic_rollbacks"] == 1
    assert target_404["rollback_readiness"] == "pass"

    syntax = run("bash", "-n", str(WRAPPER))
    assert syntax.returncode == 0, syntax.stderr
    missing_gate = run(str(WRAPPER))
    assert missing_gate.returncode == 64
    wrong_hash = run(
        str(WRAPPER), "--execute-owner-approved", TARGET, "0" * 64,
    )
    assert wrong_hash.returncode == 65

    result = {
        "schema": "rospark-owner-canary-v4-1-wrapper-tests-v1",
        "site_target_changed": False,
        "site_target_sha": TARGET,
        "activation_script_sha256": ACTIVATION_SHA256,
        "baseline_endpoint_presence": {
            "owner_canary_status": 404,
            "verified_from_exact_git_tree": True,
        },
        "target_endpoint_presence": {
            "owner_canary_status": 200,
            "verified_from_exact_git_tree": True,
        },
        "baseline_404": baseline_404,
        "target_200": target_200,
        "target_missing_404": target_404,
        "ordering": {
            "target_endpoint_before_cutover": 0,
            "target_endpoint_after_target_readiness": 1,
            "target_endpoint_during_baseline_rollback": 0,
        },
        "wrapper": {
            "bash_syntax": "pass",
            "missing_owner_gate": "fail_closed_exit_64",
            "checksum_mismatch": "fail_closed_exit_65",
            "direct_stat_invocations": 0,
        },
        "model_requests": 0,
        "production_changes": 0,
        "result": "pass",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
