#!/bin/bash
# Setup GitHub labels for the repository
# Run this once to create all required labels for workflows and issue management
#
# Usage:
#   GITHUB_TOKEN=your_token ./scripts/github/setup-labels.sh
#
# Or with gh CLI (preferred):
#   gh auth login
#   ./scripts/github/setup-labels.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "🏷️  GitHub Labels Setup"
echo "======================="
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
  echo "❌ Error: GitHub CLI (gh) is not installed"
  echo ""
  echo "Install gh CLI:"
  echo "  macOS:   brew install gh"
  echo "  Linux:   https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
  echo "  Windows: https://github.com/cli/cli/releases"
  echo ""
  exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
  echo "❌ Error: Not authenticated with GitHub"
  echo ""
  echo "Run: gh auth login"
  echo ""
  exit 1
fi

# Extract repository from git remote
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
  echo "❌ Error: Could not determine repository"
  echo "Make sure you're in a git repository with a GitHub remote"
  exit 1
fi

echo "Repository: $REPO"
echo ""

# Define all labels that workflows and scripts need
# Format: "name|color|description"
# 
# Note: PR labeler workflow uses existing labels (apps, packages, docs, etc.)
# This script only creates NEW labels that don't exist yet
LABELS=(
  # Dependencies label (used by vulnerability-scanner.yml and dependabot)
  "dependencies|0366d6|Dependency updates and security issues"
  
  # Priority labels (used by vulnerability-scanner.yml)
  # Color progression: critical (bright red) → high (orange) → medium (purple) → low (teal)
  "priority:critical|e11d21|Critical priority issues requiring immediate attention"
  "priority:high|eb6420|High priority issues"
  "priority:medium|d4c5f9|Medium priority issues"
  "priority:low|1f8b84|Low priority issues"
)

echo "Creating workflow-required labels (${#LABELS[@]} total):"
echo ""
echo "Note: PR labeler uses existing labels (apps, packages, docs, infra, ci, scripts, tools, i18n)"
echo "      This script only creates NEW labels that don't exist yet"
echo ""

CREATED=0
EXISTS=0
ERRORS=0

for label_def in "${LABELS[@]}"; do
  IFS='|' read -r name color description <<< "$label_def"
  
  # Check if label already exists
  if gh label list --json name --jq ".[] | select(.name == \"$name\")" | grep -q "$name"; then
    echo "  ✓ $name (already exists)"
    EXISTS=$((EXISTS + 1))
  else
    # Create the label
    if gh label create "$name" --color "$color" --description "$description" 2>/dev/null; then
      echo "  ✅ $name (created)"
      CREATED=$((CREATED + 1))
    else
      echo "  ❌ $name (failed to create)"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

echo ""
echo "======================="
echo "Summary:"
echo "  Already existed: $EXISTS"
echo "  Created: $CREATED"
if [ $ERRORS -gt 0 ]; then
  echo "  Errors: $ERRORS"
fi
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "⚠️  Some labels failed to create"
  echo "This is usually okay if the labels already exist with different colors/descriptions"
  exit 0
fi

if [ $CREATED -gt 0 ]; then
  echo "✅ Setup complete! Created $CREATED new label(s)"
else
  echo "✅ All labels already exist - nothing to do"
fi

echo ""
echo "📚 Documentation:"
echo "  See docs/GITHUB-LABELS.md for a complete label reference"
