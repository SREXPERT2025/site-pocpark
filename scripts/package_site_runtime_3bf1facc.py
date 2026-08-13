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


BASE_SITE_SHA = "7d79a63577f21df379279cd6836fc721cca29626"
RUNTIME_SHA = "3bf1facc9cc16672c1f1c01620c89f51eb39c28f"
ROLLBACK_RUNTIME_SHA = "78db9e3c3363720fe680056873b41b332f319b96"
CONTRACT_SHA = "4d75773d60f3453279cbfcee1453f54b15b66567"
CONTRACT_VERSION = "1.2"
CANONICALIZATION_VERSION = "CANONICAL_JSON_HASH_V1"
GATEWAY_SHA = "e0b4edd34d5fecaf8850e64aa03a33c2661b51f9"
RUNTIME_RELEASE_DIR = "release/ai-core-runtime-3bf1facc"
ROLLBACK_RELEASE_DIR = "release/ai-core-runtime-78db9e3c"


def run(*args: str, cwd: Path) -> str:
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def normalized(info: tarfile.TarInfo) -> tarfile.TarInfo:
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    info.mtime = 0
    return info


def git_archive(repo: Path, revision: str, output: Path) -> None:
    raw = output.with_suffix(".tar")
    with raw.open("wb") as target:
        subprocess.run(
            ["git", "archive", "--format=tar", revision],
            cwd=repo,
            stdout=target,
            check=True,
        )
    try:
        with raw.open("rb") as source, output.open("wb") as raw_target:
            with gzip.GzipFile(
                filename="", mode="wb", fileobj=raw_target, mtime=0,
            ) as target:
                shutil.copyfileobj(source, target)
    finally:
        raw.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-repo", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    repo = args.site_repo.expanduser().resolve(strict=True)
    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    site_sha = run("git", "rev-parse", "HEAD", cwd=repo)
    if run("git", "status", "--porcelain", cwd=repo):
        raise SystemExit("Site worktree is not clean")
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", BASE_SITE_SHA, site_sha],
        cwd=repo,
        check=True,
    )

    runtime_dir = repo / RUNTIME_RELEASE_DIR
    runtime_manifest = json.loads(
        (runtime_dir / "RELEASE_MANIFEST.json").read_text(encoding="utf-8")
    )
    runtime_artifact = runtime_dir / str(runtime_manifest.get("artifact", ""))
    if (
        runtime_manifest.get("runtime_sha") != RUNTIME_SHA
        or runtime_manifest.get("contract_sha") != CONTRACT_SHA
        or runtime_manifest.get("contract_version") != CONTRACT_VERSION
        or runtime_manifest.get("canonicalization_version")
        != CANONICALIZATION_VERSION
        or not runtime_artifact.is_file()
        or digest(runtime_artifact) != runtime_manifest.get("artifact_sha256")
    ):
        raise SystemExit("target Runtime release mismatch")

    rollback_dir = repo / ROLLBACK_RELEASE_DIR
    rollback_manifest = json.loads(
        (rollback_dir / "RELEASE_MANIFEST.json").read_text(encoding="utf-8")
    )
    rollback_artifact = rollback_dir / str(rollback_manifest.get("artifact", ""))
    if (
        rollback_manifest.get("runtime_sha") != ROLLBACK_RUNTIME_SHA
        or not rollback_artifact.is_file()
        or digest(rollback_artifact) != rollback_manifest.get("artifact_sha256")
    ):
        raise SystemExit("rollback Runtime release mismatch")

    with tempfile.TemporaryDirectory(prefix="rospark-site-pin-3bf1-") as raw:
        temp = Path(raw)
        root = temp / f"PUBLIC_AI_CORE_SITE_PIN_3BF1FACC_{site_sha[:8]}"
        root.mkdir(mode=0o700)
        site_target = root / f"site-{site_sha}.tar.gz"
        site_rollback = root / f"site-{BASE_SITE_SHA}.tar.gz"
        git_archive(repo, site_sha, site_target)
        git_archive(repo, BASE_SITE_SHA, site_rollback)
        target_runtime = root / runtime_artifact.name
        rollback_runtime = root / rollback_artifact.name
        shutil.copy2(runtime_artifact, target_runtime)
        shutil.copy2(rollback_artifact, rollback_runtime)

        manifest = {
            "schema": "ROSPARK_SITE_RUNTIME_PIN_PACKAGE_V1",
            "site_sha": site_sha,
            "base_site_sha": BASE_SITE_SHA,
            "runtime_sha": RUNTIME_SHA,
            "rollback_runtime_sha": ROLLBACK_RUNTIME_SHA,
            "contract_sha": CONTRACT_SHA,
            "contract_version": CONTRACT_VERSION,
            "canonicalization_version": CANONICALIZATION_VERSION,
            "gateway_sha": GATEWAY_SHA,
            "production_build_command": "next build --webpack",
            "required_flags": {
                "AI_CORE_OWNER_CANARY_ENABLED": False,
                "AI_CORE_PUBLIC_ENABLED": False,
            },
            "live_model_requests_authorized": False,
            "deploy_authorized": False,
        }
        manifest_path = root / "PACKAGE_MANIFEST.json"
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2)
            + "\n",
            encoding="utf-8",
        )

        sums = root / "SHA256SUMS"
        files = sorted(path for path in root.iterdir() if path != sums)
        sums.write_text(
            "".join(f"{digest(path)}  {path.name}\n" for path in files),
            encoding="utf-8",
        )
        raw_tar = temp / "package.tar"
        with tarfile.open(raw_tar, "w", format=tarfile.PAX_FORMAT) as target:
            target.add(root, arcname=root.name, filter=normalized)
        temporary_output = output.with_suffix(output.suffix + ".tmp")
        with raw_tar.open("rb") as source, temporary_output.open("wb") as raw_target:
            with gzip.GzipFile(
                filename="", mode="wb", fileobj=raw_target, mtime=0,
            ) as target:
                shutil.copyfileobj(source, target)
        os.replace(temporary_output, output)

    print(json.dumps({
        "artifact": str(output),
        "artifact_sha256": digest(output),
        "site_sha": site_sha,
        "runtime_sha": RUNTIME_SHA,
        "contract_sha": CONTRACT_SHA,
        "gateway_sha": GATEWAY_SHA,
        "model_requests": 0,
        "production_changes": 0,
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
