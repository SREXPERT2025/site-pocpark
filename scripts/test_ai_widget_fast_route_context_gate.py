#!/usr/bin/env python3
"""Model-free regression suite for Fast Route Context Gate V1.1."""

from __future__ import annotations

import sys
import unittest
from dataclasses import replace
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from ai_widget_fast_route_context_gate import FastRouteContextGate, boundary_semantics
import run_ai_widget_pilot_gateway as gateway


PRIOR_CABLING_QUESTION = (
    "Для точного расчёта состава оборудования и стоимости нужно уточнить, "
    "есть ли уже проложены кабели для подключения нового оборудования или "
    "потребуется монтаж с нуля?"
)

BOUNDARY_POSITIVE = (
    "Будет ли система работать без интернета?",
    "Как выехать при потере связи?",
    "Что произойдёт при отказе сервера?",
    "Как работает парковка при отключении питания?",
    "Что будет, если отключат электричество?",
    "Можно ли выехать, когда интернет недоступен?",
    "Что делать при аварийном отключении электропитания?",
    "Будет ли работать шлагбаум при отказе сервера?",
    "Как заехать, если пропала связь с сервером?",
    "Что будет с оборудованием, если питание отключено?",
    "Можно ли открыть проезд при потере интернета?",
    "Как быть, когда сервер недоступен?",
    "Что произойдёт, если оборудование перестанет работать?",
    "Как выехать при аварии электропитания?",
    "Будет ли доступ при пропавшем интернете?",
)

BOUNDARY_NEGATIVE = (
    "К шлагбауму подведено питание.",
    "Силовые кабели уже протянуты.",
    "Интернет у нас есть.",
    "Сервер будет находиться в помещении охраны.",
    "Пока подключены только шлагбаумы.",
    "Кабели будем прокладывать с нуля.",
    "Питание заведено на оба проезда.",
    "Связь между зданиями по оптике.",
    "Шлагбаумы уже стоят.",
    "Сервер установим в диспетчерской.",
    "Интернет подключён по двум каналам.",
    "Нужен кабель питания.",
    "Электричество на объекте есть.",
    "Камеры и шлагбаумы подключены.",
    "Подготовили место под сервер.",
    "Слаботочные кабели ещё не проложены.",
    "Питание силовое, автоматизации нет.",
    "Связь планируем по локальной сети.",
    "Есть резервный сервер.",
    "Шлагбаум питается от существующей линии.",
    "Кабель связи заведён в охрану.",
    "Интернет будет от провайдера заказчика.",
    "Электропитание уже подготовлено.",
    "Сервер и сеть размещены в стойке.",
    "К проезду протянуто питание для шлагбаума.",
)

OPEN_QUESTION_ANSWERS = (
    "с нуля",
    "автоматизации нет",
    "только шлагбаум",
    "кабели есть",
    "силовое питание есть, связи нет",
    "с нуля, но шлагбаумы уже стоят",
    "пока только силовые линии",
    "шлагбаумы подключены",
    "кабели питания протянуты",
    "монтаж автоматики потребуется с нуля",
    "слаботочных линий нет",
    "есть шлагбаумы и силовое питание",
)


class CoreGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.gate = FastRouteContextGate(mode_by_route={"boundary": "context_gated"})

    def context(self, text: str):
        return self.gate.ingest(
            [
                {"role": "assistant", "content": PRIOR_CABLING_QUESTION},
                {"role": "user", "content": text},
            ],
            conversation_id="offline-test",
        )

    def test_exact_production_incident_is_linked_and_blocked(self) -> None:
        context = self.context(
            "с нуля, к проездам пока протянуты кабели питания силовые к ним шлагбаумы подключены."
        )
        decision = self.gate.decide("boundary", "BND-003", context)
        self.assertEqual(context.relation, "answer_to_previous_question")
        self.assertEqual(context.intent, "provide_project_information")
        self.assertFalse(decision.eligible)
        self.assertFalse(decision.visible)
        self.assertIn("open_question_answer_has_priority", decision.reason_codes)

    def test_exact_production_incident_preserves_expected_facts(self) -> None:
        context = self.context(
            "с нуля, к проездам пока протянуты кабели питания силовые к ним шлагбаумы подключены."
        )
        facts = context.facts_after
        self.assertIs(facts["existing_automation"], False)
        self.assertIs(facts["existing_barriers"], True)
        self.assertIs(facts["barrier_power_cabling"], True)
        self.assertIsNone(facts.get("control_cabling"))
        self.assertIsNone(facts.get("network_cabling"))
        self.assertEqual(
            facts["modernization_or_new_build"],
            "automation_from_scratch_with_existing_barriers",
        )

    def test_explicit_boundary_question_overrides_open_question(self) -> None:
        context = self.context("Что будет, если отключат питание?")
        decision = self.gate.decide("boundary", "BND-003", context)
        self.assertEqual(context.relation, "independent_question")
        self.assertTrue(decision.eligible)
        self.assertTrue(decision.visible)

    def test_shadow_mode_never_makes_candidate_visible(self) -> None:
        gate = FastRouteContextGate(mode_by_route={"boundary": "shadow_only"})
        context = gate.ingest([{"role": "user", "content": BOUNDARY_POSITIVE[0]}])
        decision = gate.decide("boundary", "BND-003", context)
        self.assertTrue(decision.eligible)
        self.assertFalse(decision.visible)
        self.assertEqual(decision.next_route, "primary_conversation_path")

    def test_off_mode_blocks_even_valid_candidate(self) -> None:
        gate = FastRouteContextGate(mode_by_route={"boundary": "off"})
        context = gate.ingest([{"role": "user", "content": BOUNDARY_POSITIVE[0]}])
        self.assertFalse(gate.decide("boundary", "BND-003", context).visible)

    def test_visible_legacy_is_explicitly_traced(self) -> None:
        gate = FastRouteContextGate(mode_by_route={"boundary": "visible_legacy"})
        context = gate.ingest([{"role": "user", "content": BOUNDARY_NEGATIVE[0]}])
        decision = gate.decide("boundary", "BND-003", context)
        self.assertTrue(decision.visible)
        self.assertIn("visible_legacy_route_used", decision.reason_codes)

    def test_visible_legacy_cannot_bypass_message_persistence(self) -> None:
        gate = FastRouteContextGate(mode_by_route={"boundary": "visible_legacy"})
        context = gate.ingest(
            [{"role": "user", "content": BOUNDARY_POSITIVE[0]}],
            message_persisted=False,
        )
        decision = gate.decide("boundary", "BND-003", context)
        self.assertFalse(decision.visible)
        self.assertIn("fast_route_before_message_persistence", decision.reason_codes)

    def test_unknown_context_fails_closed(self) -> None:
        context = replace(
            self.gate.ingest([{"role": "user", "content": "Расскажите подробнее"}]),
            relation="unknown",
            intent="unknown",
        )
        decision = self.gate.decide("faq", "FAQ-001", context)
        self.assertFalse(decision.visible)
        self.assertIn("fast_route_context_unknown", decision.reason_codes)

    def test_telemetry_uses_session_turn_and_request_ids(self) -> None:
        context = self.gate.ingest(
            [{"role": "user", "content": "2 + 2"}],
            conversation_id="session-1234567890123456",
            message_id="turn-1234567890123456789",
            request_id="request-1234567890123456",
        )
        decision = self.gate.decide("arithmetic", "CONV-007", context)
        telemetry = self.gate.telemetry(
            runtime_release="release-test",
            route="arithmetic",
            template_id="CONV-007",
            decision=decision,
            visible_response_source="arithmetic",
        )
        self.assertEqual(telemetry["conversation_id"], "session-1234567890123456")
        self.assertEqual(telemetry["message_id"], "turn-1234567890123456789")
        self.assertEqual(telemetry["request_id"], "request-1234567890123456")
        self.assertTrue(telemetry["message_persisted"])

    def test_context_independent_routes_still_require_ingestion(self) -> None:
        context = self.gate.ingest([{"role": "user", "content": "2 + 2"}])
        decision = self.gate.decide("arithmetic", "CONV-007", context)
        self.assertTrue(context.turn_ingested)
        self.assertTrue(context.state_updated)
        self.assertTrue(decision.visible)

    def test_stop_questions_is_explicit_command_not_open_question_answer(self) -> None:
        context = self.context("не задавай больше вопросов")
        self.assertEqual(context.relation, "independent_command")
        self.assertEqual(context.explicit_command, "stop_or_forget_open_question")

    def test_exact_known_link_is_context_independent_after_ingestion(self) -> None:
        context = self.gate.ingest([{"role": "user", "content": "дай ссылку"}])
        decision = self.gate.decide("exact_known_link", "LINK-001", context)
        self.assertTrue(decision.visible)

    def test_boundary_command_mismatch_is_traced(self) -> None:
        context = self.gate.ingest([{"role": "user", "content": "Питание уже есть."}])
        decision = self.gate.decide("boundary", "BND-003", context)
        self.assertFalse(decision.visible)
        self.assertIn("fast_route_command_mismatch", decision.reason_codes)

    def test_gateway_integration_blocks_incident_without_model_network_call(self) -> None:
        engine = gateway.PilotEngine(
            ai_root=Path("/Volumes/POCPARK_AI_DATA/POCPARK_AI"),
            endpoint="http://127.0.0.1:11434",
            model="qwen3.6:27b",
            timeout=1,
            max_tokens=10,
            runtime_mode="production",
            boundary_mode="context_gated",
        )
        engine._ollama_answer = lambda _messages: gateway.ModelAnswer(
            "Уточните, проложены ли слаботочные линии от проездов до помещения управления?",
            {"time_to_first_token_ms": 0, "load_ms": 0, "prompt_eval_ms": 0, "eval_ms": 0, "prompt_tokens": 0, "output_tokens": 0},
        )
        result = engine.answer({
            "sessionId": "eb989fd9-2f0b-4f51-a4b5-db68e62fead4",
            "turnId": "incident-turn-0000000001",
            "sourcePage": "/parkovka",
            "messages": [
                {"role": "assistant", "content": PRIOR_CABLING_QUESTION},
                {"role": "user", "content": "с нуля, к проездам пока протянуты кабели питания силовые к ним шлагбаумы подключены."},
            ],
        }, request_id="incident-request-0000001", message_persisted=True)
        self.assertEqual(result.route, "qwen36")
        decisions = result.route_telemetry["fast_route_decisions"]
        boundary = next(item for item in decisions if item["candidate_route"] == "boundary")
        self.assertFalse(boundary["eligible"])
        self.assertIn("keyword_only_boundary_match", boundary["reason_codes"])


