#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "release/public-ai-core-v1"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ordered(source: str, *needles: str) -> None:
    positions = [source.index(value) for value in needles]
    assert positions == sorted(positions), (needles, positions)


def main() -> int:
    manifest = json.loads((PACKAGE / "RELEASE_MANIFEST.json").read_text())
    activation_path = PACKAGE / "PUBLIC_AI_CORE_ACTIVATION_SCRIPT"
    rollback_path = PACKAGE / "PUBLIC_AI_CORE_ROLLBACK_SCRIPT"
    activation = activation_path.read_text()
    rollback = rollback_path.read_text()

    assert manifest["activation_authorized"] is False
    assert manifest["production_mutation"] == 0
    assert manifest["site_target_sha"] == (
        "cdf244d034e4a76a9de3cd43cc5f61a3a7dce9f9"
    )
    assert manifest["runtime_sha"] == (
        "5713258de76d4aa689baf30eae016df54cd8d579"
    )
    assert manifest["contract_sha"] == (
        "8834367e7412656b5a83d0c01b05dbffae6d3dee"
    )
    for artifact in manifest["artifacts"].values():
        path = ROOT / artifact["path"]
        assert path.is_file(), path
        assert sha256(path) == artifact["sha256"], path

    for path in (activation_path, rollback_path):
        subprocess.run(["bash", "-n", str(path)], check=True)

    ordered(
        activation,
        "ACTIVATION_CHECKSUM_MISMATCH",
        "[FETCH AND VERIFY EXACT TARGET — READ ONLY]",
        "owner_v4_acquire_lock",
        "[BASELINE PREFLIGHT — NO MUTATION]",
        "[BACKUP AFTER SINGLE-FLIGHT LOCK]",
        "[STAGE EXACT TARGET — PUBLIC FLAG OFF]",
        "[TARGET CUTOVER — PUBLIC FLAG OFF]",
        "[ENABLE PUBLIC AI CORE — NO SYNTHETIC MODEL REQUEST]",
        "configure_public_ai_core_env.mjs\" \"$ENV_FILE\" true",
    )
    assert activation.index("MUTATION_STARTED=1") < activation.index(
        'configure_public_ai_core_env.mjs" "$ENV_FILE" true'
    )
    assert activation.index("AI_CORE_OWNER_CANARY_ENABLED false") < (
        activation.index("[TARGET CUTOVER — PUBLIC FLAG OFF]")
    )
    assert "/api/ai-widget/chat" not in activation
    assert "ollama run" not in activation.lower()
    assert "codex exec" not in activation.lower()
    assert 'configure_public_ai_core_env.mjs" "$ENV_FILE" false' in rollback
    assert "pm2 restart rospark-site --update-env" in rollback
    assert "/api/ai-widget/chat" not in rollback
    assert activation.count("owner_v4_acquire_lock") == 1
    assert rollback.count("owner_v4_acquire_lock") == 1
    assert "AI_CORE_PUBLIC_ENABLED=false" in rollback
    assert "GATEWAY_A_ROLLBACK=0" in rollback
    assert "SITE_FOUNDATION_B_ROLLBACK=0" in rollback

    print(
        "public AI Core release checks: ok; checksum_gate=pass; "
        "single_flight=pass; target_off_before_on=pass; "
        "rollback_off=pass; model_requests=0"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
