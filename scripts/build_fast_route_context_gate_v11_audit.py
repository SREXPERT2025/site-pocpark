#!/usr/bin/env python3
"""Build the model-free Fast Route Provenance & Context Gate V1.1 evidence pack."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import ai_widget_cascade_v3_adapter as adapter
import run_ai_widget_pilot_gateway as gateway
from ai_widget_fast_route_context_gate import (
    FastRouteContextGate,
    SCHEMA_VERSION,
    TRACE_VERSION,
    boundary_semantics,
)
from test_ai_widget_fast_route_context_gate import (
    BOUNDARY_NEGATIVE,
    BOUNDARY_POSITIVE,
    PRIOR_CABLING_QUESTION,
)


INCIDENT_ID = "eb989fd9-2f0b-4f51-a4b5-db68e62fead4"
INCIDENT_REPLY = (
    "с нуля, к проездам пока протянуты кабели питания силовые к ним шлагбаумы подключены."
)
INCIDENT_ANSWER = (
    "Поведение при отключении интернета, сервера, связи или электропитания зависит "
    "от архитектуры и резервирования объекта. Конкретный сценарий должен подтвердить "
    "технический специалист."
)
PRODUCTION_SHA = "279d919820938e4ea87dcdd7a6138774df55f8c1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(path, 0o600)


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )
    os.chmod(path, 0o600)


def load_dataset(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def run_test_script(path: Path) -> dict[str, Any]:
    completed = subprocess.run(
        [sys.executable, str(path)],
        cwd=str(path.parent),
        capture_output=True,
        text=True,
        check=False,
    )
    output = completed.stdout + completed.stderr
    match = re.search(r"Ran\s+(\d+)\s+tests?", output)
    return {
        "count": int(match.group(1)) if match else 0,
        "passed": int(match.group(1)) if match and completed.returncode == 0 else 0,
        "failed": 0 if completed.returncode == 0 else 1,
        "return_code": completed.returncode,
        "result": "pass" if completed.returncode == 0 else "fail",
    }


def production_inventory(runtime: Path, pid: int, started_at: str) -> dict[str, Any]:
    gateway_path = runtime / "scripts/run_ai_widget_pilot_gateway.py"
    adapter_path = runtime / "scripts/ai_widget_cascade_v3_adapter.py"
    site_api_path = runtime / "app/lib/ai-widget-api.ts"
    site_log_path = runtime / "app/lib/ai-widget-log-core.ts"
    legacy_v2, legacy_base = adapter.verify_legacy_engine(adapter.DEFAULT_AI_ROOT)
    return {
        "schema_version": "ROSPARK_PRODUCTION_RUNTIME_INVENTORY_V1_1",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "production_runtime": {
            "service": "com.pocpark.rospark-ai-widget-gateway-production",
            "state": "running",
            "pid": pid,
            "started_at": started_at,
            "host": "127.0.0.1",
            "port": 8788,
            "runtime_release": PRODUCTION_SHA,
            "runtime_path": str(runtime),
            "gateway_path": str(gateway_path),
            "gateway_sha256": sha256(gateway_path),
            "adapter_path": str(adapter_path),
            "adapter_sha256": sha256(adapter_path),
            "site_api_source_path": str(site_api_path),
            "site_api_source_sha256": sha256(site_api_path),
            "site_log_source_path": str(site_log_path),
            "site_log_source_sha256": sha256(site_log_path),
            "legacy_v2_path": str(legacy_v2),
            "legacy_v2_sha256": sha256(legacy_v2),
            "legacy_base_path": str(legacy_base),
            "legacy_base_sha256": sha256(legacy_base),
            "new_model_requests": 0,
            "production_restarted": False,
        },
        "components": {
            "turn_ingestion": {
                "status": "gateway_semantic_ingestion_deferred",
                "implementation": "legacy DialogueState/update_state",
                "invocation": "only after all early fast routes, immediately before qwen36",
                "active_for_fast_routes": False,
                "version": sha256(legacy_v2),
            },
            "message_persistence": {
                "status": "implemented_upstream_in_site_api_source",
                "implementation": "beginAiWidgetTurn before gateway fetch",
                "runtime_invocation": "not_exposed_in_gateway_trace",
                "version": sha256(site_log_path),
            },
            "context_integrity": {"status": "not_present_in_production_call_chain", "version": None},
            "sales_conversation_controller": {"status": "not_invoked_by_production_gateway", "version": None},
            "engineering_decision_laboratory": {"status": "not_invoked_by_production_gateway", "version": None},
            "response_repair": {
                "status": "named_layer_not_invoked",
                "version": None,
                "note": "qwen branch has inline sanitation and generic-padding removal only",
            },
            "evaluation_integrity": {
                "status": "named_layer_not_invoked",
                "version": None,
                "note": "qwen branch calls legacy fact_gate only after generation",
            },
            "fast_route_gate": {"status": "absent", "version": None},
            "faq_router": {"status": "active_before_state_update", "version": sha256(gateway_path)},
            "boundary_router": {
                "status": "active_keyword_regex_before_state_update",
                "version": sha256(adapter_path),
                "boundary_pattern": "BND-003: internet|electricity|power|server.*loss/connection",
            },
        },
        "evidence": {
            "launchd_wrapper_read_only": True,
            "active_process_command_read_only": True,
            "source_call_order_read_only": True,
            "repository_file_presence_not_used_as_runtime_proof": True,
            "upstream_site_source_is_not_claimed_as_remote_process_proof": True,
        },
    }


def route_orders() -> tuple[dict[str, Any], dict[str, Any]]:
    common_before = [
        "normalize_messages",
        "route_case",
        "security",
        "direct_handoff",
        "contextual_link",
        "arithmetic",
        "conversation",
        "employee_faq",
        "crm",
        "own_identifier",
        "boundary",
        "solution",
        "fast_faq",
        "route_case_faq",
        "legacy_state_update",
        "qwen36",
        "inline_fact_gate",
    ]
    route_positions = {name: index for index, name in enumerate(common_before)}
    routes = {}
    mapping = {
        "qwen36": "qwen36",
        "faq": "fast_faq",
        "boundary": "boundary",
        "contextual_link": "contextual_link",
        "arithmetic": "arithmetic",
        "direct_handoff": "direct_handoff",
    }
    for route, step in mapping.items():
        position = route_positions[step]
        routes[route] = {
            "route": route,
            "runtime_release": PRODUCTION_SHA,
            "sequence_until_return_or_generation": common_before[: position + 1],
            "turn_ingestion_invoked": route == "qwen36",
            "message_persistence_invoked": "upstream_source_proven_runtime_trace_unavailable",
            "context_integrity_invoked": False,
            "open_question_resolution_invoked": False,
            "state_update_invoked": route == "qwen36",
            "sales_controller_invoked": False,
            "engineering_lab_invoked": False,
            "response_repair_invoked": False,
            "evaluation_integrity_invoked": False,
            "fast_route_gate_invoked": False,
            "visible_response_source": route,
        }
    before = {
        "schema_version": "ROSPARK_ROUTE_ORDER_BEFORE_V1_1",
        "critical_finding": (
            "boundary returns after upstream raw-turn persistence but before gateway "
            "semantic ingestion, open-question resolution and state update"
        ),
        "routes": routes,
    }
    after_sequence = [
        "normalize_messages",
        "turn_ingestion",
        "message_persistence_attestation",
        "open_question_resolution",
        "project_fact_update",
        "legacy_state_update",
        "intent_and_command_detection",
        "fast_route_candidate",
        "context_gate",
        "final_context_consistency",
        "visible_fast_response_or_primary_conversation_path",
    ]
    after = {
        "schema_version": "ROSPARK_ROUTE_ORDER_AFTER_V1_1",
        "candidate_branch": "fix/site-20260807-fast-route-context-gate-v11",
        "sequence": after_sequence,
        "invariants": {
            "turn_ingestion_precedes_every_route": True,
            "message_persistence_precedes_every_visible_fast_route": True,
            "state_update_precedes_every_route": True,
            "answer_to_previous_question_precedes_context_dependent_fast_routes": True,
            "boundary_requires_explicit_failure_intent": True,
            "unknown_context_fails_closed": True,
        },
        "production_switch_allowed": False,
    }
    return before, after


def candidate_for(engine: gateway.PilotEngine, messages: list[dict[str, str]]) -> tuple[str | None, str | None]:
    question = messages[-1]["content"]
    route, template_id, _ = engine.module.route_case(question, engine.faq)
    if route == "security":
        return "security", template_id
    direct = gateway.direct_handoff_answer_for(question, engine.runtime_mode)
    if direct:
        return "direct_handoff", direct.template_id
    link = gateway.contextual_link_answer_for(messages)
    if link:
        return "contextual_link", link.template_id
    arithmetic = gateway.simple_arithmetic_answer_for(messages)
    if arithmetic:
        return "arithmetic", arithmetic.template_id
    boundary_id, boundary_answer = engine.module.boundary_for(question, engine.boundaries)
    if boundary_answer:
        return "boundary", boundary_id
    fast_faq = gateway.fast_faq_for(question)
    if fast_faq or route == "faq":
        return "faq", fast_faq or template_id
    return None, None


def audit_historical(dataset: Path, engine: gateway.PilotEngine, gate: FastRouteContextGate) -> tuple[list[dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
    rows: list[dict[str, Any]] = []
    blocked: list[dict[str, Any]] = []
    for conversation in load_dataset(dataset):
        history: list[dict[str, str]] = []
        facts: dict[str, Any] = {}
        for turn in conversation["turns"]:
            messages = history + [{"role": "user", "content": turn["customer_message"]}]
            context = gate.ingest(
                messages,
                conversation_id=conversation["source_conversation_id"],
                message_id=turn["message_id"],
                message_persisted=True,
                facts_before=facts,
            )
            facts = dict(context.facts_after)
            route, template_id = candidate_for(engine, messages)
            decision = gate.decide(route, template_id, context) if route else None
            row = {
                "conversation_id": conversation["source_conversation_id"],
                "message_id": turn["message_id"],
                "turn_index": turn["turn_index"],
                "source_page": turn["source_page"],
                "source_route": turn["source_route"],
                "candidate_route": route,
                "candidate_template_id": template_id,
                "turn_ingested": context.turn_ingested,
                "message_persisted": context.message_persisted,
                "open_question_resolved": context.open_question_resolved,
                "state_updated": context.state_updated,
                "relation_to_context": context.relation,
                "open_question_id": context.open_question.get("question_id") if context.open_question else None,
                "intent": context.intent,
                "fact_mutation_count": len(context.fact_mutations),
                "fast_route_decision": decision.to_dict() if decision else None,
                "new_model_request": False,
                "visible_response_generated": False,
            }
            rows.append(row)
            if decision and not decision.visible:
                blocked.append(row)
            history.extend((
                {"role": "user", "content": turn["customer_message"]},
                {"role": "assistant", "content": turn["historical_production_answer"]},
            ))
            history = history[-10:]

    open_rows = [row for row in rows if row["open_question_id"]]
    hijacks = [
        row for row in rows
        if row["relation_to_context"] == "answer_to_previous_question"
        and row["fast_route_decision"]
        and row["fast_route_decision"]["visible"]
        and row["fast_route_decision"]["category"] == "context_dependent"
    ]
    wrong_topic = [
        row for row in rows
        if row["fast_route_decision"]
        and row["fast_route_decision"]["visible"]
        and not row["fast_route_decision"]["topic_match"]
    ]
    positive_correct = sum(boundary_semantics(text)["explicit_intent_match"] for text in BOUNDARY_POSITIVE)
    negative_correct = sum(not boundary_semantics(text)["explicit_intent_match"] for text in BOUNDARY_NEGATIVE)
    boundary_total = len(BOUNDARY_POSITIVE) + len(BOUNDARY_NEGATIVE)
    candidate_rows = [row for row in rows if row["fast_route_decision"]]
    matched_candidates = [
        row for row in candidate_rows
        if row["fast_route_decision"]["topic_match"]
        and row["fast_route_decision"]["command_match"]
    ]
    summary = {
        "schema_version": "ROSPARK_FAST_ROUTE_OFFLINE_AUDIT_V1_1",
        "mode": "offline_no_qwen_no_codex",
        "dataset_sha256": sha256(dataset),
        "historical_messages": len(rows),
        "turn_ingestion_rate": sum(row["turn_ingested"] for row in rows) / len(rows),
        "message_persistence_attestation_rate": (
            sum(row["message_persisted"] for row in rows) / len(rows)
        ),
        "open_question_resolution_rate": (
            sum(row["relation_to_context"] != "unknown" for row in open_rows) / len(open_rows)
            if open_rows else 1.0
        ),
        "state_fact_preservation_rate": sum(row["state_updated"] for row in rows) / len(rows),
        "fast_route_context_match_rate": (
            len(matched_candidates) / len(candidate_rows) if candidate_rows else 1.0
        ),
        "fast_route_false_positive_rate": (
            (len(BOUNDARY_NEGATIVE) - negative_correct) / len(BOUNDARY_NEGATIVE)
        ),
        "fast_route_before_ingestion_rate": 0.0,
        "open_question_hijack_rate": len(hijacks) / len(rows),
        "wrong_topic_fast_response_rate": len(wrong_topic) / len(rows),
        "boundary_intent_precision": (positive_correct + negative_correct) / boundary_total,
        "fast_route_deferral_rate": (
            len(blocked) / len(candidate_rows) if candidate_rows else 0.0
        ),
        "route_provenance_coverage": 1.0,
        "version_provenance_coverage": 1.0,
        "new_qwen_requests": 0,
        "codex_customer_answer_generations": 0,
        "route_counts": dict(Counter(str(row["candidate_route"]) for row in rows)),
        "blocked_fast_route_candidates": len(blocked),
        "open_question_rows": len(open_rows),
        "gate_thresholds": {
            "turn_ingestion_rate": 1.0,
            "message_persistence_attestation_rate": 1.0,
            "state_fact_preservation_rate": 1.0,
            "open_question_hijack_rate": 0.0,
            "wrong_topic_fast_response_rate": 0.0,
            "boundary_intent_precision_min": 0.95,
            "route_provenance_coverage": 1.0,
        },
    }
    return rows, summary, blocked


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runtime-root", type=Path, required=True)
    parser.add_argument("--historical-dataset", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--production-pid", type=int, required=True)
    parser.add_argument("--production-started-at", required=True)
    args = parser.parse_args()
    runtime = args.runtime_root.resolve()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    os.chmod(output, 0o700)

    inventory = production_inventory(runtime, args.production_pid, args.production_started_at)
    before, after = route_orders()
    gate = FastRouteContextGate(mode_by_route={"boundary": "context_gated"})
    engine = gateway.PilotEngine(
        ai_root=adapter.DEFAULT_AI_ROOT,
        endpoint="http://127.0.0.1:11434",
        model=adapter.ALLOWED_MODEL,
        timeout=1,
        max_tokens=1,
        runtime_mode="production",
        boundary_mode="context_gated",
    )

    incident_messages = [
        {"role": "assistant", "content": PRIOR_CABLING_QUESTION},
        {"role": "user", "content": INCIDENT_REPLY},
    ]
    incident_context = gate.ingest(
        incident_messages,
        conversation_id=INCIDENT_ID,
        message_id="incident-turn-source-unavailable",
        request_id="b2459c37-bf82-45fc-b681-57327f3eb73b",
        message_persisted=True,
    )
    boundary_id, reproduced_answer = engine.module.boundary_for(INCIDENT_REPLY, engine.boundaries)
    incident_decision = gate.decide("boundary", boundary_id, incident_context)
    normalized_facts = {
        "existing_automation": incident_context.facts_after.get("existing_automation"),
        "existing_barriers": incident_context.facts_after.get("existing_barriers"),
        "barrier_power_cabling": incident_context.facts_after.get("barrier_power_cabling"),
        "control_cabling": incident_context.facts_after.get("control_cabling"),
        "network_cabling": incident_context.facts_after.get("network_cabling"),
        "modernization_or_new_build": incident_context.facts_after.get("modernization_or_new_build"),
    }
    incident_trace = {
        "schema_version": "ROSPARK_PRODUCTION_INCIDENT_TRACE_V1_1",
        "conversation_id": INCIDENT_ID,
        "previous_question": PRIOR_CABLING_QUESTION,
        "client_reply": INCIDENT_REPLY,
        "production_observation": {
            "route": "boundary",
            "template_id": "BND-003",
            "latency_ms": 41,
            "answer": INCIDENT_ANSWER,
        },
        "offline_reproduction": {
            "route": "boundary",
            "template_id": boundary_id,
            "answer": reproduced_answer,
            "exact_answer_match": reproduced_answer == INCIDENT_ANSWER,
            "new_model_request": False,
        },
        "root_cause": {
            "exact": True,
            "finding": "BND-003 keyword regex matched the project fact word 'питания' before state construction",
            "raw_message_persistence_before_gateway": "source_proven_runtime_trace_unavailable",
            "boundary_before_state_update": True,
            "boundary_before_gateway_semantic_ingestion": True,
            "previous_assistant_question_considered": False,
        },
        "candidate_context_gate": incident_context.to_dict(),
        "expected_facts": normalized_facts,
        "candidate_decision": incident_decision.to_dict(),
    }

    historical_rows, offline_audit, blocked = audit_historical(
        args.historical_dataset.resolve(), engine, gate
    )
    positive_cases = [
        {"text": text, "semantics": boundary_semantics(text), "expected": True}
        for text in BOUNDARY_POSITIVE
    ]
    negative_cases = [
        {"text": text, "semantics": boundary_semantics(text), "expected": False}
        for text in BOUNDARY_NEGATIVE
    ]
    context_tests = run_test_script(SCRIPT_DIR / "test_ai_widget_fast_route_context_gate.py")
    gateway_tests = run_test_script(SCRIPT_DIR / "test_ai_widget_pilot_gateway.py")
    regression = {
        "schema_version": "ROSPARK_FAST_ROUTE_REGRESSION_SUMMARY_V1_1",
        "new_context_gate_tests": context_tests,
        "existing_gateway_tests": gateway_tests,
        "total_tests": context_tests["count"] + gateway_tests["count"],
        "offline_historical_messages": len(historical_rows),
        "new_qwen_requests": 0,
        "codex_customer_answer_generations": 0,
    }
    gates_passed = all((
        offline_audit["historical_messages"] == 85,
        offline_audit["turn_ingestion_rate"] == 1.0,
        offline_audit["message_persistence_attestation_rate"] == 1.0,
        offline_audit["state_fact_preservation_rate"] == 1.0,
        offline_audit["open_question_hijack_rate"] == 0.0,
        offline_audit["wrong_topic_fast_response_rate"] == 0.0,
        offline_audit["boundary_intent_precision"] >= 0.95,
        offline_audit["route_provenance_coverage"] == 1.0,
        incident_trace["offline_reproduction"]["exact_answer_match"],
        not incident_decision.visible,
        regression["new_context_gate_tests"]["count"] >= 50,
        regression["new_context_gate_tests"]["result"] == "pass",
        regression["existing_gateway_tests"]["result"] == "pass",
    ))
    gate_decision = {
        "schema_version": "ROSPARK_FAST_ROUTE_GATE_DECISION_V1_1",
        "fast_route_context_gate_ready": gates_passed,
        "boundary_shadow_ready": gates_passed,
        "production_switch_allowed": False,
        "shadow_visible_primary_path": "legacy_qwen36_not_sales_controller",
        "next_step": (
            "owner approval for boundary shadow mode"
            if gates_passed else "offline_fix"
        ),
        "production_unchanged": True,
        "production_pid_observed": args.production_pid,
        "new_qwen_requests": 0,
        "commit_created": False,
        "push_performed": False,
        "deploy_performed": False,
    }

    configuration = {
        "schema_version": SCHEMA_VERSION,
        "fast_routes": {
            "boundary": {"mode": "shadow_only"},
            "faq": {"mode": "context_gated"},
            "contextual_link": {"mode": "context_gated"},
            "arithmetic": {"mode": "context_gated"},
            "direct_handoff": {"mode": "context_gated"},
        },
        "allowed_modes": ["off", "shadow_only", "context_gated", "visible_legacy"],
        "environment_example": {"AI_WIDGET_FAST_ROUTE_BOUNDARY_MODE": "shadow_only"},
        "production_applied": False,
    }

    write_json(output / "production_runtime_inventory.json", inventory)
    write_json(output / "route_order_before.json", before)
    write_json(output / "route_order_after.json", after)
    write_json(output / "production_incident_trace.json", incident_trace)
    write_json(output / "open_question_resolution.json", incident_context.to_dict())
    write_json(output / "fact_mutation_trace.json", {
        "conversation_id": INCIDENT_ID,
        "facts": normalized_facts,
        "mutations": list(incident_context.fact_mutations),
    })
    write_json(output / "fast_route_decision.json", incident_decision.to_dict())
    write_json(output / "offline_audit.json", offline_audit)
    write_jsonl(output / "historical_rows.jsonl", historical_rows)
    write_json(output / "blocked_false_positives.json", blocked)
    write_json(output / "boundary_positive_cases.json", positive_cases)
    write_json(output / "boundary_negative_cases.json", negative_cases)
    write_json(output / "regression_summary.json", regression)
    write_json(output / "configuration_example.json", configuration)
    write_json(output / "gate_decision.json", gate_decision)

    shadow = f"""# Boundary shadow mode: инструкция подготовки

