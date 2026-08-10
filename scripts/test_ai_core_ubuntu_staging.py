#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import os
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ai_core_owner_runtime_bridge import (  # noqa: E402
    CANONICALIZATION_VERSION,
    CONTRACT_SHA,
    CONTRACT_VERSION,
    RUNTIME_SHA,
    OwnerRuntimeBridge,
)


def request(runtime: Path) -> dict:
    fixture = runtime / "generated/contracts/AI_CORE_SITE_CONTRACT_V1_1/fixtures/valid/request-qwen.json"
    return json.loads(fixture.read_text(encoding="utf-8"))


def main() -> int:
    artifact = ROOT / "release/owner-canary-final-runtime-deec5a" / (
        f"ai-core-runtime-{RUNTIME_SHA}.tar.gz"
    )
    with tempfile.TemporaryDirectory(prefix="ai-core-ubuntu-stage-") as raw:
        temp = Path(raw)
        with tarfile.open(artifact, "r:gz") as source:
            source.extractall(temp, filter="data")
        runtime = temp / RUNTIME_SHA
        sys.path.insert(0, str(runtime))
        from sales_conversation_controller.site_contract_runtime_v1.executors import (  # noqa: E402
            QwenStub,
            StubExecutorUnavailable,
        )
        from sales_conversation_controller.site_contract_runtime_v1.canonical import (  # noqa: E402
            sha256 as runtime_sha256,
        )

        class Unavailable:
            executor = "qwen"

            def execute(self, _context):
                raise StubExecutorUnavailable("deterministic_unavailable")

        valid_request = request(runtime)
        exact_safe_error = {
            "contract_version": CONTRACT_VERSION,
            "canonicalization_version": CANONICALIZATION_VERSION,
            "success": False,
            "request_id": valid_request["request_id"],
            "error": {
                "code": "VALIDATION_ERROR",
                "category": "validation",
                "retryable": False,
                "safe_message_code": "VALIDATION_ERROR",
                "stage": "validation",
            },
            "trace_id": valid_request["trace_context"]["trace_id"],
        }
        bridge_path = runtime / "sales_conversation_controller/site_contract_runtime_v1/schema_validator.cjs"
        contract_root = runtime / "generated/contracts/AI_CORE_SITE_CONTRACT_V1"
        missing_env = dict(os.environ, NODE_PATH=str(temp / "missing-node-modules"))
        unavailable_validator = subprocess.run(
            ["node", str(bridge_path), str(contract_root), "error-envelope-v1.schema.json"],
            input=json.dumps(exact_safe_error), text=True,
            capture_output=True, check=False, env=missing_env,
        )
        assert unavailable_validator.returncode != 0
        assert "Cannot find module 'ajv'" in unavailable_validator.stderr

        bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=QwenStub(),
        )
        assert str(bridge.validator_node_modules) == str(ROOT / "node_modules")
        envelope_validation = bridge.validator.validate(
            "error-envelope-v1.schema.json", exact_safe_error
        )
        assert envelope_validation.valid
        assert envelope_validation.errors == ()

        # A. Valid AI Core response.
        valid = bridge.process(valid_request)
        assert valid["response"]["success"] is True
        assert bridge.adapter.last_trace["model_requests"] == 0

        # B. Safe error envelope produced by the immutable Runtime.
        unavailable_bridge = OwnerRuntimeBridge(
            runtime_dir=runtime,
            endpoint="http://127.0.0.1:11434",
            timeout=1,
            keep_alive="2h",
            executor=Unavailable(),
        )
        unavailable = unavailable_bridge.process(valid_request)["response"]
        assert unavailable["success"] is False
        assert unavailable["error"] == {
            "code": "EXECUTOR_UNAVAILABLE",
            "category": "executor",
            "retryable": True,
            "safe_message_code": "EXECUTOR_UNAVAILABLE",
            "stage": "executor",
        }
        assert unavailable_bridge.validator.validate(
            "error-envelope-v1.schema.json", unavailable
        ).valid

        # C. Malformed request is converted to a schema-valid safe error.
        malformed = bridge.process({})["response"]
        assert malformed["error"]["code"] == "VALIDATION_ERROR"
        assert bridge.validator.validate(
            "error-envelope-v1.schema.json", malformed
        ).valid

        # D. Missing exact Runtime is a hard, fail-closed startup error.
        try:
            OwnerRuntimeBridge(
                runtime_dir=temp / "runtime-unavailable",
                endpoint="http://127.0.0.1:11434",
                timeout=1,
                keep_alive="2h",
                executor=QwenStub(),
            )
        except FileNotFoundError:
            pass
        else:
            raise AssertionError("unavailable runtime accepted")

        # E. Corrupted request correlation is a contract validation error.
        invalid_hash = copy.deepcopy(valid_request)
        invalid_hash["request_payload_hash"] = "0" * 64
        contract_error = bridge.process(invalid_hash)["response"]
        assert contract_error["error"]["code"] == "VALIDATION_ERROR"

        # F. Deterministic engineering request, still with zero model calls.
        engineering = copy.deepcopy(valid_request)
        engineering["request_id"] = "req_engineering_001"
        engineering["idempotency_key"] = "idem:engineering:001"
        engineering["payload"]["message_id"] = "msg_engineering_001"
        engineering["payload"]["current_message"] = (
            "Как организовать проезд сотрудников, арендаторов и гостей?"
        )
        engineering["request_payload_hash"] = runtime_sha256(engineering["payload"])
        engineering_response = bridge.process(engineering)["response"]
        assert engineering_response["success"] is True
        assert engineering_response["executor_trace"]["planned_executor"] == "qwen"
        assert bridge.adapter.last_trace["model_requests"] == 0

        # G. Mutation acknowledgement for the valid response.
        mutations = valid["response"]["state_mutations"]
        assert mutations
        acknowledgement = {
            "contract_version": CONTRACT_VERSION,
            "canonicalization_version": CANONICALIZATION_VERSION,
            "request_id": valid_request["request_id"],
            "response_id": valid["response"]["response_id"],
            "acknowledged_at": "2026-08-08T12:00:00Z",
            "acknowledgements": [
                {
                    "mutation_id": item["mutation_id"],
                    "status": "applied",
                    "reason_code": "applied",
                    "entity_version_before": item["expected_state_version"],
                    "entity_version_after": item["proposed_state_version"],
                    "audit_ref": f"auditref:{item['mutation_id']}",
                }
                for item in mutations
            ],
        }
        assert bridge.acknowledge(acknowledgement)["accepted"] is True

        # H. Duplicate request returns exact cached response.
        assert bridge.process(valid_request) == valid
        assert bridge.adapter.last_trace["idempotent_cache_hit"] is True

        result = {
            "schema": "rospark-public-ai-core-ubuntu-staging-acceptance-v1",
            "python_version": sys.version.split()[0],
            "node_version": subprocess.check_output(
                ["node", "--version"], text=True
            ).strip(),
            "runtime_sha": RUNTIME_SHA,
            "contract_sha": CONTRACT_SHA,
            "safe_error_object": exact_safe_error,
            "safe_error_schema": "error-envelope-v1.schema.json",
            "invalid_field": None,
            "root_cause": "ajv_module_resolution_unavailable",
            "pre_fix_evidence": "Cannot find module 'ajv'",
            "acceptance": {
                "valid_response": "pass",
                "safe_error_envelope": "pass",
                "malformed_request": "pass",
                "runtime_unavailable": "pass",
                "contract_validation": "pass",
                "deterministic_engineering_request": "pass",
                "mutation_acknowledgement": "pass",
                "duplicate_idempotent_request": "pass",
            },
            "model_requests": 0,
        }
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
