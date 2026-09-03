#!/usr/bin/env python3
"""Owner-only HTTP bridge to an immutable Agent Pilot release.

The bridge is transport/integration code.  It does not alter Agent Pilot
prompts, routing, models, evidence policy, or semantic behavior.
"""

from __future__ import annotations

import hmac
import importlib
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


EXPECTED_RUNTIME_SHA = "c41935fbb29fba6c1d4f97b61723a682d89c6361"
SERVICE_VERSION = "AGENT_PILOT_OWNER_CANARY_BRIDGE_V1"
MAX_BODY_BYTES = 65_536
IDENTIFIER = re.compile(r"^[a-zA-Z0-9_-]{3,80}$")


def _required_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"{name}_MISSING")
    return value


def _git(runtime_root: Path, *arguments: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(runtime_root), *arguments],
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    if completed.returncode != 0:
        raise RuntimeError("AGENT_PILOT_RELEASE_GIT_UNAVAILABLE")
    return completed.stdout.strip()


def verify_release(runtime_root: Path, expected_sha: str) -> None:
    if expected_sha != EXPECTED_RUNTIME_SHA:
        raise RuntimeError("AGENT_PILOT_EXPECTED_SHA_INVALID")
    if _git(runtime_root, "rev-parse", "HEAD") != expected_sha:
        raise RuntimeError("AGENT_PILOT_RUNTIME_MISMATCH")
    if _git(runtime_root, "status", "--porcelain", "--untracked-files=no"):
        raise RuntimeError("AGENT_PILOT_RELEASE_DIRTY")
    required = (
        runtime_root / "agent-pilot" / "runtime" / "live" / "controlled_pilot.py",
        runtime_root / "agent-pilot" / "knowledge" / "registry.v2.1.json",
        runtime_root / "agent-pilot" / "profiles" / "advisors.v1.json",
    )
    if any(not path.is_file() for path in required):
        raise RuntimeError("AGENT_PILOT_RELEASE_INCOMPLETE")


def _safe_owner_card(session: Any) -> dict[str, Any]:
    owner_card = getattr(session, "owner_card", None)
    if not callable(owner_card):
        return {
            "confirmed_facts": [],
            "inferred_facts": [],
            "open_questions": [],
        }
    value = owner_card()
    return value if isinstance(value, dict) else {}


def _safe_selected_evidence(
    builder: Any,
    provenance: Any,
    claim_plan: Any = (),
) -> list[dict[str, Any]]:
    if provenance is None:
        return []
    used_ids = {
        str(evidence_id)
        for claim in (claim_plan or ())
        if isinstance(claim, dict)
        for evidence_id in (claim.get("evidence_ids") or ())
    }
    result: list[dict[str, Any]] = []
    for raw in getattr(provenance, "selected_chunks", ())[:12]:
        item = dict(raw)
        source_id = str(item.get("source_id") or "")[:160]
        metadata = builder.source_metadata(source_id) or {}
        excerpt = str(item.get("excerpt") or item.get("text") or "")[:800]
        result.append({
            "knowledge_id": str(item.get("knowledge_id") or "")[:160],
            "source_id": source_id,
            "authority_class": str(
                metadata.get("authority_class") or item.get("authority_class") or ""
            )[:80],
            "approval_status": str(metadata.get("approval_status") or "")[:40],
            "customer_facing": metadata.get("customer_facing") is True,
            "evidence_role": str(metadata.get("evidence_role") or "")[:40],
            "excerpt": excerpt,
            "used_in_final": str(item.get("knowledge_id") or "") in used_ids,
            "authorization": (
                "pass"
                if metadata.get("approval_status") == "approved"
                and metadata.get("customer_facing") is True
                else "fail"
            ),
        })
    return result