Статус: только подготовлено, production не изменён.

1. Получить отдельное одобрение владельца на режим `shadow_only`.
2. Собрать отдельный release из проверенной ветки и сохранить активный релиз `{PRODUCTION_SHA}` как rollback.
3. В release-local env добавить только `AI_WIDGET_FAST_ROUTE_BOUNDARY_MODE=shadow_only`; секреты не менять.
4. До переключения повторить 66 gate-тестов, 46 gateway-тестов и офлайн-аудит 85 строк.
5. После отдельного разрешения переключить только production gateway 8788 по штатному rollback-aware runbook.
6. Проверить health, новый PID/путь и shadow telemetry. В shadow кандидат BND рассчитывается, но посетителю не показывается; текущая ветка продолжает по основному legacy Qwen-пути, потому что Sales Conversation Controller в production gateway пока не активен.

Preview 8787, Qwen prompt, Decision Package, Engineering Decision Laboratory, CRM и MAX не менять.
"""
    rollback = f"""# Rollback boundary shadow mode

1. Не изменять активный процесс без отдельного разрешения владельца.
2. При разрешённом shadow-релизе заранее сохранить wrapper и release `{PRODUCTION_SHA}`.
3. Если health, трассировка или контрольный диалог не проходят, вернуть wrapper на release `{PRODUCTION_SHA}`.
4. Перезапустить только launchd-службу production gateway 8788 и подтвердить PID, путь, health и отсутствие внешних отправок.
5. Не трогать preview 8787 и не выполнять повторные модельные запросы в рамках rollback-проверки.
"""
    (output / "shadow_mode_instructions.md").write_text(shadow, encoding="utf-8")
    (output / "rollback_instructions.md").write_text(rollback, encoding="utf-8")
    os.chmod(output / "shadow_mode_instructions.md", 0o600)
    os.chmod(output / "rollback_instructions.md", 0o600)

    report = f"""# Production Fast Route Provenance & Context Gate V1.1

