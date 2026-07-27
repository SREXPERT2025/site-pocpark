#!/usr/bin/env python3
"""Loopback-only gateway for the short ROSPARK AI widget pilot.

The gateway has no filesystem, browser, CRM, MAX or equipment tools. It loads
the checksum-pinned cascade v3 evaluation engine read-only and exposes one
authenticated local HTTP endpoint for the Next.js preview server.
"""

from __future__ import annotations

import argparse
import hmac
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import ai_widget_cascade_v3_adapter as adapter


MAX_BODY_BYTES = 32_000
MAX_HISTORY_ITEMS = 12
MAX_USER_MESSAGE = 1_200
MAX_ASSISTANT_MESSAGE = 2_000
DEFAULT_PORT = 8787
SAFE_FALLBACK = (
    "По подтверждённым материалам нельзя надёжно дать запрошенное утверждение "
    "без проверки условий конкретного объекта. Можно зафиксировать исходные "
    "требования и перечень данных для технической оценки, не обещая результат "
    "заранее. Для содержательного следующего шага нужны параметры объекта, "
    "существующего оборудования и требуемого сценария работы."
)
LEAD_DISABLED = (
    "В этом коротком тесте передача обращения отключена: данные не сохраняются, "
    "а менеджер и внешние каналы не уведомляются. Можно продолжить справочный "
    "диалог без имени и контакта. Проверка формы тестовой карточки будет "
    "выполняться отдельно и только на синтетических данных."
)


@dataclass(frozen=True)
class GatewayResult:
    answer: str
    route: str
    template_id: str | None


class ModelUnavailable(RuntimeError):
    pass


def clean_text(value: Any, maximum: int) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.replace("\x00", "").strip()
    if not cleaned or len(cleaned) > maximum:
        return None
    return cleaned


