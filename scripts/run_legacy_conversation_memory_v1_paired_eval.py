#!/usr/bin/env python3
"""Real local-Qwen paired evaluation for Legacy Conversation Memory V1."""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import ai_widget_cascade_v3_adapter as adapter  # noqa: E402
import run_ai_widget_pilot_gateway as gateway  # noqa: E402


SOURCE_TURN_ID = "11111111-aaaa-4111-8111-111111111111"
CURRENT_TURN_ID = "22222222-bbbb-4222-8222-222222222222"
SESSION_ID = "33333333-cccc-4333-8333-333333333333"


def recent_messages() -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    for index in range(1, 6):
        result.extend([
            {
                "role": "user",
                "content": f"Продолжим обсуждение, реплика {index}.",
            },
            {
                "role": "assistant",
                "content": f"Да, продолжаем обсуждение, ответ {index}.",
            },
        ])
    result.append({
        "role": "user",
        "content": "Хорошо, продолжим без изменения параметров.",
    })
    result.append({
        "role": "user",
        "content": (
            "Какие данные об объекте я уже сообщил и что ещё нужно уточнить?"
        ),
    })
    return result


def rolling_memory() -> dict[str, Any]:
    facts: dict[str, Any] = {
        "object_type": "бизнес-центр",
        "parking_capacity": 450,
        "entrances": 2,
        "exits": 2,
        "user_segment.employees": True,
        "user_segment.tenants": True,
        "user_segment.guests": True,
        "identification.license_plate": True,
        "payment": "on_exit",
        "integration.1c": True,
    }
    return {
        "version": gateway.LEGACY_MEMORY_VERSION,
        "confirmedFacts": facts,
        "factProvenance": {key: SOURCE_TURN_ID for key in facts},
        "activeRequirements": [{
            "category": "reliability",
            "text": "Нужен автоматический резервный способ идентификации.",
            "sourceTurnId": SOURCE_TURN_ID,
        }],
        "objections": [],
        "alreadyAskedQuestions": [{
            "text": "Где должна происходить оплата?",
            "sourceTurnId": SOURCE_TURN_ID,
        }],
        "salesStage": "requirements_collected",
    }


def quality(answer: str) -> dict[str, Any]:
    checks = {
        "object_type": bool(re.search(r"бизнес[- ]центр", answer, re.I)),
        "parking_capacity_450": "450" in answer,
        "entrances_2": bool(re.search(r"2\s+въезд|дв\w*\s+въезд", answer, re.I)),
        "exits_2": bool(re.search(r"2\s+выезд|дв\w*\s+выезд", answer, re.I)),
        "employees": bool(re.search(r"сотрудник", answer, re.I)),
        "tenants": bool(re.search(r"арендатор", answer, re.I)),
        "guests": bool(re.search(r"гост|посетител", answer, re.I)),
        "license_plate": bool(re.search(r"госномер|номер", answer, re.I)),
        "payment_on_exit": bool(re.search(r"оплат\w*.{0,30}выезд|выезд\w*.{0,30}оплат", answer, re.I)),
        "integration_1c": bool(re.search(r"1[сc]", answer, re.I)),
        "automatic_fallback": bool(re.search(r"автоматическ\w+\s+резерв", answer, re.I)),
        "superseded_300_absent": "300" not in answer,
    }
    return {
        "score": sum(checks.values()),
        "maximum": len(checks),
        "checks": checks,
    }


def run_case(engine: gateway.PilotEngine, with_memory: bool) -> dict[str, Any]:
    body: dict[str, Any] = {
        "sourcePage": "/",
        "sessionId": SESSION_ID,
        "turnId": CURRENT_TURN_ID,
        "messages": recent_messages(),
    }
    if with_memory:
        body["legacyMemory"] = rolling_memory()
        body["legacyTranscript"] = {
            "version": gateway.LEGACY_MEMORY_VERSION,
            "sourceTurnCount": 30,
            "sha256": "a" * 64,
        }
    payload = gateway.validate_request(body)
    started = time.monotonic()
    result = engine.answer(payload, request_id=(
        "legacy-memory-candidate" if with_memory else "legacy-memory-baseline"
    ))
    elapsed_ms = round((time.monotonic() - started) * 1000)
    return {
        "route": result.route,
        "elapsed_ms": elapsed_ms,
        "model_metrics": result.model_metrics,
        "quality": quality(result.answer),
        "answer": result.answer,
    }


def main() -> int:
    engine = gateway.PilotEngine(
        ai_root=adapter.DEFAULT_AI_ROOT,
        endpoint="http://127.0.0.1:11434",
        model=adapter.ALLOWED_MODEL,
        timeout=180,
        max_tokens=320,
        keep_alive="2h",
        runtime_mode="production",
        boundary_mode="visible_legacy",
    )
    baseline = run_case(engine, False)
    candidate = run_case(engine, True)
    passed = (
        candidate["route"] == "qwen36"
        and candidate["quality"]["score"] >= 10
        and candidate["quality"]["score"] > baseline["quality"]["score"]
        and candidate["quality"]["checks"]["superseded_300_absent"]
    )
    print(json.dumps({
        "status": "PASS" if passed else "FAIL",
        "execution": "real_local_qwen",
        "model": adapter.ALLOWED_MODEL,
        "baseline": baseline,
        "candidate": candidate,
        "latency_delta_ms": candidate["elapsed_ms"] - baseline["elapsed_ms"],
        "quality_delta": (
            candidate["quality"]["score"] - baseline["quality"]["score"]
        ),
        "production_changes": 0,
    }, ensure_ascii=False, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
