#!/bin/bash
# Regenerate package-lock.json under Linux (Docker) so optional deps match CI.
# Run from repo root when adding/updating deps or as part of bump-version.
# Requires: Docker.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

if ! command -v docker &>/dev/null; then
  echo "Error: Docker is required. Install Docker and run this script again." >&2
  exit 1
fi

# Use Node 24 to match .nvmrc and CI
NODE_IMAGE="node:24"
echo "Removing existing package-lock.json before Linux regeneration..."
rm -f "$REPO_ROOT/package-lock.json"

echo "Regenerating package-lock.json under Linux ($NODE_IMAGE)..."
# Remove every node_modules tree (root and nested workspaces). Stale nested
# node_modules can cause npm to emit incomplete lockfile stubs (e.g. missing
# version on nested devDependencies) that break npm ci on other platforms.
docker run --rm \
  --platform linux/amd64 \
  -v "$REPO_ROOT:/app" \
  -w /app \
  "$NODE_IMAGE" \
  sh -c "find . -name node_modules -type d -prune -exec rm -rf '{}' + && npm install --include=optional"

echo "Done. package-lock.json is now Linux-canonical; commit it so CI uses it."
