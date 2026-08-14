#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path


RUNTIME_SHA = "c78ae7288d9140d9da3fba39f46d2eac493b4a17"
RUNTIME_TREE_SHA = "afe9e8eeebf3980f38b81c5b2398f6b0239cfe37"
CONTRACT_SHA = "4d75773d60f3453279cbfcee1453f54b15b66567"
CONTRACT_TREE_SHA = "fbe8672b1c2f8d2e7bd9fc4b6bb0d3e710f6ce94"
CONTRACT_PATH = "generated/contracts/AI_CORE_SITE_CONTRACT_V1_2"
CONTRACT_VERSION = "1.2"
CANONICALIZATION_VERSION = "CANONICAL_JSON_HASH_V1"
RUNTIME_VERSION = "1.3.0"
MODEL = "qwen3.6:27b"
PATHS = (
    "sales_conversation_controller",
    CONTRACT_PATH,
    "generated/contracts/OWNER_CANARY_BLOCKED_FORENSIC_V1",
    "generated/contracts/AI_TRACE_VIEWER_V1",
)


def run(*args: str, cwd: Path) -> str:
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-repo", required=True, type=Path)
    parser.add_argument("--contract-repo", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    repo = args.source_repo.expanduser().resolve(strict=True)
    contract_repo = args.contract_repo.expanduser().resolve(strict=True)
    if run("git", "rev-parse", RUNTIME_SHA, cwd=repo) != RUNTIME_SHA:
        raise SystemExit("runtime SHA unavailable")
    if run("git", "rev-parse", f"{RUNTIME_SHA}^{{tree}}", cwd=repo) != RUNTIME_TREE_SHA:
        raise SystemExit("runtime tree mismatch")
    embedded_contract_tree = run(
        "git", "rev-parse", f"{RUNTIME_SHA}:{CONTRACT_PATH}", cwd=repo,
    )
    authoritative_contract_tree = run(
        "git", "rev-parse", f"{CONTRACT_SHA}:{CONTRACT_PATH}",
        cwd=contract_repo,
    )
    if (
        embedded_contract_tree != CONTRACT_TREE_SHA
        or authoritative_contract_tree != CONTRACT_TREE_SHA
        or embedded_contract_tree != authoritative_contract_tree
    ):
        raise SystemExit("authoritative Contract subtree mismatch")

    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="rospark-ai-core-runtime-c78ae728-") as raw:
        temp = Path(raw)
        root = temp / RUNTIME_SHA
        root.mkdir(mode=0o700)
        archive = subprocess.Popen(
            ["git", "archive", "--format=tar", RUNTIME_SHA, *PATHS],
            cwd=repo,
            stdout=subprocess.PIPE,
        )
        assert archive.stdout is not None
        with tarfile.open(fileobj=archive.stdout, mode="r|") as source:
            source.extractall(root, filter="data")
        if archive.wait() != 0:
            raise SystemExit("git archive failed")
        files = {
            path.relative_to(root).as_posix(): digest(path)
            for path in sorted(root.rglob("*"))
            if path.is_file()
        }
        manifest = {
            "schema": "rospark-ai-core-runtime-release-v1",
            "runtime_sha": RUNTIME_SHA,
            "runtime_tree_sha": RUNTIME_TREE_SHA,
            "runtime_version": RUNTIME_VERSION,
            "contract_sha": CONTRACT_SHA,
            "contract_tree_sha": CONTRACT_TREE_SHA,
            "contract_version": CONTRACT_VERSION,
            "canonicalization_version": CANONICALIZATION_VERSION,
            "model": MODEL,
            "immutable_path_basename": RUNTIME_SHA,
            "files": files,
        }
        manifest_path = root / "AI_CORE_RUNTIME_RELEASE_MANIFEST.json"
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2)
            + "\n",
            encoding="utf-8",
        )
        os.chmod(manifest_path, 0o600)
        temporary_tar = temp / "runtime.tar"

        def normalized(info: tarfile.TarInfo) -> tarfile.TarInfo:
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            info.mtime = 0
            return info

        with tarfile.open(temporary_tar, "w", format=tarfile.PAX_FORMAT) as target:
            target.add(root, arcname=RUNTIME_SHA, recursive=True, filter=normalized)
        temporary_output = output.with_suffix(output.suffix + ".tmp")
        with temporary_tar.open("rb") as source, temporary_output.open("wb") as raw_target:
            with gzip.GzipFile(
                filename="", mode="wb", fileobj=raw_target, mtime=0,
            ) as target:
                shutil.copyfileobj(source, target)
        os.replace(temporary_output, output)

    print(json.dumps({
        "runtime_sha": RUNTIME_SHA,
        "runtime_tree_sha": RUNTIME_TREE_SHA,
        "contract_sha": CONTRACT_SHA,
        "contract_tree_sha": CONTRACT_TREE_SHA,
        "artifact": str(output),
        "artifact_sha256": digest(output),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
