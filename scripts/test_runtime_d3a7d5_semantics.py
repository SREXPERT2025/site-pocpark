#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import subprocess
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
    RUNTIME_SHA,
    OwnerRuntimeBridge,
    verify_runtime_release,
)


EXPECTED_RUNTIME = "d3a7d5dbe4af71a3ced2f03589a15cc9e7285f17"
EXPECTED_CONTRACT = "6cd71a5596346925ecdd2ffeb9d45262d881ee93"
EXPECTED_CANONICALIZATION = "CANONICAL_JSON_HASH_V1"
ENGINEERING_MESSAGE = (
    "У нас бизнес-центр: 2 въезда и 2 выезда, около 800 автомобилей в сутки. "
    "Есть сотрудники, арендаторы и гости. Оператор есть, но хотим максимально "
    "быстрый автоматический проезд и обязательно автоматический резервный способ "
    "на случай, если основной идентификатор не сработает. Что лучше выбрать: "
    "распознавание госномеров, карты или билеты?"
)
FIXTURE = json.loads(
    (ROOT / "scripts/fixtures/runtime_d3a7d5_semantic_regression_v1.json")
    .read_text(encoding="utf-8")
)
SITE_SHA = subprocess.check_output(
    ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True,
).strip()


def request_for(runtime_sha256, message: str, suffix: str, history=None):
    payload = {
        "potential_project_id": None,
        "conversation_thread_id": f"thread_d3a7d5_{suffix}",
        "conversation_id": f"thread_d3a7d5_{suffix}",
        "message_id": f"message_d3a7d5_{suffix}",
        "parent_message_id": None,
        "timestamp": "2026-08-11T12:00:00Z",
        "channel": "website",
        "current_message": message,
        "recent_messages": copy.deepcopy(history or []),
        "state_version": 0,
        "confirmed_project_facts": [],
        "candidate_facts": [],
        "fact_conflicts": [],
        "intent_hints": [],
        "active_question": None,
        "consent_safe_context_refs": [],
        "executor_policy": {
            "policy_id": "policy:public_qwen_v1",
            "assignment_id": f"assignment:d3a7d5:{suffix}",
            "planned_executor": "qwen",
            "allowed_executors": ["qwen"],
            "max_model_fallbacks": 0,
            "fallback_order": ["qwen"],
            "attempt_timeout_ms": 90000,
            "total_timeout_ms": 90000,
            "cost_bucket_limit": "local_high",
            "deterministic_route_handling": "outside_executor_attempts"
        },
    }
    return {
        "contract_version": CONTRACT_VERSION,
        "canonicalization_version": CANONICALIZATION_VERSION,
        "request_id": f"request_d3a7d5_{suffix}",
        "idempotency_key": f"idem:d3a7d5:{suffix}",
        "request_payload_hash": runtime_sha256(payload),
        "site_release": SITE_SHA,
        "gateway_release": "e0b4edd34d5fecaf8850e64aa03a33c2661b51f9",
        "sent_at": "2026-08-11T12:00:00Z",
        "trace_context": {
            "trace_id": f"trace:d3a7d5:{suffix}",
            "span_id": f"span:d3a7d5:{suffix}",
            "parent_span_id": None,
        },
        "dry_run": True,
        "payload": payload,
    }