def _install_boundary_positive_test(index: int, text: str) -> None:
    def test(self: CoreGateTests) -> None:
        context = self.gate.ingest([{"role": "user", "content": text}])
        decision = self.gate.decide("boundary", "BND-003", context)
        self.assertTrue(boundary_semantics(text)["explicit_intent_match"])
        self.assertTrue(decision.eligible)
        self.assertTrue(decision.visible)
    setattr(CoreGateTests, f"test_boundary_positive_{index:02d}", test)


def _install_boundary_negative_test(index: int, text: str) -> None:
    def test(self: CoreGateTests) -> None:
        context = self.gate.ingest([{"role": "user", "content": text}])
        decision = self.gate.decide("boundary", "BND-003", context)
        self.assertFalse(boundary_semantics(text)["explicit_intent_match"])
        self.assertFalse(decision.eligible)
        self.assertFalse(decision.visible)
    setattr(CoreGateTests, f"test_boundary_negative_{index:02d}", test)


def _install_open_question_test(index: int, text: str) -> None:
    def test(self: CoreGateTests) -> None:
        context = self.context(text)
        decision = self.gate.decide("boundary", "BND-003", context)
        self.assertEqual(context.relation, "answer_to_previous_question")
        self.assertFalse(decision.visible)
    setattr(CoreGateTests, f"test_open_question_answer_{index:02d}", test)


for _index, _text in enumerate(BOUNDARY_POSITIVE, 1):
    _install_boundary_positive_test(_index, _text)
for _index, _text in enumerate(BOUNDARY_NEGATIVE, 1):
    _install_boundary_negative_test(_index, _text)
for _index, _text in enumerate(OPEN_QUESTION_ANSWERS, 1):
    _install_open_question_test(_index, _text)


if __name__ == "__main__":
    unittest.main()
