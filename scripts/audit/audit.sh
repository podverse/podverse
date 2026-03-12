#!/bin/bash
# Check for vulnerabilities in all packages.
# By default, only moderate and above fail (low are permitted in deployments).
# Pass --include-low to also fail on low vulnerabilities (report and fix on demand).
#
# Usage: ./scripts/audit/audit.sh [--fix] [--include-low]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

AUDIT_INCLUDE_LOW=""
AUDIT_FIX=""

for arg in "$@"; do
  case "$arg" in
    --include-low) AUDIT_INCLUDE_LOW=1 ;;
    --fix)         AUDIT_FIX=1 ;;
  esac
done

echo "=== Podverse Dependency Audit ==="
echo ""

if [ -n "$AUDIT_FIX" ]; then
  echo "Running npm audit fix..."
  npm audit fix --omit=dev --workspaces || true
  echo ""
fi

# Default: only moderate and above cause exit 1 (low permitted).
# With --include-low: any severity causes exit 1.
if [ -n "$AUDIT_INCLUDE_LOW" ]; then
  echo "Running npm audit --omit=dev (all severities; low will fail)..."
  AUDIT_LEVEL=""
else
  echo "Running npm audit --omit=dev --audit-level=moderate (low permitted)..."
  AUDIT_LEVEL="--audit-level=moderate"
fi

AUDIT_EXIT=0
npm audit --omit=dev $AUDIT_LEVEL || AUDIT_EXIT=$?

echo ""
echo "=== Audit Complete ==="

if command -v jq &> /dev/null; then
  VULNS=$(npm audit --omit=dev --json 2> /dev/null | jq '.metadata.vulnerabilities.total // 0' || echo "0")
  if [ "$VULNS" != "0" ] && [ "$VULNS" != "null" ]; then
    echo ""
    echo "⚠️  Found $VULNS vulnerabilities (total)"
    echo "Run './scripts/audit/audit.sh --fix' to attempt automatic fixes"
    echo "Run './scripts/audit/audit.sh --include-low' to fail on low severities too"
    echo "Or run 'npm audit' for details"
  else
    echo "✓ No vulnerabilities found"
  fi
else
  echo ""
  echo "Note: Install 'jq' for vulnerability count summary"
  echo "Run 'npm audit' for detailed vulnerability information"
fi

exit $AUDIT_EXIT
