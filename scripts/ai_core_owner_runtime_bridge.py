from __future__ import annotations

import hashlib
import importlib
import json
import copy
import os
import sys
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


RUNTIME_SHA = "c78ae7288d9140d9da3fba39f46d2eac493b4a17"
CONTRACT_SHA = "4d75773d60f3453279cbfcee1453f54b15b66567"
CONTRACT_TREE_SHA = "fbe8672b1c2f8d2e7bd9fc4b6bb0d3e710f6ce94"
CONTRACT_VERSION = "1.2"
CANONICALIZATION_VERSION = "CANONICAL_JSON_HASH_V1"
RUNTIME_VERSION = "1.3.0"
MODEL = "qwen3.6:27b"
MANIFEST_NAME = "AI_CORE_RUNTIME_RELEASE_MANIFEST.json"
SITE_ROOT = Path(__file__).resolve().parents[1]


def configure_schema_validator_node_path(
    site_root: Path = SITE_ROOT,
) -> Path:
    """Make the immutable Runtime's Ajv subprocess portable across hosts."""
    node_modules = site_root.expanduser().resolve(strict=True) / "node_modules"
    ajv_package = node_modules / "ajv" / "package.json"
    if not ajv_package.is_file() or ajv_package.is_symlink():
        raise ValueError("AI_CORE_SCHEMA_VALIDATOR_DEPENDENCY_MISSING")
    current = [
        item for item in os.environ.get("NODE_PATH", "").split(os.pathsep)
        if item
    ]
    resolved = str(node_modules)
    os.environ["NODE_PATH"] = os.pathsep.join(
        [resolved, *(item for item in current if item != resolved)]
    )
    return node_modules


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_runtime_release(runtime_dir: Path) -> dict[str, Any]:
    root = runtime_dir.expanduser().resolve(strict=True)
    if runtime_dir.is_symlink() or root.name != RUNTIME_SHA:
        raise ValueError("AI_CORE_RUNTIME_PATH_NOT_IMMUTABLE")
    manifest_path = root / MANIFEST_NAME
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise ValueError("AI_CORE_RUNTIME_MANIFEST_MISSING")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if (
        manifest.get("runtime_sha") != RUNTIME_SHA
        or manifest.get("contract_sha") != CONTRACT_SHA
        or manifest.get("contract_tree_sha") != CONTRACT_TREE_SHA
        or manifest.get("contract_version") != CONTRACT_VERSION
        or manifest.get("canonicalization_version")
        != CANONICALIZATION_VERSION
        or manifest.get("runtime_version") != RUNTIME_VERSION
        or manifest.get("model") != MODEL
    ):
        raise ValueError("AI_CORE_RUNTIME_MANIFEST_PIN_MISMATCH")
    files = manifest.get("files")
    if not isinstance(files, dict) or not files:
        raise ValueError("AI_CORE_RUNTIME_MANIFEST_EMPTY")
    for relative, expected in files.items():
        if not isinstance(relative, str) or not isinstance(expected, str):
            raise ValueError("AI_CORE_RUNTIME_MANIFEST_INVALID")
        candidate = (root / relative).resolve(strict=True)
        if root not in candidate.parents or candidate.is_symlink() or not candidate.is_file():
            raise ValueError("AI_CORE_RUNTIME_FILE_UNSAFE")
        if _sha256(candidate) != expected:
            raise ValueError("AI_CORE_RUNTIME_FILE_HASH_MISMATCH")
    return manifest


@dataclass(frozen=True)
class _ExecutorOutput:
    answer: str
    latency_ms: int
    cost_bucket: str


