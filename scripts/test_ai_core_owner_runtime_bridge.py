#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ai_core_owner_runtime_bridge import (  # noqa: E402
    CONTRACT_SHA,
    MODEL,
    RUNTIME_SHA,
    OwnerRuntimeBridge,
    verify_runtime_release,
)


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    source = value if isinstance(value, str) else canonical(value)
    return hashlib.sha256(source.encode()).hexdigest()


def request_for(suffix: str = "owner001"):
    payload = {
        "potential_project_id": None,
        "conversation_thread_id": f"thread_owner_{suffix}",
        "conversation_id": f"conversation_owner_{suffix}",
        "message_id": f"message_owner_{suffix}",
        "parent_message_id": None,
        "timestamp": "2026-08-07T12:00:00Z",
        "channel": "website",
        "current_message": "Сколько будет 2+2?",
        "recent_messages": [],
        "state_version": 0,
        "confirmed_project_facts": [],
        "candidate_facts": [],
        "fact_conflicts": [],
        "intent_hints": [],
        "active_question": None,
        "consent_safe_context_refs": [],
        "executor_policy": {
            "policy_id": "policy:owner_qwen_v1",
            "assignment_id": "assignment:owner_qwen_v1",
            "planned_executor": "qwen",
            "allowed_executors": ["qwen"],
            "max_model_fallbacks": 0,
            "fallback_order": ["qwen"],
            "attempt_timeout_ms": 90000,
            "total_timeout_ms": 90000,
            "cost_bucket_limit": "local_high",
            "deterministic_route_handling": "outside_executor_attempts",
        },
    }
    return {
        "contract_version": "1.0",
        "request_id": f"request_owner_{suffix}",
        "idempotency_key": f"idem:owner:{suffix}",
        "request_payload_hash": sha(payload),
        "site_release": "2f5560909d31aa9df732cab74f269c0259c15529",
        "gateway_release": "e0b4edd34d5fecaf8850e64aa03a33c2661b51f9",
        "sent_at": "2026-08-07T12:00:00Z",
        "trace_context": {
            "trace_id": f"trace:owner:{suffix}",
            "span_id": f"span:owner:{suffix}",
            "parent_span_id": None,
        },
        "dry_run": True,
        "payload": payload,
    }


def main() -> int:
    artifact = ROOT / "release/owner-ai-canary-v114" / (
        f"ai-core-runtime-{RUNTIME_SHA}.tar.gz"
    )
    with tempfile.TemporaryDirectory(prefix="owner-core-test-") as raw:
        temp = Path(raw)
        with tarfile.open(artifact, "r:gz") as source:
            source.extractall(temp, filter="data")
        runtime = temp / RUNTIME_SHA
        manifest = verify_runtime_release(runtime)
        assert manifest["runtime_sha"] == RUNTIME_SHA
        assert manifest["contract_sha"] == CONTRACT_SHA
        assert manifest["model"] == MODEL

        sys.path.insert(0, str(runtime))
        from sales_conversation_controller.site_contract_runtime_v1.executors import (  # noqa: E402
            QwenStub,
        )
        bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        request = request_for()
        envelope = bridge.process(request)
        response = envelope["response"]
        assert response["success"] is True
        assert response["answer"] == "2+2 = 4."
        assert response["executor_trace"]["planned_executor"] == "qwen"
        assert response["executor_trace"]["final_executor"] == "qwen"
        assert len(response["executor_trace"]["attempts"]) == 1
        assert response["telemetry"]["publication"]["candidate_status"] == "allowed"
        assert bridge.adapter.last_trace["model_requests"] == 0
        duplicate = bridge.process(request)
        assert duplicate == envelope
        assert bridge.adapter.last_trace["idempotent_cache_hit"] is True

        mutated = json.loads(json.dumps(request))
        mutated["payload"]["current_message"] = "Сколько будет 3+3?"
        mutated["request_payload_hash"] = sha(mutated["payload"])
        conflict = bridge.process(mutated)["response"]
        assert conflict["success"] is False
        assert conflict["error"]["code"] == "IDEMPOTENCY_CONFLICT"

        tampered = temp / f"{RUNTIME_SHA}-tampered"
        shutil.copytree(runtime, tampered)
        unsafe = temp / RUNTIME_SHA
        shutil.move(runtime, temp / "original")
        shutil.move(tampered, unsafe)
        target = next(unsafe.rglob("canonical.py"))
        target.write_text(target.read_text() + "\n# tampered\n")
        try:
            verify_runtime_release(unsafe)
        except ValueError as error:
            assert str(error) == "AI_CORE_RUNTIME_FILE_HASH_MISMATCH"
        else:
            raise AssertionError("tampered runtime accepted")

    print("ai core owner runtime bridge tests: ok; model_requests=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
