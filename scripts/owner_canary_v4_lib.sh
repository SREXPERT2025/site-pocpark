#!/usr/bin/env bash

# Canonical production-path helpers for Owner Canary V4. Callers are expected
# to enable `set -Eeuo pipefail` before sourcing this file.

owner_v4_file_mode() {
  local path="$1" mode=""
  test -e "$path" || return 1

  mode="$(stat -c '%a' "$path" 2>/dev/null || true)"
  case "$mode" in
    [0-7][0-7][0-7]|[0-7][0-7][0-7][0-7])
      printf '%s' "$mode"
      return 0
      ;;
  esac

  mode="$(stat -f '%Lp' "$path" 2>/dev/null || true)"
  case "$mode" in
    [0-7][0-7][0-7]|[0-7][0-7][0-7][0-7])
      printf '%s' "$mode"
      return 0
      ;;
  esac
  return 1
}

owner_v4_assert_file_mode() {
  local path="$1" expected="$2" observed
  observed="$(owner_v4_file_mode "$path")" || {
    echo "FILE_MODE_UNAVAILABLE path=$path" >&2
    return 1
  }
  test "$observed" = "$expected" || {
    echo "FILE_MODE_MISMATCH path=$path expected=$expected observed=$observed" >&2
    return 1
  }
}

owner_v4_sha256() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
    return
  fi
  shasum -a 256 "$path" | awk '{print $1}'
}

owner_v4_now_ms() {
  python3 -c 'import time; print(time.monotonic_ns() // 1_000_000)'
}

owner_v4_sleep() {
  sleep "$1"
}

owner_v4_probe_pm2() {
  pm2 jlist | node -e '
let source="";
process.stdin.on("data",d=>source+=d).on("end",()=>{
  const app=JSON.parse(source).find(item=>item.name==="rospark-site");
  process.stdout.write(`${app?.pm2_env?.status||"missing"}|${app?.pid||0}`);
});'
}

owner_v4_probe_local() {
  local url="$1" host="$2" output code runtime server_events
  output="$(mktemp "${TMPDIR:-/tmp}/owner-v4-local.XXXXXX")"
  code="$(curl -sS --max-time 10 -H "Host: $host" \
    -o "$output" -w '%{http_code}' "$url" || true)"
  runtime=""
  server_events=""
  if test "$code" = 200; then
    runtime="$(node -e '
const fs=require("fs");
try { const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(String(v.runtimeMode||"")); }
catch { process.exit(1); }' "$output" 2>/dev/null || true)"
    server_events="$(node -e '
const fs=require("fs");
try { const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(String(v.serverEventsEnabled)); }
catch { process.exit(1); }' "$output" 2>/dev/null || true)"
  fi
  rm -f "$output"
  printf '%s|%s|%s' "${code:-000}" "$runtime" "$server_events"
}

owner_v4_probe_public() {
  local url="$1" host="$2" code
  code="$(curl -sS --max-time 10 --resolve "${host}:443:127.0.0.1" \
    -o /dev/null -w '%{http_code}' "$url" || true)"
  printf '%s' "${code:-000}"
}

owner_v4_probe_site_sha() {
  git -C "$1" rev-parse HEAD
}

owner_v4_http_hard_failure() {
  case "$1" in
    200|000|502|503) return 1 ;;
    *) return 0 ;;
  esac
}

owner_v4_wait_readiness() {
  local app_dir="$1" expected_sha="$2" local_url="$3" public_url="$4" host="$5"
  local timeout_ms="${6:-120000}" interval="${7:-1}"
  local started deadline now attempt=0 consecutive=0 stable_started=-1
  local last_success_pid="" pm2_snapshot pm2_status pid local_snapshot
  local local_code runtime_mode server_events public_code site_sha
  local valid stable_span result

  started="$(owner_v4_now_ms)"
  deadline=$((started + timeout_ms))

  while true; do
    attempt=$((attempt + 1))
    now="$(owner_v4_now_ms)"
    pm2_snapshot="$(owner_v4_probe_pm2 || printf 'missing|0')"
    IFS='|' read -r pm2_status pid <<EOF
$pm2_snapshot
EOF
    local_snapshot="$(owner_v4_probe_local "$local_url" "$host" || printf '000||')"
    IFS='|' read -r local_code runtime_mode server_events <<EOF
$local_snapshot
EOF
    public_code="$(owner_v4_probe_public "$public_url" "$host" || printf '000')"
    site_sha="$(owner_v4_probe_site_sha "$app_dir" || printf 'unavailable')"

    if test "$site_sha" != "$expected_sha"; then
      echo "readiness_failed monotonic_ms=$now attempt=$attempt reason=wrong_site_sha observed=$site_sha expected=$expected_sha"
      return 1
    fi
    if owner_v4_http_hard_failure "$local_code"; then
      echo "readiness_failed monotonic_ms=$now attempt=$attempt reason=local_http_$local_code"
      return 1
    fi
    if owner_v4_http_hard_failure "$public_code"; then
      echo "readiness_failed monotonic_ms=$now attempt=$attempt reason=public_http_$public_code"
      return 1
    fi
    if test "$local_code" = 200 \
      && { test "$runtime_mode" != production || test "$server_events" != true; }; then
      echo "readiness_failed monotonic_ms=$now attempt=$attempt reason=runtime_metadata_mismatch runtime_mode=$runtime_mode server_events=$server_events"
      return 1
    fi

    valid=0
    if test "$pm2_status" = online \
      && test "$pid" -gt 0 2>/dev/null \
      && test "$local_code" = 200 \
      && test "$runtime_mode" = production \
      && test "$server_events" = true \
      && test "$public_code" = 200; then
      valid=1
    fi

    if test "$valid" -eq 1; then
      if test "$pid" = "$last_success_pid"; then
        consecutive=$((consecutive + 1))
      else
        last_success_pid="$pid"
        consecutive=1
        stable_started="$now"
      fi
    else
      consecutive=0
      stable_started=-1
      last_success_pid=""
    fi

    stable_span=0
    if test "$stable_started" -ge 0; then
      stable_span=$((now - stable_started))
    fi
    result=readiness_pending
    if test "$consecutive" -ge 3 && test "$stable_span" -ge 2000; then
      result=readiness_pass
    fi
    echo "$result monotonic_ms=$now attempt=$attempt pm2=$pm2_status pid=$pid local_http=$local_code public_http=$public_code site_sha_match=1 runtime_metadata_match=$valid consecutive=$consecutive stable_span_ms=$stable_span"
    if test "$result" = readiness_pass; then
      return 0
    fi
    if test "$now" -ge "$deadline"; then
      echo "readiness_failed monotonic_ms=$now attempt=$attempt reason=deadline_exceeded timeout_ms=$timeout_ms"
      return 1
    fi
    owner_v4_sleep "$interval"
  done
}

