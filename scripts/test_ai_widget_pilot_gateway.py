#!/usr/bin/env python3

from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

import run_ai_widget_pilot_gateway as gateway


class GatewayContractTests(unittest.TestCase):
    def test_secret_and_authorization(self) -> None:
        secret = gateway.require_secret("x" * 32)
        self.assertTrue(gateway.authorized(f"Bearer {secret}", secret))
        self.assertFalse(gateway.authorized("Bearer wrong", secret))
        self.assertFalse(gateway.authorized(None, secret))
        with self.assertRaises(ValueError):
            gateway.require_secret("short")
        self.assertEqual(gateway.require_keep_alive("2h"), "2h")
        with self.assertRaises(ValueError):
            gateway.require_keep_alive("forever")

    def test_payload_contract(self) -> None:
        parsed = gateway.validate_request(
            {
                "sourcePage": "/demo",
                "messages": [{"role": "user", "content": "Вопрос"}],
            }
        )
        self.assertEqual(parsed["sourcePage"], "/demo")
        with self.assertRaises(ValueError):
            gateway.validate_request(
                {
                    "sourcePage": "https://example.com",
                    "messages": [{"role": "user", "content": "Вопрос"}],
                }
            )
        with self.assertRaises(ValueError):
            gateway.validate_request(
                {
                    "sourcePage": "/demo",
                    "messages": [{"role": "assistant", "content": "Ответ"}],
                }
            )

    def test_env_value_is_read_without_shell_evaluation(self) -> None:
        with TemporaryDirectory() as directory:
            path = Path(directory) / ".env.production.local"
            path.write_text(
                "IGNORED=value\n"
                "AI_WIDGET_GATEWAY_SECRET='safe-secret-value'\n"
                "DANGEROUS=$(echo should-not-run)\n",
                encoding="utf-8",
            )
            self.assertEqual(
                gateway.read_env_value(path, "AI_WIDGET_GATEWAY_SECRET"),
                "safe-secret-value",
            )


class DeterministicEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = gateway.PilotEngine(
            ai_root=gateway.adapter.DEFAULT_AI_ROOT,
            endpoint="http://127.0.0.1:11434",
            model=gateway.adapter.ALLOWED_MODEL,
            timeout=1,
            max_tokens=60,
        )

    def test_exact_faq_without_model_call(self) -> None:
        template_id, item = next(iter(self.engine.faq.items()))
        result = self.engine.answer(
            {
                "sourcePage": "/demo",
                "messages": [{"role": "user", "content": item["title"]}],
            }
        )
        self.assertEqual(result.route, "faq")
        self.assertEqual(result.template_id, template_id)
        self.assertEqual(result.answer, item["answer"])

    def test_price_boundary_without_model_call(self) -> None:
        result = self.engine.answer(
            {
                "sourcePage": "/demo",
                "messages": [
                    {
                        "role": "user",
                        "content": "Сколько стоит автоматизация парковки?",
                    }
                ],
            }
        )
        self.assertEqual(result.route, "boundary")
        self.assertNotRegex(result.answer, r"\d[\d\s]*(?:руб|₽)")

    def test_budget_word_does_not_hide_employee_access_scenario(self) -> None:
        result = self.engine.answer(
            {
                "sourcePage": "/demo",
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Мне нужен бюджетный вариант для постоянных "
                            "сотрудников и без оплат, но чтобы доступ был "
                            "ограничен по времени. Хочу чтобы на ночь не "
                            "оставляли машины. Что можете предложить?"
                        ),
                    }
                ],
            }
        )
        self.assertEqual(result.route, "faq")
        self.assertEqual(result.template_id, "FAQ-008")
        self.assertIn("распознаванию номера или RFID", result.answer)
        self.assertIn("Платёжный сценарий можно не включать", result.answer)
        self.assertIn("запрет ночного въезда", result.answer)
        self.assertIn("/vozmozhnosti/postoyannie-klienti", result.answer)
        self.assertNotIn("закупочную цену", result.answer)

    def test_lead_intent_never_sends(self) -> None:
        result = self.engine.answer(
            {
                "sourcePage": "/demo",
                "messages": [
                    {"role": "user", "content": "Передайте заявку менеджеру"}
                ],
            }
        )
        self.assertEqual(result.route, "crm")
        self.assertIn("тестовую заявку", result.answer)
        self.assertIn("не будут уведомлены", result.answer)

    def test_demo_answer_contains_approved_internal_link(self) -> None:
        answer = gateway.append_approved_links(
            "Где посмотреть, как работает демо?",
            "Демо доступно на сайте.",
        )
        self.assertIn("/demo", answer)
        self.assertNotIn("http://", answer)


if __name__ == "__main__":
    unittest.main()
