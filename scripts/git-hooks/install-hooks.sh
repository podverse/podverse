#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Skip silently when there is no usable git context (e.g. Docker mounts of a
# worktree without the linked .git dir, tarball installs, some CI sandboxes).
# Hooks are a developer convenience and must never block `npm ci`.
if ! HOOKS_DIR="$(git -C "$REPO_ROOT" rev-parse --git-path hooks 2>/dev/null)"; then
  echo "Skipping git hooks install: no usable git working tree at $REPO_ROOT."
  exit 0
fi

# `git rev-parse --git-path` may return a relative path; normalize to absolute.
case "$HOOKS_DIR" in
  /*) ;;
  *) HOOKS_DIR="$REPO_ROOT/$HOOKS_DIR" ;;
esac

echo "Installing git hooks..."
mkdir -p "$HOOKS_DIR"

git -C "$REPO_ROOT" config commit.template .gitmessage

# Pre-commit formatting was removed; drop any legacy hook so commits are not blocked.
rm -f "$HOOKS_DIR/pre-commit"

cp "$SCRIPT_DIR/pre-push" "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-push"

echo "✓ Git hooks installed (pre-push)"
echo "✓ Commit message template set (.gitmessage)"
