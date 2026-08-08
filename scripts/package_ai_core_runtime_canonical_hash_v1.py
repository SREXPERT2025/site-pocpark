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


RUNTIME_SHA = "b9c58dbbd0cd28fcc0de9e2751b0ddd5a3a66763"
CONTRACT_SHA = "6cd71a5596346925ecdd2ffeb9d45262d881ee93"
CONTRACT_VERSION = "1.1"
CANONICALIZATION_VERSION = "CANONICAL_JSON_HASH_V1"
RUNTIME_VERSION = "1.2.0"
MODEL = "qwen3.6:27b"
TREE_SHA = "92f2bda1c541f3d1aea58d5a4e4f832c9ee4f588"
PATHS = (
    "sales_conversation_controller",
    "generated/contracts/AI_CORE_SITE_CONTRACT_V1_1",
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
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    repo = args.source_repo.expanduser().resolve(strict=True)
    if run("git", "rev-parse", RUNTIME_SHA, cwd=repo) != RUNTIME_SHA:
        raise SystemExit("runtime SHA unavailable")
    if run("git", "rev-parse", f"{RUNTIME_SHA}^{{tree}}", cwd=repo) != TREE_SHA:
        raise SystemExit("runtime tree mismatch")
    subprocess.check_call(
        ["git", "merge-base", "--is-ancestor", CONTRACT_SHA, RUNTIME_SHA],
        cwd=repo,
    )
    contract_diff = run(
        "git", "diff", "--name-only", CONTRACT_SHA, RUNTIME_SHA,
        "--", "generated/contracts/AI_CORE_SITE_CONTRACT_V1_1", cwd=repo,
    )
    if contract_diff:
        raise SystemExit("contract artifacts changed after pinned Contract SHA")

    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="rospark-ai-core-runtime-") as raw:
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
            "runtime_tree_sha": TREE_SHA,
            "runtime_version": RUNTIME_VERSION,
            "contract_sha": CONTRACT_SHA,
            "contract_version": CONTRACT_VERSION,
            "canonicalization_version": CANONICALIZATION_VERSION,
            "model": MODEL,
            "immutable_path_basename": RUNTIME_SHA,
            "files": files,
        }
        (root / "AI_CORE_RUNTIME_RELEASE_MANIFEST.json").write_text(
            json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2)
            + "\n",
            encoding="utf-8",
        )
        os.chmod(root / "AI_CORE_RUNTIME_RELEASE_MANIFEST.json", 0o600)
        temporary_tar = temp / "runtime.tar"
        def normalized(info: tarfile.TarInfo) -> tarfile.TarInfo:
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            info.mtime = 0
            return info
        with tarfile.open(temporary_tar, "w", format=tarfile.PAX_FORMAT) as target:
            target.add(
                root,
                arcname=RUNTIME_SHA,
                recursive=True,
                filter=normalized,
            )
        temporary_output = output.with_suffix(output.suffix + ".tmp")
        with temporary_tar.open("rb") as source, temporary_output.open("wb") as raw_target:
            with gzip.GzipFile(
                filename="", mode="wb", fileobj=raw_target, mtime=0
            ) as target:
                shutil.copyfileobj(source, target)
        os.replace(temporary_output, output)
    print(json.dumps({
        "runtime_sha": RUNTIME_SHA,
        "contract_sha": CONTRACT_SHA,
        "artifact": str(output),
        "artifact_sha256": digest(output),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
