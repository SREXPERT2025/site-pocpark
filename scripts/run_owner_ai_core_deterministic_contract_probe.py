#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ai_core_owner_runtime_bridge import RUNTIME_SHA, OwnerRuntimeBridge  # noqa: E402


def main() -> int:
    fixed_answer = None
    if len(sys.argv) > 1:
        if len(sys.argv) != 3 or sys.argv[1] != "--fixed-answer":
            raise SystemExit(
                "usage: run_owner_ai_core_deterministic_contract_probe.py "
                "[--fixed-answer ANSWER]"
            )
        fixed_answer = sys.argv[2]
    request = json.load(sys.stdin)
    artifact = ROOT / "release/ai-core-runtime-77e4c478" / (
        f"ai-core-runtime-{RUNTIME_SHA}.tar.gz"
    )
    with tempfile.TemporaryDirectory(prefix="canonical-hash-v1-probe-") as raw:
        temp = Path(raw)
        with tarfile.open(artifact, "r:gz") as source:
            source.extractall(temp, filter="data")
        runtime = temp / RUNTIME_SHA
        sys.path.insert(0, str(runtime))
        from sales_conversation_controller.site_contract_runtime_v1.executors import (  # noqa: E402
            QwenStub,
            StubOutput,
        )

        class FixedExecutor:
            executor = "qwen"

            def execute(self, _context):
                return StubOutput(fixed_answer, 1, "local_low")

        bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=(FixedExecutor() if fixed_answer is not None else QwenStub()),
        )
        result = bridge.process(request)
        if bridge.adapter.last_trace.get("model_requests") != 0:
            raise SystemExit("model request counter is not zero")
        json.dump(result, sys.stdout, ensure_ascii=False, sort_keys=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
