#!/usr/bin/env bash
# Runs an abcbranchesmerge set under plan-runner, one fresh agent per step, one step at a time.
#
# The set is .llm/plans/active/branches-merge-<slug>/, written by an abcbranchesmerge chat
# before this script runs. The script does not pass --parallel: every step edits one checkout.
#
# Usage: ./scripts/abcbranchesmerge/run.sh <slug> [--resume 'msg'] [--clear] [--dry-run] [--stop-after NN]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

usage() {
  echo "Usage: ./scripts/abcbranchesmerge/run.sh <slug> [--resume 'msg'] [--clear] [--dry-run] [--stop-after NN]" >&2
}

slug="${1:-}"
if ! printf '%s' "$slug" | grep -E -q '^[a-z0-9][a-z0-9-]*$'; then
  usage
  echo "The slug is lowercase letters, digits, and hyphens, for example feature-merge-2026-10-29." >&2
  exit 1
fi
shift

RUNNER_DIR="$(cd "$REPO_ROOT/.." && pwd)/plan-runner"
RUNNER="$RUNNER_DIR/run-plan-set.mjs"
ACTIVE_DIR=".llm/plans/active"
SET="branches-merge-$slug"
SET_DIR="$ACTIVE_DIR/$SET"

if [ ! -f "$RUNNER" ]; then
  echo "plan-runner not found at $RUNNER. Clone it next to this repo." >&2
  exit 1
fi
if [ ! -d "$RUNNER_DIR/node_modules" ]; then
  echo "Install plan-runner first: npm --prefix ../plan-runner install" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node is not on PATH. Run from the repo root with direnv loaded." >&2
  exit 1
fi

if [ ! -f "$SET_DIR/COPY-PASTA.md" ]; then
  echo "No plan at $SET_DIR/COPY-PASTA.md." >&2
  echo "Invoke abcbranchesmerge in a chat of the window where the into-branch is checked out." >&2
  exit 1
fi

if grep -q '^- \[ \] \*\*' "$SET_DIR/COPY-PASTA.md"; then
  echo "Continuing abcbranchesmerge run $SET"
else
  case " $* " in
    *" --resume "* | *" --clear "*)
      echo "No open abcbranchesmerge run for $slug." >&2
      exit 1
      ;;
  esac
  echo "abcbranchesmerge run $SET is already finished."
  echo "Its last message is under .artifacts/plan-runner/$SET/."
  exit 0
fi

exec node "$RUNNER" "$SET" "$@"