class QwenOwnerExecutor:
    executor = "qwen"

    def __init__(
        self,
        *,
        endpoint: str,
        timeout: float,
        keep_alive: str,
        max_tokens: int = 320,
        opener: Any = urllib.request.urlopen,
    ) -> None:
        if endpoint.rstrip("/") != "http://127.0.0.1:11434":
            raise ValueError("AI_CORE_QWEN_ENDPOINT_NOT_ALLOWED")
        self.endpoint = endpoint.rstrip("/")
        self.timeout = timeout
        self.keep_alive = keep_alive
        self.max_tokens = max_tokens
        self.opener = opener

    def execute(self, context: dict[str, Any]) -> _ExecutorOutput:
        prompt = str(
            (context.get("model_prompt_contract") or {}).get("serialized_prompt")
            or ""
        ).strip()
        if not prompt:
            raise RuntimeError("AI_CORE_PROMPT_CONTRACT_MISSING")
        body = json.dumps({
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "think": False,
            "options": {
                "temperature": 0,
                "num_predict": self.max_tokens,
                "num_ctx": 32_000,
            },
            "keep_alive": self.keep_alive,
        }, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(
            self.endpoint + "/api/chat",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        started = time.monotonic()
        with self.opener(request, timeout=self.timeout) as response:
            result = json.loads(response.read().decode("utf-8"))
        answer = str((result.get("message") or {}).get("content") or "").strip()
        if not answer:
            raise RuntimeError("AI_CORE_QWEN_EMPTY_RESPONSE")
        return _ExecutorOutput(
            answer=answer,
            latency_ms=round((time.monotonic() - started) * 1000),
            cost_bucket="local_high",
        )


class OwnerRuntimeBridge:
    def __init__(
        self,
        *,
        runtime_dir: Path,
        endpoint: str,
        timeout: float,
        keep_alive: str,
        executor: Any | None = None,
    ) -> None:
        self.validator_node_modules = configure_schema_validator_node_path()
        self.runtime_dir = runtime_dir.expanduser().resolve(strict=True)
        self.manifest = verify_runtime_release(self.runtime_dir)
        sys.path.insert(0, str(self.runtime_dir))
        try:
            adapter_module = importlib.import_module(
                "sales_conversation_controller.site_contract_runtime_v1.adapter"
            )
            constants_module = importlib.import_module(
                "sales_conversation_controller.site_contract_runtime_v1.constants"
            )
            canonical_module = importlib.import_module(
                "sales_conversation_controller.site_contract_runtime_v1.canonical"
            )
            forensic_module = importlib.import_module(
                "sales_conversation_controller.site_contract_runtime_v1.restricted_forensic"
            )
            trace_module = importlib.import_module(
                "sales_conversation_controller.site_contract_runtime_v1.trace_observability"
            )
        finally:
            if sys.path[0] == str(self.runtime_dir):
                sys.path.pop(0)
        adapter_path = Path(adapter_module.__file__).resolve(strict=True)
        constants_path = Path(constants_module.__file__).resolve(strict=True)
        canonical_path = Path(canonical_module.__file__).resolve(strict=True)
        forensic_path = Path(forensic_module.__file__).resolve(strict=True)
        trace_path = Path(trace_module.__file__).resolve(strict=True)
        if (
            self.runtime_dir not in adapter_path.parents
            or self.runtime_dir not in constants_path.parents
            or self.runtime_dir not in canonical_path.parents
            or self.runtime_dir not in forensic_path.parents
            or self.runtime_dir not in trace_path.parents
        ):
            raise ValueError("AI_CORE_RUNTIME_IMPORT_PATH_MISMATCH")
        if (
            adapter_module.OfflineRuntimeAdapterV1.contract_target_sha != CONTRACT_SHA
            or adapter_module.OfflineRuntimeAdapterV1.contract_version != CONTRACT_VERSION
            or adapter_module.OfflineRuntimeAdapterV1.canonicalization_version
            != CANONICALIZATION_VERSION
            or adapter_module.OfflineRuntimeAdapterV1.runtime_version != RUNTIME_VERSION
            or constants_module.CONTRACT_TARGET_SHA != CONTRACT_SHA
            or constants_module.CONTRACT_VERSION != CONTRACT_VERSION
            or constants_module.CANONICALIZATION_VERSION
            != CANONICALIZATION_VERSION
            or forensic_module.RESTRICTED_FORENSIC_SCHEMA_VERSION
            != "OWNER_CANARY_BLOCKED_FORENSIC_V1"
            or trace_module.TRACE_SCHEMA_VERSION != "AI_CORE_RUNTIME_TRACE_V1"
        ):
            raise ValueError("AI_CORE_RUNTIME_CONTRACT_MISMATCH")
        self.bind_runtime_forensic = forensic_module.bind_runtime_release_identity
        self.runtime_trace_sha256 = canonical_module.sha256
        self.runtime_trace_schema_version = trace_module.TRACE_SCHEMA_VERSION
        self.adapter = adapter_module.OfflineRuntimeAdapterV1(
            qwen_executor=executor or QwenOwnerExecutor(
                endpoint=endpoint,
                timeout=timeout,
                keep_alive=keep_alive,
            )
        )
        self.validator = self.adapter.validator
        self.responses: dict[str, dict[str, Any]] = {}
        self.envelopes: dict[str, dict[str, Any]] = {}

    def process(self, request: dict[str, Any]) -> dict[str, Any]:
        response = self.adapter.process(request)
        response_id = response.get("response_id")
        if response.get("success") and isinstance(response_id, str):
            cached = self.envelopes.get(response_id)
            if cached is not None:
                return copy.deepcopy(cached)
        observability_trace = self._bind_observability_trace(
            self.adapter.last_observability_trace
        )
        if not response.get("success"):
            return {
                "runtime_sha": RUNTIME_SHA,
                "runtime_version": RUNTIME_VERSION,
                "contract_sha": CONTRACT_SHA,
                "canonicalization_version": CANONICALIZATION_VERSION,
                "model": MODEL,
                "response": response,
                "observability_trace": observability_trace,
            }
        self.responses[response["response_id"]] = response
        forensic = self.adapter.last_restricted_forensic_evidence
        if forensic is not None:
            forensic = self.bind_runtime_forensic(forensic, RUNTIME_SHA)
        envelope = {
            "runtime_sha": RUNTIME_SHA,
            "runtime_version": RUNTIME_VERSION,
            "contract_sha": CONTRACT_SHA,
            "canonicalization_version": CANONICALIZATION_VERSION,
            "model": MODEL,
            "response": response,
            "restricted_forensic": forensic,
            "observability_trace": observability_trace,
        }
        self.envelopes[response["response_id"]] = copy.deepcopy(envelope)
        return envelope

    def _bind_observability_trace(
        self, value: Any,
    ) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            return None
        trace = copy.deepcopy(value)
        identity = trace.get("identity")
        if not isinstance(identity, dict):
            return None
        identity["runtime_sha"] = RUNTIME_SHA
        self._bind_execution_and_knowledge_evidence(trace)
        trace.pop("trace_sha256", None)
        trace["trace_sha256"] = self.runtime_trace_sha256(trace)
        return trace

    def _bind_execution_and_knowledge_evidence(
        self, trace: dict[str, Any],
    ) -> None:
        """Expose additive v1.2 evidence without changing Runtime semantics."""
        runtime_trace = self.adapter.last_trace
        if not isinstance(runtime_trace, dict):
            return
        executor = runtime_trace.get("executor_trace")
        knowledge = runtime_trace.get("knowledge_retrieval")
        routing = trace.get("routing")
        stages = trace.get("pipeline")
        if isinstance(executor, dict) and isinstance(routing, dict):
            routing.update({
                "execution_mode": executor.get("execution_mode"),
                "model_request_count": executor.get("model_request_count"),
                "deterministic_handler": executor.get("deterministic_handler"),
                "model_attempt_present": bool(executor.get("attempts")),
                "executor": executor.get("final_executor"),
            })
        if not isinstance(knowledge, dict) or not isinstance(stages, list):
            return
        for stage in stages:
            if not isinstance(stage, dict) or stage.get("name") != "knowledge_sources":
                continue
            stage["status"] = (
                "pass" if knowledge.get("attempted") else "not_used"
            )
            stage["summary"] = (
                "Required knowledge path completed."
                if knowledge.get("required") and knowledge.get("available")
                else "Required knowledge is unavailable; executor must not run."
                if knowledge.get("required")
                else "No knowledge source was required."
            )
            stage["input"] = {
                "required": bool(knowledge.get("required")),
                "attempted": bool(knowledge.get("attempted")),
            }
            stage["output"] = {
                "available": bool(knowledge.get("available")),
                "retrieval_result_count": int(
                    knowledge.get("retrieval_result_count") or 0
                ),
                "knowledge_projection_count": int(
                    knowledge.get("knowledge_projection_count") or 0
                ),
                "executor_received_knowledge_count": int(
                    knowledge.get("executor_received_knowledge_count") or 0
                ),
                "public_identity_received": bool(
                    knowledge.get("public_identity_received")
                ),
                "trusted_user_fact_count": int(
                    knowledge.get("trusted_user_fact_count") or 0
                ),
                "selected_knowledge_refs": copy.deepcopy(
                    knowledge.get("selected_knowledge_refs") or []
                ),
                "reason_codes": copy.deepcopy(
                    knowledge.get("reason_codes") or []
                ),
            }
            break

    def acknowledge(self, acknowledgement: dict[str, Any]) -> dict[str, Any]:
        validation = self.validator.validate(
            "mutation-ack-v1.schema.json", acknowledgement
        )
        if not validation.valid:
            raise ValueError("AI_CORE_MUTATION_ACK_INVALID")
        response = self.responses.get(str(acknowledgement["response_id"]))
        if response is None:
            raise ValueError("AI_CORE_MUTATION_ACK_RESPONSE_UNKNOWN")
        expected = {
            item["mutation_id"] for item in response.get("state_mutations") or []
        }
        observed = {
            item["mutation_id"] for item in acknowledgement["acknowledgements"]
        }
        if expected != observed:
            raise ValueError("AI_CORE_MUTATION_ACK_SET_MISMATCH")
        return {
            "accepted": True,
            "runtime_sha": RUNTIME_SHA,
            "contract_sha": CONTRACT_SHA,
            "canonicalization_version": CANONICALIZATION_VERSION,
            "response_id": response["response_id"],
        }
