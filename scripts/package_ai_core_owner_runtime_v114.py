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


RUNTIME_SHA = "5713258de76d4aa689baf30eae016df54cd8d579"
CONTRACT_SHA = "8834367e7412656b5a83d0c01b05dbffae6d3dee"
RUNTIME_VERSION = "1.1.4"
MODEL = "qwen3.6:27b"
TREE_SHA = "0d45d6ecf67f5bb3d0e249bbf1b367fbf5fe8a36"
PATHS = (
    "sales_conversation_controller",
    "generated/contracts/AI_CORE_SITE_CONTRACT_V1",
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
        "--", "generated/contracts/AI_CORE_SITE_CONTRACT_V1", cwd=repo,
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