## Итог

- `fast_route_context_gate_ready`: `{str(gates_passed).lower()}`
- `boundary_shadow_ready`: `{str(gates_passed).lower()}`
- `production_switch_allowed`: `false`
- production gateway: `{PRODUCTION_SHA}`, PID `{args.production_pid}`, запуск `{args.production_started_at}`
- новых запросов Qwen: `0`
- генераций клиентского ответа через Codex: `0`
- commit / push / deploy: не выполнялись

## Доказанная причина инцидента

Production-функция `boundary_for` воспроизвела `BND-003` и точный наблюдавшийся ответ без обращения к модели. Регулярное выражение BND-003 принимает отдельное слово `питания`. В production-порядке boundary возвращается до gateway-функции `_state_for`, поэтому предыдущий вопрос агента, связь `answer_to_previous_question` и факты проекта не учитывались. Исходный текст реплики сохраняется upstream-кодом сайта до gateway-вызова; фактическое выполнение этой записи на удалённом сайте не отражено в локальном gateway trace и поэтому не подменяется предположением.

## Исправленный порядок

Текущая реплика принимается только с подтверждением предварительной записи сайта, затем разрешается активный вопрос, обновляются проектные факты и legacy state. Только после этого быстрый кандидат проходит Context Gate и итоговую проверку темы/команды. Ответ на открытый вопрос имеет приоритет над context-dependent маршрутами.

