#!/usr/bin/env bash
# Build a Next.js app quietly, then start its standalone server (production-like E2E).
# Usage: build-and-start-next-standalone.sh <npm-workspace> [extra npm run build args...]
# Example: build-and-start-next-standalone.sh @podverse/web
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <npm-workspace>" >&2
  exit 1
fi

WORKSPACE="$1"
shift

BUILD_LOG="$(mktemp "${TMPDIR:-/tmp}/podverse-e2e-next-build.XXXXXX.log")"
trap 'rm -f "$BUILD_LOG"' EXIT

if ! npm run build -w "$WORKSPACE" "$@" >"$BUILD_LOG" 2>&1; then
  cat "$BUILD_LOG" >&2
  exit 1
fi

npm run postbuild:standalone -w "$WORKSPACE"
exec npm run start:standalone -w "$WORKSPACE"
