#!/bin/bash
# Check for vulnerabilities in all packages
# Usage: ./scripts/audit/audit.sh [--fix]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "=== Podverse Dependency Audit ==="
echo ""

# Check for --fix flag
if [ "$1" == "--fix" ]; then
  echo "Running npm audit fix..."
  npm audit fix --omit=dev --workspaces || true
  echo ""
fi

# Run npm audit --omit=dev (all severity levels)
echo "Running npm audit --omit=dev..."
npm audit --omit=dev || true

echo ""
echo "=== Audit Complete ==="

# Summary with vulnerability count
if command -v jq &> /dev/null; then
  VULNS=$(npm audit --omit=dev --json 2> /dev/null | jq '.metadata.vulnerabilities.total // 0' || echo "0")
  if [ "$VULNS" != "0" ] && [ "$VULNS" != "null" ]; then
    echo ""
    echo "⚠️  Found $VULNS vulnerabilities"
    echo "Run './scripts/audit/audit.sh --fix' to attempt automatic fixes"
    echo "Or run 'npm audit' for details"
    exit 1
  else
    echo "✓ No vulnerabilities found"
  fi
else
  echo ""
  echo "Note: Install 'jq' for vulnerability count summary"
  echo "Run 'npm audit' for detailed vulnerability information"
fi