owner_v4_acquire_lock() {
  local lock_dir="$1" activation_id="$2" target_sha="$3" label="$4"
  local metadata="$lock_dir/metadata" pid command existing_id existing_sha existing_label existing_hash command_hash command_source
  command_source="${OWNER_V4_COMMAND_FILE:-${BASH_SOURCE[1]:-$0}}"
  if test -f "$command_source"; then
    command_hash="$(owner_v4_sha256 "$command_source")"
  else
    command_hash="$(python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())' "$command_source")"
  fi
  if ! mkdir "$lock_dir" 2>/dev/null; then
    if ! test -f "$metadata"; then
      echo "ACTIVATION_LOCK_CORRUPT metadata=missing" >&2
      return 75
    fi
    pid="$(awk -F= '$1=="pid" {print $2; exit}' "$metadata")"
    existing_id="$(awk -F= '$1=="activation_id" {print $2; exit}' "$metadata")"
    existing_sha="$(awk -F= '$1=="target_sha" {print $2; exit}' "$metadata")"
    existing_label="$(awk -F= '$1=="launchd_label" {print $2; exit}' "$metadata")"
    existing_hash="$(awk -F= '$1=="command_hash" {print $2; exit}' "$metadata")"
    if ! test "$pid" -gt 1 2>/dev/null \
      || ! test -n "$existing_id" \
      || ! printf '%s' "$existing_sha" | grep -Eq '^[a-f0-9]{40}$' \
      || ! test -n "$existing_label" \
      || ! printf '%s' "$existing_hash" | grep -Eq '^[a-f0-9]{64}$'; then
      echo "ACTIVATION_LOCK_CORRUPT metadata=invalid" >&2
      return 75
    fi
    if kill -0 "$pid" 2>/dev/null; then
      command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
      if test "$existing_sha" = "$target_sha" \
        && test "$existing_label" = "$label" \
        && test "$existing_hash" = "$command_hash"; then
        echo "ACTIVATION_LOCK_HELD pid=$pid" >&2
        return 73
      fi
      echo "ACTIVATION_LOCK_LIVE_UNRELATED pid=$pid command_hash_match=0 command=${command:-unknown}" >&2
      return 75
    fi
    echo "ACTIVATION_LOCK_STALE pid=$pid" >&2
    return 75
  fi
  {
    printf 'activation_id=%s\n' "$activation_id"
    printf 'pid=%s\n' "$$"
    printf 'target_sha=%s\n' "$target_sha"
    printf 'launchd_label=%s\n' "$label"
    printf 'started_at=%s\n' "$(date -u +%FT%TZ)"
    printf 'command_hash=%s\n' "$command_hash"
  } > "$lock_dir/.metadata.tmp"
  chmod 600 "$lock_dir/.metadata.tmp"
  mv "$lock_dir/.metadata.tmp" "$metadata"
}

owner_v4_release_lock() {
  local lock_dir="$1" activation_id="$2"
  local observed
  observed="$(awk -F= '$1=="activation_id" {print $2; exit}' "$lock_dir/metadata" 2>/dev/null || true)"
  test "$observed" = "$activation_id" || {
    echo "ACTIVATION_LOCK_OWNERSHIP_MISMATCH" >&2
    return 1
  }
  rm -f "$lock_dir/metadata"
  rmdir "$lock_dir"
}

owner_v4_env_value() {
  local file="$1" key="$2" value
  value="$(awk -v key="$key" 'index($0,key "=")==1 {print substr($0,length(key)+2); exit}' "$file")"
  value="${value#\'}"; value="${value%\'}"; value="${value#\"}"; value="${value%\"}"
  printf '%s' "$value"
}

owner_v4_set_flag_and_wait() {
  local app_dir="$1" env_file="$2" expected_sha="$3" enabled="$4"
  local local_url="$5" public_url="$6" host="$7" phase="$8"
  local timeout_ms="${9:-120000}"
  node "$app_dir/scripts/configure_owner_ai_canary_env.mjs" "$env_file" "$enabled"
  echo "pm2_action phase=$phase action=restart count=1"
  pm2 restart rospark-site --update-env >/dev/null
  owner_v4_wait_readiness \
    "$app_dir" "$expected_sha" "$local_url" "$public_url" "$host" \
    "$timeout_ms" 1
  test "$(owner_v4_env_value "$env_file" AI_CORE_OWNER_CANARY_ENABLED)" = "$enabled"
}
