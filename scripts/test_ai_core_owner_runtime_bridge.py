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
PROJECT_FACT_MESSAGE = (
    "У нас бизнес-центр: 2 въезда и 2 выезда, около 800 автомобилей в сутки. "
    "Есть сотрудники, арендаторы и гости. Оператор есть, но хотим максимально "
    "быстрый автоматический проезд и обязательно автоматический резервный способ "
    "на случай, если основной идентификатор не сработает."
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
    artifact = ROOT / "release/ai-core-runtime-c78ae728" / (
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
        from sales_conversation_controller.site_contract_runtime_v1 import (  # noqa: E402
            apply_mutation_ack_v11,
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
        assert response["executor_trace"]["execution_mode"] == "deterministic"
        assert response["executor_trace"]["planned_executor"] is None
        assert response["executor_trace"]["final_executor"] is None
        assert response["executor_trace"]["attempts"] == []
        assert response["executor_trace"]["model_request_count"] == 0
        assert response["executor_trace"]["deterministic_handler"] == "utility"
        assert observability_trace["routing"]["execution_mode"] == "deterministic"
        assert observability_trace["routing"]["model_attempt_present"] is False
        assert observability_trace["routing"]["model_request_count"] == 0
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
        assert engineering["executor_trace"]["execution_mode"] == "model"
        assert engineering["executor_trace"]["model_request_count"] == 1
        assert engineering_envelope["observability_trace"]["routing"][
            "execution_mode"
        ] == "model"
        assert engineering_envelope["observability_trace"]["routing"][
            "model_attempt_present"
        ] is True
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

        knowledge_request = request_for(runtime_sha256, "knowledge_exact")
        knowledge_request["payload"]["current_message"] = (
            "Что ты знаешь о РОСПАРК?"
        )
        knowledge_request["request_payload_hash"] = runtime_sha256(
            knowledge_request["payload"]
        )
        knowledge_envelope = engineering_bridge.process(knowledge_request)
        knowledge_stage = next(
            stage for stage in knowledge_envelope["observability_trace"]["pipeline"]
            if stage["name"] == "knowledge_sources"
        )
        assert knowledge_envelope["response"]["success"] is True
        assert knowledge_envelope["response"]["executor_trace"][
            "execution_mode"
        ] == "deterministic"
        assert knowledge_stage["status"] == "pass"
        assert knowledge_stage["input"]["required"] is True
        assert knowledge_stage["output"]["retrieval_result_count"] > 0
        assert knowledge_stage["output"][
            "executor_received_knowledge_count"
        ] > 0

        project_request = request_for(runtime_sha256, "project_fact_round_trip")
        project_request["payload"]["current_message"] = PROJECT_FACT_MESSAGE
        project_request["request_payload_hash"] = runtime_sha256(
            project_request["payload"]
        )
        project_bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        project_envelope = project_bridge.process(project_request)
        project_response = project_envelope["response"]
        question_mutation = next(
            item for item in project_response["state_mutations"]
            if item["operation"] == "add_asked_question"
        )
        assert question_mutation["value"]["question_goal"] == (
            "identify_current_system"
        )
        assert question_mutation["value"]["question_goal"] != (
            question_mutation["value"]["question_text"]
        )

        follow_up_request = request_for(runtime_sha256, "project_follow_up")
        follow_up_request["payload"]["current_message"] = (
            "С нуля. Что лучше выбрать: карты или билеты?"
        )
        follow_up_request["payload"]["parent_message_id"] = (
            project_request["payload"]["message_id"]
        )
        follow_up_request["payload"]["recent_messages"] = [
            {
                "message_id": project_request["payload"]["message_id"],
                "role": "user",
                "content": PROJECT_FACT_MESSAGE,
                "created_at": "2026-08-13T12:00:00Z",
            },
            {
                "message_id": project_response["response_id"],
                "role": "assistant",
                "content": project_response["answer"],
                "created_at": "2026-08-13T12:00:01Z",
            },
        ]
        follow_up_request["request_payload_hash"] = runtime_sha256(
            follow_up_request["payload"]
        )
        acknowledgement = {
            "contract_version": project_response["contract_version"],
            "canonicalization_version": project_response[
                "canonicalization_version"
            ],
            "request_id": project_response["request_id"],
            "response_id": project_response["response_id"],
            "acknowledged_at": "2026-08-13T12:00:02Z",
            "acknowledgements": [
                {
                    "mutation_id": item["mutation_id"],
                    "status": "applied",
                    "reason_code": "applied",
                    "entity_version_before": 0,
                    "entity_version_after": 1,
                    "audit_ref": f"auditref:{index:032x}",
                }
                for index, item in enumerate(
                    project_response["state_mutations"], start=1,
                )
            ],
        }
        round_trip_request = apply_mutation_ack_v11(
            follow_up_request,
            project_response,
            acknowledgement,
            publication_confirmed=True,
        )["next_request"]
        assert round_trip_request["payload"]["active_question"]["goal"] == (
            "identify_current_system"
        )
        assert project_bridge.adapter.validator.validate(
            "request-v1.schema.json", round_trip_request,
        ).valid
        follow_up_bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        follow_up_envelope = follow_up_bridge.process(round_trip_request)
        follow_up_response = follow_up_envelope["response"]
        assert follow_up_response["success"] is True
        assert follow_up_response["evaluation_result"]["status"] == "pass"
        follow_up_observation = follow_up_bridge.adapter.last_trace[
            "ingestion_observability"
        ]
        assert follow_up_observation["turn_relation"] == "answer_plus_new_request"
        assert follow_up_observation["extracted_current_turn_facts"][
            "current_system"
        ] == "new_build"
        assert follow_up_observation["engineering_lab_input_facts"][
            "existing_system"
        ] == "new_build"
        assert follow_up_observation["request_local_effective_facts"][
            "daily_traffic"
        ] == 800
        assert "карт" in follow_up_response["answer"].casefold()
        assert "билет" in follow_up_response["answer"].casefold()
        assert "парковочная система уже установлена или проектируется с нуля" not in (
            follow_up_response["answer"].casefold()
        )
        assert {
            "set_confirmed_fact", "resolve_open_question",
        }.issubset({
            item["operation"] for item in follow_up_response["state_mutations"]
        })
        assert all(
            item["source_message_id"]
            == round_trip_request["payload"]["message_id"]
            for item in follow_up_response["state_mutations"]
        )

        recall_seed = request_for(runtime_sha256, "project_object_recall")
        recall_seed["payload"]["current_message"] = (
            "Какие данные об объекте ты уже знаешь?"
        )
        recall_seed["payload"]["state_version"] = round_trip_request[
            "payload"
        ]["state_version"]
        recall_seed["payload"]["confirmed_project_facts"] = copy.deepcopy(
            round_trip_request["payload"]["confirmed_project_facts"]
        )
        recall_seed["payload"]["active_question"] = copy.deepcopy(
            round_trip_request["payload"]["active_question"]
        )
        recall_seed["request_payload_hash"] = runtime_sha256(
            recall_seed["payload"]
        )
        follow_up_acknowledgement = {
            "contract_version": follow_up_response["contract_version"],
            "canonicalization_version": follow_up_response[
                "canonicalization_version"
            ],
            "request_id": follow_up_response["request_id"],
            "response_id": follow_up_response["response_id"],
            "acknowledged_at": "2026-08-13T12:00:04Z",
            "acknowledgements": [
                {
                    "mutation_id": item["mutation_id"],
                    "status": "applied",
                    "reason_code": "applied",
                    "entity_version_before": follow_up_response[
                        "state_version_before"
                    ],
                    "entity_version_after": follow_up_response[
                        "state_version_after"
                    ],
                    "audit_ref": f"auditref:{index + 100:032x}",
                }
                for index, item in enumerate(
                    follow_up_response["state_mutations"], start=1,
                )
            ],
        }
        recall_request = apply_mutation_ack_v11(
            recall_seed,
            follow_up_response,
            follow_up_acknowledgement,
            publication_confirmed=True,
        )["next_request"]
        recall_bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        recall_envelope = recall_bridge.process(recall_request)
        recall_response = recall_envelope["response"]
        recall_observation = recall_bridge.adapter.last_trace[
            "ingestion_observability"
        ]
        assert recall_response["success"] is True
        assert recall_observation["semantic_route"] == "object_card_recall"
        assert recall_observation["resolved_action"] == "recall_facts"
        assert recall_response["executor_trace"]["execution_mode"] == (
            "deterministic"
        )
        assert recall_response["executor_trace"]["attempts"] == []
        assert recall_response["executor_trace"]["final_executor"] is None
        assert recall_response["executor_trace"]["model_request_count"] == 0
        assert recall_response["state_mutations"] == []
        assert "бизнес-центр" in recall_response["answer"]
        assert "800 автомобилей" in recall_response["answer"]
        assert "проектируется с нуля" in recall_response["answer"]
        assert recall_bridge.adapter.last_trace[
            "engineering_decision_laboratory"
        ] == "not_invoked"

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
        assert evidence["runtime"]["version"] == "1.3.0"
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
        "live_engineering=pass; t3_t4_t5_state_round_trip=pass; "
        "blocked_forensic=pass; "
        "idempotency=pass; model_requests=0"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
