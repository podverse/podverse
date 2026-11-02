#!/usr/bin/env bash
# Install root workspace or standalone mobile deps only when an install is missing or
# older than its package-lock.json. Leaves current installs untouched, so it is cheap
# to run before every lint or type-check.
#
# npm writes node_modules/.package-lock.json on every install; a package-lock.json
# newer than it (a pull, branch switch, or dependency edit) means the install is stale.
# Installs use `npm ci`, so the committed lockfiles are never rewritten.
#
# Usage (from monorepo root):
#   ./scripts/dev/deps-ensure.sh root
#   ./scripts/dev/deps-ensure.sh mobile
#
# Mobile file: links point at shared package dist/, so run `mobile` after
# `npm run build:packages`.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

install_is_current() {
  local dir="$1"
  local marker="$dir/node_modules/.package-lock.json"
  [[ -f "$marker" && ! "$dir/package-lock.json" -nt "$marker" ]]
}

case "${1:-}" in
  root)
    if install_is_current "."; then
      echo "Root deps: up to date."
    else
      echo "Root deps: missing or older than package-lock.json; running npm ci..."
      npm ci
    fi
    ;;
  mobile)
    if install_is_current "apps/mobile"; then
      echo "Mobile deps: up to date."
    else
      echo "Mobile deps: missing or older than apps/mobile/package-lock.json; running npm ci..."
      npm ci --prefix apps/mobile
      bash scripts/mobile/ensure-expo-sqlite-vendored-sources.sh
      bash scripts/mobile/ensure-expo-modules-core-swift.sh
    fi
    ;;
  *)
    echo "Usage: $0 root|mobile" >&2
    exit 1
    ;;
esac
