#!/usr/bin/env bash
# EAS Build `eas-build-pre-install` hook (runs on the build server, before EAS installs
# apps/mobile dependencies).
#
# apps/mobile consumes shared packages through `file:` links that resolve to each package's dist/,
# and dist/ is not committed. EAS evaluates app.config.ts (which loads @podverse/helpers) before
# the post-install hook, so the root workspaces must be installed and those packages compiled here.
# Mirrors the root install + package build half of scripts/dev/deps-init.sh, limited to the
# packages mobile reaches.
#
# MOBILE_PACKAGES is the compile list, in dependency order. check-eas-mobile-packages.mjs
# rejects a list that does not match the @podverse packages apps/mobile reaches.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MOBILE_PACKAGES=(
  packages/helpers
  packages/design-tokens
  packages/playback-core
  packages/helpers-validation
  packages/v4v-metaboost
  packages/parser-mapping
  packages/http-request-core
  packages/observability
  packages/helpers-requests
  packages/v4v-helpers
  packages/v4v-btc-ln
)

cd "$REPO_ROOT"

node "$SCRIPT_DIR/check-eas-mobile-packages.mjs"

echo "Installing root workspace dependencies..."
npm ci --ignore-scripts

for workspace in "${MOBILE_PACKAGES[@]}"; do
  echo "Building $workspace..."
  "$REPO_ROOT/node_modules/.bin/tsc" -p "$workspace"
done
