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
        self.assertEqual(match("Можно оставить шлагбаум Came?"), "BND-001")
        self.assertEqual(match("Какая гарантия точности?"), "BND-002")
        self.assertEqual(match("Что будет без электричества?"), "BND-003")
        self.assertEqual(match("Работаете в Мурманске?"), "BND-004")
        self.assertEqual(match("Почему система не работает?"), "BND-006")

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


if __name__ == "__main__":
    unittest.main()
