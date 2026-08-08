#!/usr/bin/env python3
from __future__ import annotations

import json
import hashlib
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "scripts/owner_canary_v4_lib.sh"
ACTIVATE = ROOT / "scripts/activate_owner_ai_canary_for_owner_live_test.sh"
DEACTIVATE = ROOT / "scripts/deactivate_owner_ai_canary.sh"


def run_bash(source: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    return subprocess.run(
        ["bash", "-c", source],
        cwd=ROOT,
        env=merged,
        text=True,
        capture_output=True,
        check=False,
    )


def assert_ok(result: subprocess.CompletedProcess[str]) -> str:
    if result.returncode != 0:
        raise AssertionError(
            f"exit={result.returncode}\nstdout={result.stdout}\nstderr={result.stderr}"
        )
    return result.stdout


def write_executable(path: Path, source: str) -> None:
    path.write_text(source, encoding="utf-8")
    path.chmod(0o700)


def portable_stat_test(temp: Path) -> dict[str, str]:
    target = temp / "private.env"
    target.write_text("safe\n", encoding="utf-8")
    target.chmod(0o600)
    mock = temp / "bin"
    mock.mkdir()
    write_executable(
        mock / "stat",
        """#!/usr/bin/env bash
set -Eeuo pipefail
case "${STAT_FLAVOR:-}" in
  gnu)
    if test "$#" -eq 3 && test "$1" = "-c" && test "$2" = "%a"; then echo 600; exit 0; fi
    exit 1
    ;;
  bsd)
    if test "$#" -eq 3 && test "$1" = "-f" && test "$2" = "%Lp"; then echo 600; exit 0; fi
    exit 1
    ;;
  *) exit 1 ;;
esac
""",
    )
    results: dict[str, str] = {}
    for flavor in ("gnu", "bsd"):
        result = run_bash(
            f'source "{LIB}"; owner_v4_assert_file_mode "{target}" 600; owner_v4_file_mode "{target}"',
            {
                "PATH": f"{mock}:{os.environ['PATH']}",
                "STAT_FLAVOR": flavor,
            },
        )
        assert_ok(result)
        assert result.stdout.strip() == "600"
        results[flavor] = "pass"
    return results


def readiness_harness(temp: Path, startup: list[str], timeout_ms: int) -> subprocess.CompletedProcess[str]:
    state = temp / f"state-{len(list(temp.iterdir()))}"
    state.mkdir()
    (state / "http-index").write_text("0", encoding="utf-8")
    (state / "time-index").write_text("0", encoding="utf-8")
    (state / "mutation-count").write_text("0", encoding="utf-8")
    (state / "rollback-count").write_text("0", encoding="utf-8")
    values = " ".join(startup)
    source = f'''
set -Eeuo pipefail
source "{LIB}"
STATE="{state}"
TARGET="{'a' * 40}"
owner_v4_now_ms() {{
  local index value values=(0 0 1000 2000 3000 4000 5000 6000 7000)
  index="$(cat "$STATE/time-index")"
  value="${{values[$index]:-${{values[-1]}}}}"
  echo $((index + 1)) > "$STATE/time-index"
  printf '%s' "$value"
}}
owner_v4_sleep() {{ :; }}
owner_v4_probe_pm2() {{ printf 'online|4242'; }}
owner_v4_probe_site_sha() {{ printf '%s' "$TARGET"; }}
next_http() {{
  local index value values=({values})
  index="$(cat "$STATE/http-index")"
  value="${{values[$index]:-${{values[-1]}}}}"
  echo $((index + 1)) > "$STATE/http-index"
  printf '%s' "$value"
}}
owner_v4_probe_local() {{
  local value
  value="$(next_http)"
  if test "$value" = 200; then printf '200|production|true'; else printf '%s||' "$value"; fi
}}
owner_v4_probe_public() {{
  local index value values=({values})
  index="$(cat "$STATE/http-index")"
  index=$((index - 1))
  value="${{values[$index]:-${{values[-1]}}}}"
  printf '%s' "$value"
}}
increment() {{ local file="$1" value; value="$(cat "$file")"; echo $((value + 1)) > "$file"; }}
increment "$STATE/mutation-count"
if owner_v4_wait_readiness /fake "$TARGET" local public host {timeout_ms} 0; then
  echo "ACTIVATION_READINESS=pass"
else
  echo "ACTIVATION_READINESS=fail"
  increment "$STATE/rollback-count"
  echo 0 > "$STATE/http-index"
  echo 0 > "$STATE/time-index"
  owner_v4_probe_local() {{ printf '200|production|true'; }}
  owner_v4_probe_public() {{ printf '200'; }}
  owner_v4_wait_readiness /fake "$TARGET" local public host 5000 0
  echo "ROLLBACK_READINESS=pass"
fi
echo "MUTATION_COUNT=$(cat "$STATE/mutation-count")"
echo "ROLLBACK_COUNT=$(cat "$STATE/rollback-count")"
'''
    return run_bash(source)


def static_contract_test() -> dict[str, object]:
    critical = [ACTIVATE, DEACTIVATE]
    direct_stat = []
    direct_pm2_restart = []
    for path in critical:
        source = path.read_text(encoding="utf-8")
        if re.search(r"(^|[^a-zA-Z0-9_])stat\s", source):
            direct_stat.append(path.name)
        if re.search(r"\bpm2\s+(restart|reload|start|stop)\b", source):
            direct_pm2_restart.append(path.name)
    assert direct_stat == []
    assert direct_pm2_restart == []
    activation = ACTIVATE.read_text(encoding="utf-8")
    assert activation.count("canary_enable 120000") == 1
    assert activation.count("rollback 120000") == 1
    assert "owner_v4_wait_readiness" in activation
    assert "OWNER_FAILURE_SILENT_LEGACY_FALLBACK=0" in activation
    return {
        "production_scripts_direct_stat": direct_stat,
        "production_scripts_direct_pm2_restart": direct_pm2_restart,
        "activation_mutation_sequence_count": 1,
        "automatic_rollback_sequence_count": 1,
    }


def lock_test(temp: Path) -> dict[str, str]:
    lock = temp / "lock"
    base = f'source "{LIB}"; owner_v4_acquire_lock "{lock}" test-id {"b" * 40} test-label'
    first = run_bash(base + f'; owner_v4_release_lock "{lock}" test-id')
    assert_ok(first)

    lock.mkdir()
    (lock / "metadata").write_text("broken=true\n", encoding="utf-8")
    corrupt = run_bash(base)
    assert corrupt.returncode == 75
    shutil.rmtree(lock)

    def metadata(pid: int, command_hash: str = "c" * 64) -> str:
        return "\n".join([
            "activation_id=existing-v4-lock",
            f"pid={pid}",
            f"target_sha={'b' * 40}",
            "launchd_label=test-label",
            "started_at=2026-08-08T00:00:00Z",
            f"command_hash={command_hash}",
            "",
        ])

    lock.mkdir()
    (lock / "metadata").write_text(metadata(999999), encoding="utf-8")
    stale = run_bash(base)
    assert stale.returncode == 75
    shutil.rmtree(lock)

    sleeper = subprocess.Popen(["sleep", "30"])
    try:
        lock.mkdir()
        (lock / "metadata").write_text(metadata(sleeper.pid), encoding="utf-8")
        unrelated = run_bash(base)
        assert unrelated.returncode == 75
    finally:
        sleeper.terminate()
        sleeper.wait(timeout=5)
        shutil.rmtree(lock, ignore_errors=True)

    related = subprocess.Popen([
        "python3", "-c", "import time; time.sleep(30)", "owner_canary_v4_hold",
    ])
    try:
        lock.mkdir()
        matching_hash = hashlib.sha256(b"bash").hexdigest()
        (lock / "metadata").write_text(
            metadata(related.pid, matching_hash), encoding="utf-8",
        )
        held = run_bash(base)
        assert held.returncode == 73, (held.returncode, held.stdout, held.stderr)
    finally:
        related.terminate()
        related.wait(timeout=5)
        shutil.rmtree(lock, ignore_errors=True)
    return {
        "exclusive": "pass",
        "live_owner": "blocked_before_mutation",
        "corrupt": "fail_closed",
        "stale": "fail_closed",
        "live_unrelated": "fail_closed",
    }


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="owner-canary-v4-tests-") as raw:
        temp = Path(raw)
        portable = portable_stat_test(temp)
        transient = readiness_harness(temp, ["502", "502", "200", "200", "200"], 10_000)
        transient_output = assert_ok(transient)
        assert "ACTIVATION_READINESS=pass" in transient_output
        assert "MUTATION_COUNT=1" in transient_output
        assert "ROLLBACK_COUNT=0" in transient_output
        assert transient_output.count("readiness_pending") == 4
        assert transient_output.count("readiness_pass") == 1

        timeout = readiness_harness(temp, ["502", "502", "502", "502", "502"], 2_500)
        timeout_output = assert_ok(timeout)
        assert "ACTIVATION_READINESS=fail" in timeout_output
        assert "ROLLBACK_READINESS=pass" in timeout_output
        assert "MUTATION_COUNT=1" in timeout_output
        assert "ROLLBACK_COUNT=1" in timeout_output

        results = {
            "schema": "rospark-owner-canary-v4-production-path-tests-v1",
            "portable_stat": portable,
            "transient_502": {
                "sequence": [502, 502, 200, 200, 200],
                "result": "pass",
                "premature_rollback": 0,
                "activation_mutations": 1,
            },
            "permanent_502": {
                "result": "pass",
                "activation_result": "fail_after_deadline",
                "automatic_rollbacks": 1,
                "rollback_readiness": "pass",
            },
            "static_contract": static_contract_test(),
            "single_flight": lock_test(temp),
            "model_requests": 0,
            "production_changes": 0,
        }
        print(json.dumps(results, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
