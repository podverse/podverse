#!/bin/bash
# Complete GitHub Labels Setup - Podverse Repository
# Creates all 21 labels needed for the repository with correct colors and descriptions
#
# This script can completely recreate the label system from scratch
#
# Usage:
#   gh auth login  # Authenticate once
#   ./scripts/github/setup-all-labels.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "🏷️  GitHub Labels - Complete Setup"
echo "===================================="
echo ""
echo "This script creates all 23 labels for the Podverse repository"
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

# Define ALL labels with colors and descriptions
# Format: "name|color|description"
LABELS=(
  # === GITHUB DEFAULTS (6) ===
  "bug|990000|Something isn't working"
  "duplicate|888888|This issue or pull request already exists"
  "enhancement|00FF99|New feature or request"
  "invalid|999999|This issue is invalid"
  "question|9900FF|A question for the maintainers or community"
  "wontfix|999999|This will not be worked on"
  
  # === TYPE - CUSTOM (1) ===
  "technical-improvement|0075ca|Code quality, refactoring, optimization, and architecture improvements"
  
  # === CODE AREAS (8) - Monorepo structure ===
  "apps|0e8a16|Changes to apps/"
  "packages|1d76db|Changes to packages/"
  "docs|fef2c0|Changes to docs/"
  "infra|d93f0b|Changes to infra/"
  "ci|fbca04|Changes to .github/"
  "scripts|5319e7|Changes to scripts/"
  "tools|e99695|Changes to tools/"
  "i18n|c5def5|Changes to internationalization files"
  
  # === WORKFLOW & SECURITY (2) ===
  "blocked|990099|The work on this issue is blocked by another issue"
  "security|550000|Security vulnerabilities"
  
  # === DEPENDENCIES & PRIORITY (6) ===
  "dependencies|0366d6|Dependency updates and security issues"
  "docker|384d54|Docker image and container updates"
  "priority:critical|e11d21|Critical priority issues requiring immediate attention"
  "priority:high|eb6420|High priority issues"
  "priority:medium|d4c5f9|Medium priority issues"
  "priority:low|1f8b84|Low priority issues"
)

echo "Creating labels (${#LABELS[@]} total)..."
echo ""

CREATED=0
EXISTS=0
UPDATED=0
ERRORS=0

for label_def in "${LABELS[@]}"; do
  IFS='|' read -r name color description <<< "$label_def"
  
  # Check if label already exists
  EXISTING=$(gh label list --json name,color,description --jq ".[] | select(.name == \"$name\")" 2>/dev/null || echo "")
  
  if [ -n "$EXISTING" ]; then
    # Label exists - check if it needs updating
    EXISTING_COLOR=$(echo "$EXISTING" | jq -r '.color')
    EXISTING_DESC=$(echo "$EXISTING" | jq -r '.description // ""')
    
    # Normalize colors for comparison (remove # if present)
    EXISTING_COLOR="${EXISTING_COLOR#\#}"
    color="${color#\#}"
    
    if [ "$EXISTING_COLOR" != "$color" ] || [ "$EXISTING_DESC" != "$description" ]; then
      # Update the label
      if gh label edit "$name" --color "$color" --description "$description" 2>/dev/null; then
        echo "  🔄 $name (updated color/description)"
        UPDATED=$((UPDATED + 1))
      else
        echo "  ❌ $name (failed to update)"
        ERRORS=$((ERRORS + 1))
      fi
    else
      echo "  ✓ $name (already correct)"
      EXISTS=$((EXISTS + 1))
    fi
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
echo "===================================="
echo "Summary:"
echo "  Already correct: $EXISTS"
echo "  Created: $CREATED"
echo "  Updated: $UPDATED"
if [ $ERRORS -gt 0 ]; then
  echo "  Errors: $ERRORS"
fi
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "⚠️  Some labels had errors"
  exit 1
fi

if [ $CREATED -gt 0 ] || [ $UPDATED -gt 0 ]; then
  echo "✅ Setup complete!"
  if [ $CREATED -gt 0 ]; then
    echo "   Created $CREATED new label(s)"
  fi
  if [ $UPDATED -gt 0 ]; then
    echo "   Updated $UPDATED label(s)"
  fi
else
  echo "✅ All labels already exist with correct settings"
fi

echo ""
echo "📚 Documentation: docs/GITHUB-LABELS.md"
echo "🧹 To remove old labels: ./scripts/github/remove-old-labels.sh"
