#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Worktrees use a .git file; hooks live in the main repo's .git/hooks (shared).
HOOKS_DIR="$(git -C "$REPO_ROOT" rev-parse --git-path hooks)"

echo "Installing git hooks..."
mkdir -p "$HOOKS_DIR"

git -C "$REPO_ROOT" config commit.template .gitmessage

# Pre-commit formatting was removed; drop any legacy hook so commits are not blocked.
rm -f "$HOOKS_DIR/pre-commit"

cp "$SCRIPT_DIR/pre-push" "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-push"

echo "✓ Git hooks installed (pre-push)"
echo "✓ Commit message template set (.gitmessage)"
