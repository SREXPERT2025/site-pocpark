#!/usr/bin/env python3

from __future__ import annotations

import unittest

import run_ai_widget_pilot_gateway as gateway


class GatewayContractTests(unittest.TestCase):
    def test_secret_and_authorization(self) -> None:
        secret = gateway.require_secret("x" * 32)
        self.assertTrue(gateway.authorized(f"Bearer {secret}", secret))
        self.assertFalse(gateway.authorized("Bearer wrong", secret))
        self.assertFalse(gateway.authorized(None, secret))
        with self.assertRaises(ValueError):
            gateway.require_secret("short")

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
        self.assertIn("передача обращения отключена", result.answer)


if __name__ == "__main__":
    unittest.main()
