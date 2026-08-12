#!/bin/zsh

set -Eeuo pipefail

tests=(
  test:runtime-37efd4d
  test:owner-ai-canary
  test:owner-ai-canary-forensic
  test:public-blocked-safe-forensic
  test:canonical-json-hash-v1
  test:exact-runtime-pin
  test:owner-ai-canary-env
  test:public-ai-core-env
  test:esm-cli-entrypoint
  test:site-release-provenance
  test:owner-ai-canary-origin
  test:owner-ai-canary-origin-http
  test:public-ai-core
  test:public-ai-core-http
  test:ai-core-ubuntu-staging
)

for test_name in "${tests[@]}"; do
  print -- "[SITE REGRESSION] ${test_name}"
  npm run "${test_name}"
done

print -- "RUNTIME_37EFD4D_SITE_REGRESSIONS=${#tests[@]}/${#tests[@]}"
