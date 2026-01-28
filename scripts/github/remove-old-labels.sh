#!/bin/bash
# Remove Old/Unused Labels from Podverse Repository
# This script removes labels that are no longer needed
#
# WARNING: This is destructive! Labels will be permanently deleted.
# Issues with these labels will keep the labels, but they won't be available for new issues.
#
# Usage:
#   gh auth login  # Authenticate once
#   ./scripts/github/remove-old-labels.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "🗑️  GitHub Labels - Remove Old Labels"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will permanently delete labels!"
echo "   Issues with these labels will keep them, but labels won't be available for new issues."
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
  echo "❌ Error: GitHub CLI (gh) is not installed"
  exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
  echo "❌ Error: Not authenticated with GitHub"
  echo "Run: gh auth login"
  exit 1
fi

# Labels to remove
LABELS_TO_REMOVE=(
  "good first issue"
  "help wanted"
  "documentation"
  "accessibility"
  "translations"
  "task"
  "more info needed"
  "needs reproduction"
  "needs verification"
  "ready to deploy"
  "bounty"
  "bounty pending"
  "bounty completed"
)

echo "Labels to be removed (${#LABELS_TO_REMOVE[@]} total):"
for label in "${LABELS_TO_REMOVE[@]}"; do
  echo "  - $label"
done
echo ""

# Prompt for confirmation
read -p "Are you sure you want to delete these labels? (yes/no): " CONFIRM
echo ""

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cancelled - no labels were deleted"
  exit 0
fi

REMOVED=0
NOT_FOUND=0
ERRORS=0

for label in "${LABELS_TO_REMOVE[@]}"; do
  # Check if label exists
  if gh label list --json name --jq ".[] | select(.name == \"$label\")" | grep -q "$label"; then
    # Delete the label
    if gh label delete "$label" --yes 2>/dev/null; then
      echo "  ✅ Removed: $label"
      REMOVED=$((REMOVED + 1))
    else
      echo "  ❌ Failed to remove: $label"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ⏭️  Not found: $label"
    NOT_FOUND=$((NOT_FOUND + 1))
  fi
done

echo ""
echo "======================================"
echo "Summary:"
echo "  Removed: $REMOVED"
echo "  Not found: $NOT_FOUND"
if [ $ERRORS -gt 0 ]; then
  echo "  Errors: $ERRORS"
fi
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "⚠️  Some labels could not be removed"
  exit 1
fi

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Run ./scripts/github/setup-all-labels.sh to ensure all needed labels exist"
echo "  2. Update docs/GITHUB-LABELS.md if needed"