def validate_request(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("INVALID_BODY")
    source_page = clean_text(value.get("sourcePage"), 240)
    if not source_page or not source_page.startswith("/") or source_page.startswith("//"):
        raise ValueError("INVALID_SOURCE_PAGE")
    raw_messages = value.get("messages")
    if (
        not isinstance(raw_messages, list)
        or not raw_messages
        or len(raw_messages) > MAX_HISTORY_ITEMS
    ):
        raise ValueError("INVALID_MESSAGES")
    messages: list[dict[str, str]] = []
    for item in raw_messages:
        if not isinstance(item, dict) or item.get("role") not in {"user", "assistant"}:
            raise ValueError("INVALID_MESSAGE")
        maximum = (
            MAX_USER_MESSAGE if item["role"] == "user" else MAX_ASSISTANT_MESSAGE
        )
        content = clean_text(item.get("content"), maximum)
        if not content:
            raise ValueError("INVALID_CONTENT")
        messages.append({"role": item["role"], "content": content})
    if messages[-1]["role"] != "user":
        raise ValueError("LAST_MESSAGE_MUST_BE_USER")
    return {"sourcePage": source_page, "messages": messages}


def require_secret(value: str | None) -> str:
    if not value or len(value) < 32:
        raise ValueError("AI_WIDGET_GATEWAY_SECRET must contain at least 32 characters")
    return value


def authorized(header: str | None, secret: str) -> bool:
    if not header or not header.startswith("Bearer "):
        return False
    return hmac.compare_digest(header[7:], secret)


class PilotEngine:
    def __init__(
        self,
        *,
        ai_root: Path,
        endpoint: str,
        model: str,
        timeout: float,
        max_tokens: int,
    ) -> None:
        if model != adapter.ALLOWED_MODEL:
            raise ValueError(f"Only {adapter.ALLOWED_MODEL} is allowed")
        self.endpoint = adapter.require_loopback_endpoint(endpoint)
        self.model = model
        self.timeout = timeout
        self.max_tokens = max_tokens

        v2_script, _ = adapter.verify_legacy_engine(ai_root)
        module = adapter.load_legacy_module(ai_root, v2_script)
        module.PROFILE = adapter.DEFAULT_PROFILE
        module.KNOWLEDGE_FILES = adapter.DEFAULT_KNOWLEDGE
        module.parse_template_file = adapter.parse_current_template_file
        module.BOUNDARY_PATTERNS = adapter.v3_boundary_patterns()
        module.crm_payload = adapter.crm_payload_with_required_name
        module.fact_gate = adapter.guarded_fact_gate(module.fact_gate)
        self.module = module
        self.faq, self.boundaries = adapter.parse_current_template_file(
            adapter.DEFAULT_FAQ
        )
        self.system_prompt = module.responder_prompt(
            adapter.DEFAULT_FAQ.read_text(encoding="utf-8")
        )

    def _state_for(self, messages: list[dict[str, str]]) -> Any:
        state = self.module.DialogueState()
        turn = 0
        for message in messages:
            if message["role"] != "user":
                continue
            turn += 1
            self.module.update_state(state, message["content"], turn)
        return state

    def answer(self, payload: dict[str, Any]) -> GatewayResult:
        messages = payload["messages"]
        question = messages[-1]["content"]
        route, template_id, _ = self.module.route_case(question, self.faq)

        if route == "security":
            answer = self.module.SECURITY_ANSWERS[template_id or "SEC-001"]
            return GatewayResult(answer, route, template_id)

        if route == "crm":
            return GatewayResult(LEAD_DISABLED, route, None)

        if route == "faq":
            answer = self.faq[template_id or ""]["answer"]
            return GatewayResult(answer, route, template_id)

        boundary_id, boundary_answer = self.module.boundary_for(
            question, self.boundaries
        )
        if boundary_answer:
            return GatewayResult(boundary_answer, "boundary", boundary_id)

        state = self._state_for(messages)
        history = messages[:-1][-10:]
        model_messages = [{"role": "system", "content": self.system_prompt}]
        model_messages.extend(history)
        model_messages.append(
            {
                "role": "user",
                "content": (
                    "Ответь на текущий вопрос.\n\n"
                    "Типизированное состояние:\n"
                    f"{self.module.state_context(state)}\n\n"
                    f"Текущий вопрос:\n{question}"
                ),
            }
        )
        try:
            answer, _, _, _ = self.module.ollama_stream(
                self.endpoint,
                self.model,
                model_messages,
                self.timeout,
                self.max_tokens,
            )
        except Exception as error:
            raise ModelUnavailable from error

        answer = self.module.sanitize_unconfirmed_diagnosis(
            self.module.remove_contact_request(answer, question)
        )
        answer = self.module.trim_words(answer, 70)
        flags = self.module.fact_gate(
            question,
            answer,
            "qwen36",
            template_id,
            None,
            False,
        )
        critical = [flag for flag in flags if flag != "too_long"]
        if critical:
            answer = SAFE_FALLBACK
            route = "safe_fallback"
        else:
            answer = self.module.ensure_minimum_words(answer, 50)
            route = "qwen36"
        return GatewayResult(answer, route, template_id)


class GatewayServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(
        self,
        address: tuple[str, int],
        handler: type[BaseHTTPRequestHandler],
        *,
        engine: PilotEngine,
        secret: str,
    ) -> None:
        super().__init__(address, handler)
        self.engine = engine
        self.secret = secret


class GatewayHandler(BaseHTTPRequestHandler):
    server: GatewayServer
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        # Request bodies, questions and answers are intentionally never logged.
        return

    def _write_json(self, status: HTTPStatus, code: str) -> None:
        body = json.dumps(
            {"success": False, "code": code},
            ensure_ascii=False,
        ).encode("utf-8")
        self.send_response(status)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path != "/health":
            self._write_json(HTTPStatus.NOT_FOUND, "NOT_FOUND")
            return
        if not authorized(self.headers.get("Authorization"), self.server.secret):
            self._write_json(HTTPStatus.UNAUTHORIZED, "UNAUTHORIZED")
            return
        body = b'{"status":"ok"}'
        self.send_response(HTTPStatus.OK)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        started = time.monotonic()
        request_id = clean_text(self.headers.get("X-Request-Id"), 120) or "missing"
        route = "rejected"
        status = HTTPStatus.INTERNAL_SERVER_ERROR
        try:
            if self.path != "/v1/chat":
                status = HTTPStatus.NOT_FOUND
                self._write_json(status, "NOT_FOUND")
                return
            if not authorized(self.headers.get("Authorization"), self.server.secret):
                status = HTTPStatus.UNAUTHORIZED
                self._write_json(status, "UNAUTHORIZED")
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if length < 1 or length > MAX_BODY_BYTES:
                status = HTTPStatus.REQUEST_ENTITY_TOO_LARGE
                self._write_json(status, "PAYLOAD_TOO_LARGE")
                return
            try:
                payload = validate_request(
                    json.loads(self.rfile.read(length).decode("utf-8"))
                )
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
                status = HTTPStatus.BAD_REQUEST
                self._write_json(status, "INVALID_REQUEST")
                return

            try:
                result = self.server.engine.answer(payload)
            except ModelUnavailable:
                route = "model_error"
                status = HTTPStatus.SERVICE_UNAVAILABLE
                self._write_json(status, "MODEL_UNAVAILABLE")
                return
            route = result.route
            body = result.answer.encode("utf-8")
            status = HTTPStatus.OK
            self.send_response(status)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)
        finally:
            elapsed_ms = round((time.monotonic() - started) * 1000)
            print(
                json.dumps(
                    {
                        "request_id": request_id,
                        "route": route,
                        "status": int(status),
                        "elapsed_ms": elapsed_ms,
                    },
                    ensure_ascii=False,
                ),
                flush=True,
            )


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    result.add_argument("--host", default="127.0.0.1")
    result.add_argument("--port", type=int, default=DEFAULT_PORT)
    result.add_argument("--ai-root", type=Path, default=adapter.DEFAULT_AI_ROOT)
    result.add_argument("--endpoint", default="http://127.0.0.1:11434")
    result.add_argument("--model", default=adapter.ALLOWED_MODEL)
    result.add_argument("--timeout", type=float, default=90)
    result.add_argument("--max-tokens", type=int, default=180)
    return result


def main() -> int:
    args = parser().parse_args()
    if args.host != "127.0.0.1":
        print("Gateway may bind only to 127.0.0.1.", file=sys.stderr)
        return 2
    try:
        secret = require_secret(os.environ.get("AI_WIDGET_GATEWAY_SECRET"))
        engine = PilotEngine(
            ai_root=args.ai_root.expanduser().resolve(),
            endpoint=args.endpoint,
            model=args.model,
            timeout=args.timeout,
            max_tokens=args.max_tokens,
        )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Gateway stopped: {error}", file=sys.stderr)
        return 2

    server = GatewayServer(
        (args.host, args.port),
        GatewayHandler,
        engine=engine,
        secret=secret,
    )
    print(
        json.dumps(
            {
                "status": "ready",
                "host": args.host,
                "port": args.port,
                "model": args.model,
                "external_sends": False,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