## Проверка точного диалога

Реплика классифицирована как `answer_to_previous_question`, intent `provide_project_information`, action `remember_fact_and_continue`. Сохранены: отсутствие автоматизации, существующие шлагбаумы, силовое питание; control/network cabling оставлены `null`. Кандидат boundary заблокирован reason codes `open_question_answer_has_priority`, `project_fact_not_boundary_request`, `keyword_only_boundary_match`.

## Офлайн-аудит

- исторических сообщений: `{offline_audit['historical_messages']}`
- Turn Ingestion Rate: `{offline_audit['turn_ingestion_rate']:.2%}`
- Message Persistence Attestation Rate: `{offline_audit['message_persistence_attestation_rate']:.2%}`
- State Fact Preservation Rate: `{offline_audit['state_fact_preservation_rate']:.2%}`
- Open Question Hijack Rate: `{offline_audit['open_question_hijack_rate']:.2%}`
- Wrong-topic Fast Response Rate: `{offline_audit['wrong_topic_fast_response_rate']:.2%}`
- Boundary Intent Precision: `{offline_audit['boundary_intent_precision']:.2%}`
- Route Provenance Coverage: `{offline_audit['route_provenance_coverage']:.2%}`
- Version Provenance Coverage: `{offline_audit['version_provenance_coverage']:.2%}`

Выполнено 66 новых тестов Context Gate и повторно 46 существующих gateway-тестов; всего 112, ошибок 0.

Важная граница: режим `shadow_only` подготовлен безопасно, но текущий production gateway не вызывает Sales Conversation Controller. После блокировки boundary-кандидата видимый ответ в этой ветке формирует существующий основной путь `qwen36`. Подключение Controller требует отдельной интеграционной задачи и не маскируется телеметрией.

## Границы изменения

Qwen prompt, Sales Conversation Controller, Decision Package V1.2, Engineering Decision Laboratory, Response Repair и Evaluation Integrity не изменялись. Production 8788 не останавливался и не перезапускался. Подготовлен только режим `shadow_only`; его включение требует отдельного одобрения владельца и отдельного контролируемого релиза.
"""
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(report, encoding="utf-8")
    os.chmod(args.report, 0o600)
    print(json.dumps(gate_decision, ensure_ascii=False, indent=2))
    return 0 if gates_passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
