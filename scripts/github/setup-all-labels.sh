#!/bin/bash
# GitHub labels setup – Podverse repository
# Creates or updates all labels. Idempotent: run multiple times safely.
# Optionally prompts to delete repo labels that are not in the script (does not
# remove labels from existing issues/PRs; only retires them for new use).
#
# Usage:
#   gh auth login   # Authenticate once
#   ./scripts/github/setup-all-labels.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "🏷️  GitHub Labels – Setup"
echo "=========================="
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

echo "Creating/updating labels (${#LABELS[@]} total)..."
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
echo "=========================="
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
else
  echo "✅ All labels already exist with correct settings"
fi
echo ""

# Optional: delete repo labels that are not defined in this script
DEFINED_NAMES=()
for label_def in "${LABELS[@]}"; do
  IFS='|' read -r name _ _ <<< "$label_def"
  DEFINED_NAMES+=("$name")
done

REPO_LABELS=$(gh label list --json name --jq '.[].name' 2>/dev/null || echo "")
EXTRA_LABELS=()
while IFS= read -r name; do
  [ -z "$name" ] && continue
  found=0
  for def in "${DEFINED_NAMES[@]}"; do
    if [ "$name" = "$def" ]; then
      found=1
      break
    fi
  done
  [ $found -eq 0 ] && EXTRA_LABELS+=("$name")
done <<< "$REPO_LABELS"

if [ ${#EXTRA_LABELS[@]} -gt 0 ]; then
  echo "Labels in the repo that are not defined in this script (${#EXTRA_LABELS[@]}):"
  for name in "${EXTRA_LABELS[@]}"; do
    echo "  - $name"
  done
  echo ""
  echo "Deleting these labels will NOT remove them from existing issues or PRs;"
  echo "those will still show the label. The labels will no longer be available"
  echo "to add to new issues or PRs."
  echo ""

  if [ -t 0 ]; then
    read -p "Do you want to delete these labels? (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
      DELETED=0
      for name in "${EXTRA_LABELS[@]}"; do
        if gh label delete "$name" --yes 2>/dev/null; then
          echo "  🗑️  Deleted: $name"
          DELETED=$((DELETED + 1))
        else
          echo "  ❌ Failed to delete: $name"
        fi
      done
      echo ""
      echo "Deleted $DELETED label(s)."
    else
      echo "Skipped deletion. No labels were removed."
    fi
  else
    echo "Skipped deletion (not running interactively). No labels were removed."
  fi
  echo ""
fi
