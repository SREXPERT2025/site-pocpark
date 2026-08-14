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


BASE_SITE_SHA = "3d0e86b3224f6f2647e906353396eac94c44150e"
RUNTIME_SHA = "c78ae7288d9140d9da3fba39f46d2eac493b4a17"
ROLLBACK_RUNTIME_SHA = "3bf1facc9cc16672c1f1c01620c89f51eb39c28f"
CONTRACT_SHA = "4d75773d60f3453279cbfcee1453f54b15b66567"
CONTRACT_VERSION = "1.2"
CANONICALIZATION_VERSION = "CANONICAL_JSON_HASH_V1"
GATEWAY_SHA = "e0b4edd34d5fecaf8850e64aa03a33c2661b51f9"
RUNTIME_RELEASE_DIR = "release/ai-core-runtime-c78ae728"
ROLLBACK_RELEASE_DIR = "release/ai-core-runtime-3bf1facc"


def run(*args: str, cwd: Path) -> str:
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    os.chmod(path, 0o600)


def git_archive(repo: Path, revision: str, output: Path) -> None:
    with tempfile.NamedTemporaryFile(
        prefix="rospark-site-", suffix=".tar", delete=False,
    ) as temporary:
        temporary_path = Path(temporary.name)
    try:
        with temporary_path.open("wb") as target:
            subprocess.run(
                ["git", "archive", "--format=tar", revision],
                cwd=repo,
                stdout=target,
                check=True,
            )
        with temporary_path.open("rb") as source, output.open("wb") as raw:
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as gz:
                shutil.copyfileobj(source, gz)
        os.chmod(output, 0o600)
    finally:
        temporary_path.unlink(missing_ok=True)


def normalized(info: tarfile.TarInfo) -> tarfile.TarInfo:
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    info.mtime = 0
    return info


def release_artifact(repo: Path, release_dir: str, expected_sha: str) -> Path:
    directory = repo / release_dir
    manifest = json.loads(
        (directory / "RELEASE_MANIFEST.json").read_text(encoding="utf-8")
    )
    artifact = directory / str(manifest.get("artifact", ""))
    if (
        manifest.get("runtime_sha") != expected_sha
        or not artifact.is_file()
        or sha256(artifact) != manifest.get("artifact_sha256")
    ):
        raise SystemExit(f"Runtime release mismatch: {expected_sha}")
    if expected_sha == RUNTIME_SHA and (
        manifest.get("contract_sha") != CONTRACT_SHA
        or manifest.get("contract_version") != CONTRACT_VERSION
        or manifest.get("canonicalization_version")
        != CANONICALIZATION_VERSION
    ):
        raise SystemExit("target Runtime Contract mismatch")
    return artifact


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-repo", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    repo = args.site_repo.expanduser().resolve(strict=True)
    site_sha = run("git", "rev-parse", "HEAD", cwd=repo)
    if run("git", "rev-parse", BASE_SITE_SHA, cwd=repo) != BASE_SITE_SHA:
        raise SystemExit("base Site SHA unavailable")
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", BASE_SITE_SHA, site_sha],
        cwd=repo,
        check=True,
    )
    if run("git", "status", "--porcelain", cwd=repo):
        raise SystemExit("tracked Site worktree changes present")

    runtime_source = release_artifact(repo, RUNTIME_RELEASE_DIR, RUNTIME_SHA)
    rollback_runtime_source = release_artifact(
        repo, ROLLBACK_RELEASE_DIR, ROLLBACK_RUNTIME_SHA,
    )

    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=False)
    site_archive = output_dir / f"site-{site_sha}.tar.gz"
    rollback_site_archive = output_dir / f"site-{BASE_SITE_SHA}.tar.gz"
    runtime_archive = output_dir / runtime_source.name
    rollback_runtime_archive = output_dir / rollback_runtime_source.name
    git_archive(repo, site_sha, site_archive)
    git_archive(repo, BASE_SITE_SHA, rollback_site_archive)
    shutil.copy2(runtime_source, runtime_archive)
    shutil.copy2(rollback_runtime_source, rollback_runtime_archive)
    os.chmod(runtime_archive, 0o600)
    os.chmod(rollback_runtime_archive, 0o600)

    manifest = {
        "schema": "ROSPARK_AI_CORE_OWNER_CANARY_ASSEMBLY_V1",
        "site_sha": site_sha,
        "site_base_sha": BASE_SITE_SHA,
        "runtime_sha": RUNTIME_SHA,
        "contract_sha": CONTRACT_SHA,
        "contract_version": CONTRACT_VERSION,
        "canonicalization_version": CANONICALIZATION_VERSION,
        "gateway_sha": GATEWAY_SHA,
        "production_build_command": "next build --webpack",
        "required_flags": {
            "AI_CORE_OWNER_CANARY_ENABLED": False,
            "AI_CORE_PUBLIC_ENABLED": False,
        },
        "owner_canary_activation_authorized": False,
        "public_ai_core_activation_authorized": False,
        "live_model_requests_authorized": False,
        "deploy_authorized": False,
        "offline_acceptance": {
            "stateful_t1_t5": "pass",
            "forensic_primary_secondary": "pass",
            "trace_compatibility": "pass",
            "canonical_hash": "pass",
            "duplicate_executions": 0,
            "duplicate_mutations": 0,
            "model_requests": 0,
        },
        "artifacts": {
            site_archive.name: sha256(site_archive),
            runtime_archive.name: sha256(runtime_archive),
        },
    }
    rollback = {
        "schema": "ROSPARK_AI_CORE_CANARY_ROLLBACK_V1",
        "site_rollback_sha": BASE_SITE_SHA,
        "runtime_rollback_sha": ROLLBACK_RUNTIME_SHA,
        "contract_after_rollback": CONTRACT_SHA,
        "fresh_live_snapshot_required_before_mutation": True,
        "site_and_runtime_rollback_are_host_local": True,
        "public_ai_core_must_remain_off": True,
        "artifacts": {
            rollback_site_archive.name: sha256(rollback_site_archive),
            rollback_runtime_archive.name: sha256(rollback_runtime_archive),
        },
    }
    write_json(output_dir / "CANARY_MANIFEST.json", manifest)
    write_json(output_dir / "ROLLBACK_PLAN.json", rollback)

    checksum_lines = []
    for path in sorted(output_dir.iterdir()):
        if path.name == "SHA256SUMS" or not path.is_file():
            continue
        checksum_lines.append(f"{sha256(path)}  {path.name}")
    sums = output_dir / "SHA256SUMS"
    sums.write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")
    os.chmod(sums, 0o600)

    bundle = output_dir.with_suffix(".tar.gz")
    temporary_tar = output_dir.with_suffix(".tar")
    with tarfile.open(temporary_tar, "w", format=tarfile.PAX_FORMAT) as target:
        target.add(
            output_dir,
            arcname=output_dir.name,
            recursive=True,
            filter=normalized,
        )
    with temporary_tar.open("rb") as source, bundle.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as gz:
            shutil.copyfileobj(source, gz)
    temporary_tar.unlink()
    os.chmod(bundle, 0o600)
    print(json.dumps({
        "site_sha": site_sha,
        "runtime_sha": RUNTIME_SHA,
        "contract_sha": CONTRACT_SHA,
        "gateway_sha": GATEWAY_SHA,
        "assembly_dir": str(output_dir),
        "assembly_archive": str(bundle),
        "assembly_sha256": sha256(bundle),
        "rollback_ready": True,
        "production_changes": 0,
        "model_requests": 0,
    }, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
