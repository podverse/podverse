#!/bin/bash
# Audit all workspaces for npm vulnerabilities
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "Running npm audit across all workspaces..."
npm audit --workspaces

echo ""
echo "Audit complete."