class PilotRuntime:
    def __init__(self) -> None:
        self.runtime_root = Path(_required_env("AGENT_PILOT_RELEASE_ROOT")).resolve()
        self.expected_sha = os.environ.get(
            "AGENT_PILOT_EXPECTED_SHA", EXPECTED_RUNTIME_SHA
        ).strip()
        self.secret = _required_env("AGENT_PILOT_BRIDGE_SECRET")
        if len(self.secret.encode("utf-8")) < 32:
            raise RuntimeError("AGENT_PILOT_BRIDGE_SECRET_INVALID")
        verify_release(self.runtime_root, self.expected_sha)

        package_root = self.runtime_root / "agent-pilot"
        sys.path.insert(0, str(package_root))
        transport_module = importlib.import_module("runtime.codex_transport")
        pilot_module = importlib.import_module("runtime.live")
        state_dir = Path(_required_env("AGENT_PILOT_STATE_DIR")).resolve()
        trace_path = Path(_required_env("AGENT_PILOT_TRACE_PATH")).resolve()
        state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        trace_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.trace_path = trace_path
        self.state_dir = state_dir
        timeout = float(os.environ.get("AGENT_PILOT_CODEX_TIMEOUT_SECONDS", "90"))
        self.transport = transport_module.CodexExecTransport(timeout_seconds=timeout)
        self.transport.ensure_available()
        self.pilot = pilot_module.ControlledCodexPilot(
            transport=self.transport,
            manifest_path=package_root / "knowledge" / "registry.v2.1.json",
            profiles_dir=package_root / "profiles",
            state_dir=state_dir,
            call_timeout_seconds=timeout,
            low_risk_direct_path=True,
        )
        self.lock = threading.Lock()

    def authorized(self, header: str | None) -> bool:
        expected = f"Bearer {self.secret}"
        return bool(header and hmac.compare_digest(header, expected))

    def _append_trace(self, value: dict[str, Any]) -> None:
        line = json.dumps(value, ensure_ascii=False, sort_keys=True) + "\n"
        descriptor = os.open(
            self.trace_path,
            os.O_APPEND | os.O_CREAT | os.O_WRONLY,
            0o600,
        )
        try:
            os.write(descriptor, line.encode("utf-8"))
        finally:
            os.close(descriptor)

    def process(self, payload: dict[str, Any], request_id: str) -> tuple[int, dict[str, Any]]:
        conversation_id = payload.get("conversation_id")
        turn_id = payload.get("turn_id")
        message = payload.get("message")
        expected_sha = payload.get("expected_runtime_sha")
        if expected_sha != self.expected_sha:
            return HTTPStatus.CONFLICT, {
                "success": False,
                "code": "AGENT_PILOT_RUNTIME_MISMATCH",
                "runtime_sha": self.expected_sha,
            }
        if (
            not isinstance(conversation_id, str)
            or not IDENTIFIER.fullmatch(conversation_id)
            or not isinstance(turn_id, str)
            or not IDENTIFIER.fullmatch(turn_id)
            or not isinstance(message, str)
            or not message.strip()
            or len(message) > 8_000
        ):
            return HTTPStatus.BAD_REQUEST, {
                "success": False,
                "code": "AGENT_PILOT_REQUEST_INVALID",
            }

        with self.lock:
            started = time.monotonic()
            initial_call = len(self.transport.calls)
            trace_id = f"apt_{uuid.uuid4().hex}"
            state_path = self.state_dir / f"{conversation_id}.json"
            previous_state = state_path.read_bytes() if state_path.is_file() else None

            def restore_unpublished_state() -> None:
                if previous_state is None:
                    state_path.unlink(missing_ok=True)
                    return
                temporary = state_path.with_suffix(".rollback.tmp")
                temporary.write_bytes(previous_state)
                os.chmod(temporary, 0o600)
                temporary.replace(state_path)

            try:
                session = self.pilot.new_session(conversation_id)
                object_card_before = _safe_owner_card(session)
                completed_turn_result = getattr(session, "completed_turn_result", None)
                durable_result_reused = bool(
                    callable(completed_turn_result)
                    and completed_turn_result(turn_id, message.strip()) is not None
                )
                result = self.pilot.process_turn(
                    session,
                    message.strip(),
                    turn_id=turn_id,
                )
                object_card_after = _safe_owner_card(session)
                calls = self.transport.calls[initial_call:]
                result_roles = set(getattr(result, "roles", ()) or ())
                role_calls = [
                    {
                        "sequence": index + 1,
                        "role": call.role,
                        "latency_ms": call.latency_ms,
                        "model": call.model,
                        "reasoning_effort": call.reasoning_effort,
                        "capability_escalations": call.capability_escalations,
                        "status": "pass",
                        "used_downstream": (
                            call.role in result_roles
                            or call.role == "orchestrator"
                            or (call.role == "critic" and result.critic_used)
                        ),
                    }
                    for index, call in enumerate(calls)
                ]
                claim_plan = list(getattr(result, "claim_plan", ()) or ())
                selected_evidence = _safe_selected_evidence(
                    self.pilot.builder,
                    self.pilot.builder.last_provenance,
                    claim_plan,
                )
                trace = {
                    "schema": "AGENT_PILOT_OWNER_CANARY_TURN_V1",
                    "trace_id": trace_id,
                    "request_id": request_id,
                    "conversation_id": conversation_id,
                    "turn_id": turn_id,
                    "runtime_sha": self.expected_sha,
                    "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "latency_ms": result.latency_ms,
                    "bridge_wall_ms": round((time.monotonic() - started) * 1000),
                    "role_calls": role_calls,
                    "codex_calls": int(getattr(result, "codex_calls", len(calls))),
                    "transport_calls_this_request": len(calls),
                    "duplicate_execution_prevented": durable_result_reused,
                    "durable_result_reused": durable_result_reused,
                    "critic_used": result.critic_used,
                    "reconsideration_used": result.reconsideration_used,
                    "fallback": result.fallback,
                    "selected_evidence": selected_evidence,
                    "object_card_before": object_card_before,
                    "object_card_after": object_card_after,
                    "critic_findings": getattr(result, "critic_findings", None),
                    "claim_plan": claim_plan,
                    "answer_obligations": list(
                        getattr(result, "answer_obligations", ()) or ()
                    ),
                    "slowest_role": getattr(result, "slowest_role", None),
                    "final_answer": result.answer,
                    "safety_findings": list(result.safety_findings),
                    "metadata_defects": list(result.metadata_defects),
                }
                self._append_trace(trace)
                if result.fallback:
                    restore_unpublished_state()
                    return HTTPStatus.SERVICE_UNAVAILABLE, {
                        "success": False,
                        "code": "AGENT_PILOT_INTERNAL_FALLBACK",
                        "runtime_sha": self.expected_sha,
                        "trace_id": trace_id,
                        "bridge_version": SERVICE_VERSION,
                        "trace": trace,
                    }
                return HTTPStatus.OK, {
                    "success": True,
                    "fallback": False,
                    "answer": result.answer,
                    "runtime_sha": self.expected_sha,
                    "latency_ms": result.latency_ms,
                    "role_calls": role_calls,
                    "critic_used": result.critic_used,
                    "reconsideration_used": result.reconsideration_used,
                    "selected_evidence": selected_evidence,
                    "trace_id": trace_id,
                    "bridge_version": SERVICE_VERSION,
                    "trace": trace,
                }
            except Exception as error:  # fail closed at the bridge boundary
                restore_unpublished_state()
                error_trace = {
                    "schema": "AGENT_PILOT_OWNER_CANARY_TURN_V1",
                    "trace_id": trace_id,
                    "request_id": request_id,
                    "conversation_id": conversation_id,
                    "turn_id": turn_id,
                    "runtime_sha": self.expected_sha,
                    "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "fallback": True,
                    "error_class": type(error).__name__,
                    "role_calls": [],
                    "selected_evidence": [],
                    "object_card_before": {},
                    "object_card_after": {},
                    "critic_used": False,
                    "reconsideration_used": False,
                    "safety_findings": [],
                    "metadata_defects": [],
                }
                self._append_trace(error_trace)
                return HTTPStatus.SERVICE_UNAVAILABLE, {
                    "success": False,
                    "code": "AGENT_PILOT_RUNTIME_ERROR",
                    "runtime_sha": self.expected_sha,
                    "trace_id": trace_id,
                    "bridge_version": SERVICE_VERSION,
                    "trace": error_trace,
                }


