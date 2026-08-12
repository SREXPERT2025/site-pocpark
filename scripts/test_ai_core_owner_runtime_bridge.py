#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ai_core_owner_runtime_bridge import (  # noqa: E402
    CANONICALIZATION_VERSION,
    CONTRACT_SHA,
    CONTRACT_VERSION,
    MODEL,
    RUNTIME_SHA,
    OwnerRuntimeBridge,
    verify_runtime_release,
)


ENGINEERING_MESSAGE = (
    "У нас бизнес-центр: 2 въезда и 2 выезда, около 800 автомобилей в сутки. "
    "Есть сотрудники, арендаторы и гости. Оператор есть, но хотим максимально "
    "быстрый автоматический проезд и обязательно автоматический резервный способ "
    "на случай, если основной идентификатор не сработает. Что лучше выбрать: "
    "распознавание госномеров, карты или билеты?"
)
EXPECTED_DECISION_PACKAGE_SHA = (
    "d6f6f3505a689790916c262cb1618670b05777a4084c4fa7cb45c625759a08cd"
)
EXPECTED_PROJECTION_SHA = (
    "19f24a53536513169d97e14e0dc15e54adbe676b1c0aa12a0a980568eb55cfd2"
)


def request_for(hash_value, suffix: str = "owner001"):
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
        "contract_version": CONTRACT_VERSION,
        "canonicalization_version": CANONICALIZATION_VERSION,
        "request_id": f"request_owner_{suffix}",
        "idempotency_key": f"idem:owner:{suffix}",
        "request_payload_hash": hash_value(payload),
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
    artifact = ROOT / "release/ai-core-runtime-77e4c478" / (
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
            StubOutput,
        )
        from sales_conversation_controller.site_contract_runtime_v1.canonical import (  # noqa: E402
            sha256 as runtime_sha256,
        )
        bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        request = request_for(runtime_sha256)
        envelope = bridge.process(request)
        response = envelope["response"]
        observability_trace = envelope["observability_trace"]
        assert observability_trace is not None
        unhashed_trace = copy.deepcopy(observability_trace)
        unhashed_trace.pop("trace_sha256")
        assert observability_trace["trace_sha256"] == runtime_sha256(
            unhashed_trace
        )
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
        mutated["request_payload_hash"] = runtime_sha256(mutated["payload"])
        conflict = bridge.process(mutated)["response"]
        assert conflict["success"] is False
        assert conflict["error"]["code"] == "IDEMPOTENCY_CONFLICT"

        engineering_request = request_for(runtime_sha256, "engineering_exact")
        engineering_request["payload"]["current_message"] = ENGINEERING_MESSAGE
        engineering_request["request_payload_hash"] = runtime_sha256(
            engineering_request["payload"]
        )
        engineering_bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        engineering_envelope = engineering_bridge.process(engineering_request)
        engineering = engineering_envelope["response"]
        assert engineering["success"] is True
        assert engineering["telemetry"]["publication"]["candidate_status"] == "allowed"
        assert engineering["decision_package_hash"] == EXPECTED_DECISION_PACKAGE_SHA
        assert (
            engineering_bridge.adapter.last_trace["model_prompt_contract"]["projection_hash"]
            == EXPECTED_PROJECTION_SHA
        )
        assert engineering["context_resolution"]["extracted_facts"] == {
            "object_type": "business_center",
            "entrances_count": 2,
            "exits_count": 2,
            "daily_traffic": 800,
            "daily_traffic_certainty": "approximate",
            "user_segments": ["employees", "tenants", "guests"],
            "operator_present": True,
            "speed_priority": "high",
            "mandatory_automated_fallback": True,
        }
        assert engineering_envelope["restricted_forensic"] is None
        assert engineering_bridge.adapter.last_trace["model_requests"] == 0

        class BlockingEngineeringExecutor:
            executor = "qwen"

            def execute(self, context):
                return StubOutput(
                    "Оставьте телефон прямо сейчас?\n"
                    "Сколько у вас въездов? Какая система установлена?",
                    1,
                    "local_low",
                )

        blocked_request = request_for(runtime_sha256, "engineering_blocked")
        blocked_request["payload"]["current_message"] = ENGINEERING_MESSAGE
        blocked_request["request_payload_hash"] = runtime_sha256(
            blocked_request["payload"]
        )
        blocked_bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=BlockingEngineeringExecutor(),
        )
        blocked_envelope = blocked_bridge.process(blocked_request)
        blocked = blocked_envelope["response"]
        evidence = blocked_envelope["restricted_forensic"]
        blocked_trace = blocked_envelope["observability_trace"]
        assert blocked_trace is not None
        unhashed_blocked_trace = copy.deepcopy(blocked_trace)
        unhashed_blocked_trace.pop("trace_sha256")
        assert blocked_trace["trace_sha256"] == runtime_sha256(
            unhashed_blocked_trace
        )
        blocked_stages = {
            stage["name"]: stage for stage in blocked_trace["pipeline"]
        }
        assert blocked["success"] is True
        blocked_candidate_status = blocked["telemetry"]["publication"][
            "candidate_status"
        ]
        assert blocked_candidate_status != "allowed"
        assert evidence["schema_version"] == "OWNER_CANARY_BLOCKED_FORENSIC_V1"
        assert evidence["runtime"]["sha"] == RUNTIME_SHA
        assert evidence["runtime"]["version"] == "1.2.3"
        assert evidence["lab"]["decision_package_sha"] == EXPECTED_DECISION_PACKAGE_SHA
        assert evidence["projection"]["sha"] == EXPECTED_PROJECTION_SHA
        assert evidence["executor"]["request_count"] == 1
        assert evidence["publication"]["candidate_status"] == blocked_candidate_status
        assert blocked_stages["runtime_publication"]["status"] == "blocked"
        assert blocked_stages["evaluator_final"]["reason_codes"] == sorted(
            blocked["evaluation_result"]["reason_codes"]
        )
        assert evidence["mutation"]["proposed"] is True
        assert ENGINEERING_MESSAGE not in json.dumps(evidence, ensure_ascii=False)
        assert blocked_request["payload"]["state_version"] == 0
        assert blocked_request["payload"]["confirmed_project_facts"] == []
        assert blocked_bridge.adapter.last_trace["external_side_effects"] == 0
        assert blocked_bridge.adapter.last_trace["model_requests"] == 0
        blocked_duplicate = blocked_bridge.process(blocked_request)
        assert blocked_duplicate == blocked_envelope
        assert blocked_bridge.adapter.last_trace["idempotent_cache_hit"] is True

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

    print(
        "ai core owner runtime bridge tests: ok; "
        "live_engineering=pass; blocked_forensic=pass; "
        "idempotency=pass; model_requests=0"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
