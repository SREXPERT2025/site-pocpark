#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "release/owner-ai-canary-v114/RELEASE_MANIFEST.json"


def sha(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["activation_authorized"] is False
    assert manifest["owner_canary_default_enabled"] is False
    assert manifest["runtime_sha"] == "5713258de76d4aa689baf30eae016df54cd8d579"
    assert manifest["contract_sha"] == "8834367e7412656b5a83d0c01b05dbffae6d3dee"
    assert manifest["executor"] == {
        "planned": "qwen",
        "model": "qwen3.6:27b",
        "allowed": ["qwen"],
        "fallbacks": 0,
    }
    for item in manifest["artifacts"].values():
        path = ROOT / item["path"]
        assert path.is_file() and not path.is_symlink(), item["path"]
        assert sha(path) == item["sha256"], item["path"]
    assert manifest["production_evidence"] == {
        "model_requests": 0,
        "public_behavior_changes": 0,
        "owner_canary_enabled": False,
        "lead_max_crm_mutations": 0,
    }
    print("owner ai canary release manifest: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
