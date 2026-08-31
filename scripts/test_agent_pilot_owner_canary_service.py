#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "agent_pilot_owner_canary_service",
    ROOT / "scripts" / "agent_pilot_owner_canary_service.py",
)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FakeRuntime:
    expected_sha = MODULE.EXPECTED_RUNTIME_SHA
    secret = "service-test-secret-at-least-32-bytes"

    def authorized(self, header):
        return header == f"Bearer {self.secret}"

    def process(self, payload, request_id):
        if payload.get("expected_runtime_sha") != self.expected_sha:
            return 409, {"success": False, "code": "AGENT_PILOT_RUNTIME_MISMATCH"}
        return 200, {
            "success": True,
            "fallback": False,
            "answer": "test answer",
            "runtime_sha": self.expected_sha,
            "latency_ms": 1,
            "role_calls": [],
            "critic_used": True,
            "reconsideration_used": False,
            "selected_evidence": [],
            "trace_id": request_id,
        }


class ServiceContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        MODULE.Handler.runtime = FakeRuntime()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), MODULE.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, path, *, payload=None, secret=None):
        body = None if payload is None else json.dumps(payload).encode()
        request = urllib.request.Request(
            self.base + path,
            data=body,
            method="GET" if body is None else "POST",
            headers={
                "Authorization": f"Bearer {secret}" if secret else "",
                "Content-Type": "application/json",
                "X-Request-Id": "apt_service_contract_0001",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=2) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def test_health_requires_bearer(self):
        self.assertEqual(self.request("/health")[0], 401)
        status, body = self.request("/health", secret=FakeRuntime.secret)
        self.assertEqual(status, 200)
        self.assertEqual(body["runtime_sha"], MODULE.EXPECTED_RUNTIME_SHA)
        self.assertEqual(body["execution"], "sequential")

    def test_chat_contract_and_runtime_pin(self):
        payload = {
            "conversation_id": "conversation_test_0001",
            "turn_id": "turn_test_0001",
            "message": "test",
            "expected_runtime_sha": MODULE.EXPECTED_RUNTIME_SHA,
        }
        status, body = self.request(
            "/v1/chat", payload=payload, secret=FakeRuntime.secret
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["answer"], "test answer")
        payload["expected_runtime_sha"] = "0" * 40
        self.assertEqual(
            self.request("/v1/chat", payload=payload, secret=FakeRuntime.secret)[0],
            409,
        )

    def test_release_pin(self):
        release = Path(os.environ["AGENT_PILOT_TEST_RELEASE_ROOT"]).resolve()
        MODULE.verify_release(release, MODULE.EXPECTED_RUNTIME_SHA)
        with self.assertRaisesRegex(RuntimeError, "EXPECTED_SHA_INVALID"):
            MODULE.verify_release(release, "0" * 40)

    def test_internal_fallback_rolls_back_unpublished_pilot_state(self):
        with tempfile.TemporaryDirectory() as temporary:
            state_dir = Path(temporary) / "state"
            state_dir.mkdir()
            conversation_id = "conversation_rollback_0001"
            state_path = state_dir / f"{conversation_id}.json"
            state_path.write_text('{"version": 7}', encoding="utf-8")

            class Builder:
                last_provenance = None

                @staticmethod
                def source_metadata(_source_id):
                    return None

            class Pilot:
                builder = Builder()

                @staticmethod
                def new_session(_conversation_id):
                    return object()

                @staticmethod
                def process_turn(_session, _message):
                    state_path.write_text('{"version": 8}', encoding="utf-8")
                    return SimpleNamespace(
                        latency_ms=1, critic_used=True,
                        reconsideration_used=False, fallback=True,
                        answer="internal fallback", safety_findings=(),
                        metadata_defects=(),
                    )

            runtime = MODULE.PilotRuntime.__new__(MODULE.PilotRuntime)
            runtime.expected_sha = MODULE.EXPECTED_RUNTIME_SHA
            runtime.state_dir = state_dir
            runtime.trace_path = Path(temporary) / "trace.jsonl"
            runtime.transport = SimpleNamespace(calls=[])
            runtime.pilot = Pilot()
            runtime.lock = threading.Lock()
            status, body = runtime.process({
                "conversation_id": conversation_id,
                "turn_id": "turn_rollback_0001",
                "message": "test",
                "expected_runtime_sha": MODULE.EXPECTED_RUNTIME_SHA,
            }, "request_rollback_0001")
            self.assertEqual(status, 503)
            self.assertEqual(body["code"], "AGENT_PILOT_INTERNAL_FALLBACK")
            self.assertEqual(state_path.read_text(encoding="utf-8"), '{"version": 7}')


if __name__ == "__main__":
    unittest.main(verbosity=2)
