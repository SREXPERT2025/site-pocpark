#!/usr/bin/env python3

from __future__ import annotations

import tempfile
import unittest
import json
from pathlib import Path
from types import SimpleNamespace

import ai_widget_cascade_v3_adapter as adapter


class CascadeV3AdapterTest(unittest.TestCase):
    def test_current_faq_parses(self) -> None:
        faq, boundaries = adapter.parse_current_template_file(adapter.DEFAULT_FAQ)
        self.assertEqual(len(faq), 26)
        self.assertEqual(len(boundaries), 6)
        self.assertIn("FAQ-026", faq)
        self.assertIn("BND-006", boundaries)
        self.assertIn(
            "Сколько объектов уже реализовала компания РОСПАРК?",
            faq["FAQ-026"]["variants"],
        )

    def test_endpoint_must_be_loopback(self) -> None:
        self.assertEqual(
            adapter.require_loopback_endpoint("http://127.0.0.1:11434"),
            "http://127.0.0.1:11434",
        )
        with self.assertRaises(ValueError):
            adapter.require_loopback_endpoint("https://example.com")
        with self.assertRaises(ValueError):
            adapter.require_loopback_endpoint("http://192.168.1.10:11434")

    def test_output_must_stay_outside_ai_project(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            with self.assertRaises(ValueError):
                adapter.require_output_outside_ai_root(root / "generated", root)
            allowed = adapter.require_output_outside_ai_root(root / "../result", root)
            self.assertNotIn(root, allowed.parents)

    def test_name_is_required_for_lead(self) -> None:
        state = SimpleNamespace(
            name=None,
            organization=None,
            contact="+7 900 000-00-00",
            city="Москва",
            object_type="бизнес-центр",
            object_name=None,
            entrances=1,
            exits=1,
            shared_passage=False,
            parking_spaces=100,
            constraints=[],
            consent=True,
            active_requirements=lambda: ["Нужен гостевой доступ"],
        )
        _, missing = adapter.crm_payload_with_required_name(state)
        self.assertEqual(missing, ["имя"])
        state.name = "Иван"
        _, missing = adapter.crm_payload_with_required_name(state)
        self.assertEqual(missing, [])

    def test_boundary_map_matches_new_ids(self) -> None:
        patterns = adapter.v3_boundary_patterns()

        def match(text: str) -> str | None:
            for template_id, pattern in patterns:
                if pattern.search(text):
                    return template_id
            return None

        self.assertEqual(match("Сколько стоит терминал?"), "BND-005")
        self.assertIsNone(
            match(
                "Нужен бюджетный вариант для сотрудников без оплаты "
                "с ограничением по времени."
            )
        )
        self.assertEqual(match("Можно оставить шлагбаум Came?"), "BND-001")
        self.assertEqual(
            match("Контроллеры старые. Нужно менять всё?"),
            "BND-001",
        )
        self.assertEqual(match("Какая гарантия точности?"), "BND-002")
        self.assertEqual(
            match("Как быстро приезжает инженер при аварии?"),
            "BND-002",
        )
        self.assertEqual(match("Что будет без электричества?"), "BND-003")
        self.assertEqual(match("Работаете в Мурманске?"), "BND-004")
        self.assertEqual(match("Почему система не работает?"), "BND-006")
        self.assertIsNone(match("Открытие торгового центра через три недели."))
        self.assertEqual(match("У нас стоят шлагбаумы Came."), "BND-001")
        self.assertIsNone(match("Машины стоят в очереди."))
        self.assertEqual(
            match("Какая реальная точность, а не 99 процентов?"),
            "BND-002",
        )

    def test_employee_timed_access_is_a_solution_request(self) -> None:
        question = (
            "Мне нужен бюджетный вариант для постоянных сотрудников и без оплат, "
            "но чтобы доступ был ограничен по времени. "
            "Хочу, чтобы на ночь не оставляли машины."
        )
        self.assertTrue(adapter.is_employee_timed_access_request(question))
        self.assertTrue(adapter.is_composite_solution_request(question))
        self.assertFalse(adapter.PRICE_REQUEST_RE.search(question))
        self.assertTrue(adapter.PRICE_REQUEST_RE.search("Какой бюджет нужен?"))
        self.assertTrue(
            adapter.PRICE_REQUEST_RE.search("Можно уложиться в бюджет?")
        )
        self.assertTrue(
            adapter.PRICE_REQUEST_RE.search(
                "У конкурентов дороже или дешевле?"
            )
        )
        self.assertTrue(
            adapter.PRICE_REQUEST_RE.search(
                "скока будет шлагбаум с камерой"
            )
        )

    def test_composite_explicit_price_bypasses_price_only_boundary(self) -> None:
        boundaries = {"BND-005": "Цена зависит от проекта."}

        def base(
            _question: str,
            _boundaries: dict[str, str],
        ) -> tuple[str | None, str | None]:
            return "BND-005", _boundaries["BND-005"]

        guarded = adapter.guarded_boundary_for(base)
        self.assertEqual(
            guarded(
                "Сколько стоит доступ для сотрудников по расписанию?",
                boundaries,
            ),
            (None, None),
        )
        self.assertEqual(
            guarded("Сколько стоит автоматизация?", boundaries),
            ("BND-005", boundaries["BND-005"]),
        )

    def test_generic_padding_is_removed(self) -> None:
        answer = (
            "Я виртуальный помощник РОСПАРК. "
            "Это не является обещанием конкретной комплектации: итоговое "
            "решение зависит от исходных данных и технической оценки объекта. "
            "Неподтверждённые параметры следует зафиксировать отдельно и "
            "проверить до подготовки предложения. "
            "Проверку должен выполнять уполномоченный технический специалист."
        )
        self.assertEqual(
            adapter.strip_generic_padding(answer),
            "Я виртуальный помощник РОСПАРК.",
        )

    def test_responder_prompt_has_no_forced_minimum(self) -> None:
        def base(_faq_text: str) -> str:
            return adapter.LEGACY_LENGTH_INSTRUCTION

        prompt = adapter.guarded_responder_prompt(base)("faq")
        self.assertNotIn("от 50 до 70 слов", prompt)
        self.assertIn("одного-трёх предложений", prompt)
        self.assertIn("Не добавляй универсальную оговорку", prompt)

    def test_v3_validation_uses_current_result_keys(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            record = {
                "case_id": "I094",
                "route_correct": True,
                "user_question_answered": True,
                "dangerous_errors": [],
                "model_error": None,
                "false_handoff": False,
                "tool_event": None,
                "crm_missing": ["имя"],
            }
            (output / "cascade_v2_results.jsonl").write_text(
                json.dumps(record, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            (output / "cascade_v2_summary.md").write_text(
                "# Результаты cascade v2\n",
                encoding="utf-8",
            )
            adapter.write_v3_validation(output)
            validation = json.loads(
                (output / "cascade_v3_validation.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(validation["status"], "passed")
            self.assertTrue(validation["checks"]["missing_name_blocks_lead"])
            self.assertTrue((output / "cascade_v3_summary.md").is_file())

    def test_price_amount_from_question_is_not_accepted_as_offer(self) -> None:
        self.assertTrue(
            adapter.contains_unsupported_price_amount(
                "Можно уложиться в миллион рублей?",
                "Миллион рублей может быть ориентиром.",
            )
        )
        self.assertFalse(
            adapter.contains_unsupported_price_amount(
                "Какая нужна схема оплаты?",
                "Первые 40 минут бесплатно, затем 100 рублей.",
            )
        )
        self.assertFalse(
            adapter.contains_unsupported_price_amount(
                "Можно уложиться в миллион рублей?",
                "Виджет не публикует цены и не называет ориентиры.",
            )
        )

    def test_unconfirmed_claims_are_flagged(self) -> None:
        self.assertIn(
            "unconfirmed_mobile_app",
            adapter.unconfirmed_claim_flags(
                "Как автоматизировать парковку?",
                "Для доступа используются мобильные приложения.",
            ),
        )
        self.assertIn(
            "unconfirmed_cargo_rules",
            adapter.unconfirmed_claim_flags(
                "Как пропускать грузовики?",
                "Можно настроить правила с учетом объема груза.",
            ),
        )
        self.assertIn(
            "unconfirmed_cargo_rules",
            adapter.unconfirmed_claim_flags(
                "Как пропускать грузовики?",
                "Можно задать сценарий с учетом весовых ограничений.",
            ),
        )
        self.assertIn(
            "unconfirmed_multisite_management",
            adapter.unconfirmed_claim_flags(
                "Можно управлять тремя зданиями из одного места?",
                (
                    "Система позволяет централизованно управлять несколькими "
                    "зданиями."
                ),
            ),
        )
        self.assertIn(
            "unconfirmed_phased_expansion",
            adapter.unconfirmed_claim_flags(
                "Можно сначала базовую систему, а оплату добавить позже?",
                "Да, оплату можно подключить позже.",
            ),
        )
        self.assertIn(
            "unconfirmed_unattended_operation",
            adapter.unconfirmed_claim_flags(
                "Можно работать без кассира и охраны?",
                "Да, система позволяет работать без кассира и охраны.",
            ),
        )
        self.assertEqual(
            adapter.unconfirmed_claim_flags(
                "Можно работать без кассира и охраны?",
                (
                    "Возможность работы без кассира и охраны зависит от "
                    "правил объекта и требует проверки."
                ),
            ),
            [],
        )


if __name__ == "__main__":
    unittest.main()
