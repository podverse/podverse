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

# Default linux/amd64 matches GitHub Actions (ubuntu-latest = x64) optional native deps.
# On Apple Silicon, emulated amd64 (QEMU) can crash with "Bus error" when optional
# packages run native postinstalls (e.g. next-intl's @swc/core). Mitigations:
# - Docker Desktop: enable "Use Rosetta for x86/amd64 emulation on Apple Silicon", or
# - Set LOCKFILE_DOCKER_PLATFORM=linux/arm64 (native container; see LOCKFILE-LINUX.md).
DOCKER_PLATFORM="${LOCKFILE_DOCKER_PLATFORM:-linux/amd64}"

if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" && "$DOCKER_PLATFORM" == "linux/amd64" ]]; then
  echo "Note: emulated linux/amd64 on Apple Silicon can fail with Bus error during @swc/core postinstall."
  echo "      If that happens: enable Rosetta for x86/amd64 in Docker Desktop (General), or run:"
  echo "      LOCKFILE_DOCKER_PLATFORM=linux/arm64 $0"
  echo ""
fi

echo "Removing existing package-lock.json before Linux regeneration..."
rm -f "$REPO_ROOT/package-lock.json"

echo "Regenerating package-lock.json under Linux ($NODE_IMAGE, platform $DOCKER_PLATFORM)..."
# Remove every node_modules tree (root and nested workspaces). Stale nested
# node_modules can cause npm to emit incomplete lockfile stubs (e.g. missing
# version on nested devDependencies) that break npm ci on other platforms.
if ! docker run --rm \
  --platform "$DOCKER_PLATFORM" \
  -v "$REPO_ROOT:/app" \
  -w /app \
  "$NODE_IMAGE" \
  sh -c "find . -name node_modules -type d -prune -exec rm -rf '{}' + && npm install --include=optional"; then
  echo "" >&2
  echo "Docker/npm install failed. On Apple Silicon + linux/amd64, try Rosetta for amd64 in Docker Desktop," >&2
  echo "or: LOCKFILE_DOCKER_PLATFORM=linux/arm64 $0 (see docs/development/tooling/LOCKFILE-LINUX.md)." >&2
  exit 1
fi

echo "Done. package-lock.json is now Linux-canonical; commit it so CI uses it."