class Handler(BaseHTTPRequestHandler):
    runtime: PilotRuntime

    def log_message(self, _format: str, *_args: object) -> None:
        return

    def _json(self, status: int, value: dict[str, Any]) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(int(status))
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        if self.runtime.authorized(self.headers.get("Authorization")):
            return True
        self._json(HTTPStatus.UNAUTHORIZED, {
            "success": False,
            "code": "AGENT_PILOT_AUTH_DENIED",
        })
        return False

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") not in {"/health", "/agent-pilot/health"}:
            self._json(HTTPStatus.NOT_FOUND, {"success": False, "code": "NOT_FOUND"})
            return
        if not self._authorized():
            return
        self._json(HTTPStatus.OK, {
            "success": True,
            "status": "ready",
            "service_version": SERVICE_VERSION,
            "runtime_sha": self.runtime.expected_sha,
            "execution": "sequential",
            "low_risk_direct_path": True,
            "knowledge_call_elimination": True,
        })

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") not in {"/v1/chat", "/agent-pilot/v1/chat"}:
            self._json(HTTPStatus.NOT_FOUND, {"success": False, "code": "NOT_FOUND"})
            return
        if not self._authorized():
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY_BYTES:
            self._json(HTTPStatus.BAD_REQUEST, {
                "success": False,
                "code": "AGENT_PILOT_REQUEST_INVALID",
            })
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            payload = None
        if not isinstance(payload, dict):
            self._json(HTTPStatus.BAD_REQUEST, {
                "success": False,
                "code": "AGENT_PILOT_REQUEST_INVALID",
            })
            return
        request_id = self.headers.get("X-Request-Id") or f"req_{uuid.uuid4().hex}"
        status, result = self.runtime.process(payload, request_id[:128])
        self._json(status, result)


def main() -> int:
    runtime = PilotRuntime()
    Handler.runtime = runtime
    host = os.environ.get("AGENT_PILOT_BIND_HOST", "127.0.0.1")
    port = int(os.environ.get("AGENT_PILOT_BIND_PORT", "8791"))
    if host not in {"127.0.0.1", "::1"}:
        raise RuntimeError("AGENT_PILOT_BIND_HOST_FORBIDDEN")
    server = ThreadingHTTPServer((host, port), Handler)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