def main() -> int:
    assert RUNTIME_SHA == EXPECTED_RUNTIME
    assert CONTRACT_SHA == EXPECTED_CONTRACT
    assert CANONICALIZATION_VERSION == EXPECTED_CANONICALIZATION
    artifact = ROOT / "release/ai-core-runtime-d3a7d5" / (
        f"ai-core-runtime-{RUNTIME_SHA}.tar.gz"
    )
    with tempfile.TemporaryDirectory(prefix="runtime-d3a7d5-site-integration-") as raw:
        temp = Path(raw)
        with tarfile.open(artifact, "r:gz") as source:
            source.extractall(temp, filter="data")
        runtime = temp / RUNTIME_SHA
        manifest = verify_runtime_release(runtime)
        assert manifest["runtime_sha"] == EXPECTED_RUNTIME
        assert manifest["contract_sha"] == EXPECTED_CONTRACT
        assert manifest["canonicalization_version"] == EXPECTED_CANONICALIZATION
        sys.path.insert(0, str(runtime))

        from sales_conversation_controller.site_contract_runtime_v1.canonical import (  # noqa: E402
            sha256 as runtime_sha256,
        )
        from sales_conversation_controller.site_contract_runtime_v1.executors import (  # noqa: E402
            QwenStub,
            StubOutput,
        )

        class FrozenExecutor:
            executor = "qwen"

            def __init__(self, answer: str):
                self.answer = answer
                self.calls = 0

            def execute(self, _context):
                self.calls += 1
                return StubOutput(self.answer, 1, "local_low")

        def execute(message: str, answer: str, suffix: str, history=None):
            executor = FrozenExecutor(answer)
            bridge = OwnerRuntimeBridge(
                runtime_dir=runtime,
                endpoint="http://127.0.0.1:11434",
                timeout=1,
                keep_alive="2h",
                executor=executor,
            )
            request = request_for(
                runtime_sha256, message, suffix, history=history,
            )
            envelope = bridge.process(request)
            assert bridge.adapter.last_trace["model_requests"] == 0
            return executor, bridge, request, envelope["response"]

        _, greeting_bridge, _, greeting = execute(
            "Привет!", "Здравствуйте! Чем могу помочь?", "greeting",
        )
        assert greeting["success"] is True
        assert greeting["decision_package"]["decision_type"] == "not_required"
        assert greeting["component_versions"]["engineering_lab"] == "not_invoked"
        assert greeting["evaluation_result"]["status"] == "pass"
        assert greeting["telemetry"]["publication"]["candidate_status"] == "allowed"
        assert greeting_bridge.adapter.last_trace["model_requests"] == 0

        _, _, _, clean_2_2 = execute("сколько будет 2+2= ?", "4", "clean_2_2")
        assert clean_2_2["answer"] == "4"
        assert clean_2_2["evaluation_result"]["status"] == "pass"
        assert clean_2_2["telemetry"]["publication"]["candidate_status"] == "allowed"

        _, _, _, clean_2_9 = execute("2+9=", "11", "clean_2_9")
        assert clean_2_9["answer"] == "11"
        assert clean_2_9["evaluation_result"]["status"] == "pass"
        assert clean_2_9["telemetry"]["publication"]["candidate_status"] == "allowed"

        leak_answer = FIXTURE["incidents"]["question_projection_leak"][
            "captured_raw_answer"
        ]
        leak_executor, leak_bridge, leak_request, leaked = execute(
            "сколько будет 2+2= ?", leak_answer, "leak_blocked",
        )
        assert leak_executor.calls == 1
        assert leaked["telemetry"]["publication"]["candidate_status"] == "blocked"
        assert "internal_instruction_leak" in leaked["evaluation_result"]["reason_codes"]
        assert leaked["state_mutations"] == []
        duplicate = leak_bridge.process(copy.deepcopy(leak_request))["response"]
        assert duplicate == leaked
        assert leak_executor.calls == 1
        assert leak_bridge.adapter.last_trace["idempotent_cache_hit"] is True
        assert leak_bridge.adapter.last_trace["model_requests"] == 0

        contaminated = [{
            "message_id": "assistant_contaminated_001",
            "role": "assistant",
            "content": FIXTURE["incidents"]["contaminated_followup"][
                "contaminated_assistant_message"
            ],
            "created_at": "2026-08-11T10:00:00Z",
        }]
        _, contaminated_bridge, _, followup = execute(
            "2+9=", "11", "contaminated_2_9", history=contaminated,
        )
        assert followup["answer"] == "11"
        assert followup["evaluation_result"]["status"] == "pass"
        assert followup["telemetry"]["publication"]["candidate_status"] == "allowed"
        hygiene = contaminated_bridge.adapter.last_trace["history_hygiene"]
        assert hygiene["excluded_count"] == 1
        assert hygiene["trusted_count"] == 0

        engineering_bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        engineering_request = request_for(
            runtime_sha256, ENGINEERING_MESSAGE, "engineering",
        )
        engineering = engineering_bridge.process(engineering_request)["response"]
        expected = FIXTURE["engineering_identity"]
        assert engineering["success"] is True
        assert engineering["evaluation_result"]["status"] == "pass"
        assert engineering["telemetry"]["publication"]["candidate_status"] == "allowed"
        assert engineering["decision_package_hash"] == expected[
            "decision_package_sha256"
        ]
        assert engineering_bridge.adapter.last_trace[
            "model_prompt_contract"
        ]["projection_hash"] == expected["projection_sha256"]
        assert engineering_bridge.adapter.last_trace["model_requests"] == 0

    print(json.dumps({
        "schema": "ROSPARK_RUNTIME_D3A7D5_SITE_INTEGRATION_V1",
        "runtime_sha": EXPECTED_RUNTIME,
        "contract_sha": EXPECTED_CONTRACT,
        "canonicalization_version": EXPECTED_CANONICALIZATION,
        "greeting": "pass",
        "clean_2_plus_2": "pass",
        "clean_2_plus_9": "pass",
        "instruction_leak": "blocked",
        "contaminated_history": "pass",
        "engineering": "pass",
        "decision_package_sha": FIXTURE["engineering_identity"][
            "decision_package_sha256"
        ],
        "projection_sha": FIXTURE["engineering_identity"][
            "projection_sha256"
        ],
        "duplicate_answers": 0,
        "duplicate_mutations": 0,
        "blocked_durable_commits": 0,
        "model_requests": 0,
        "result": "pass",
    }, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
