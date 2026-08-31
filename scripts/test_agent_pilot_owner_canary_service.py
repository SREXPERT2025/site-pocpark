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


if __name__ == "__main__":
    unittest.main(verbosity=2)
