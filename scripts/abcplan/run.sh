#!/usr/bin/env bash
# Runs an abcplan request under plan-runner (sibling checkout), one fresh Cursor agent per step.
#
#   plan <slug>  Planning run. Reads .llm/plans/active/<slug>/00-REQUEST.md and writes the plan set
#                next to it. The run itself is .llm/plans/active/abcplan-<slug>/, built from
#                .cursor/prompts/abcplan/plan-COPY-PASTA.md and continued while it has an unticked
#                step. When the set already has COPY-PASTA.md, planning is finished: plan exits
#                and names the run command instead of starting another planning run.
#   run <slug>   Implementation run of .llm/plans/active/<slug>/COPY-PASTA.md. Refuses while the
#                planning run is open, and removes it once finished. Its final messages stay in
#                .artifacts/plan-runner/abcplan-<slug>/.
#
# Both modes pass --parallel: every pending prompt under the first pending ## heading runs at once.
# Planning steps under one heading write separate plan files, and the implementation set's phases
# hold only prompts that edit disjoint files.
#
# Runner flags (--resume 'msg', --clear, --dry-run, --stop-after NN) pass through.
#
# Usage: ./scripts/abcplan/run.sh {plan|run} <slug> [runner flags]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

usage() {
  echo "Usage: ./scripts/abcplan/run.sh {plan|run} <slug> [--resume 'msg'] [--clear] [--dry-run] [--stop-after NN]" >&2
}

mode="${1:-}"
slug="${2:-}"
case "$mode" in
  plan | run) ;;
  *)
    usage
    exit 1
    ;;
esac
if ! printf '%s' "$slug" | grep -E -q '^[a-z0-9][a-z0-9-]*$'; then
  usage
  echo "The slug is lowercase letters, digits, and hyphens, for example add-by-rss-parity." >&2
  exit 1
fi
shift 2

RUNNER_DIR="$(cd "$REPO_ROOT/.." && pwd)/plan-runner"
RUNNER="$RUNNER_DIR/run-plan-set.mjs"
TEMPLATE=".cursor/prompts/abcplan/plan-COPY-PASTA.md"
ACTIVE_DIR=".llm/plans/active"
PLAN_DIR="$ACTIVE_DIR/$slug"
PLANNING_SET="abcplan-$slug"
PLANNING_DIR="$ACTIVE_DIR/$PLANNING_SET"

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

planning_is_open() {
  grep -q '^- \[ \] \*\*' "$PLANNING_DIR/COPY-PASTA.md" 2>/dev/null
}

if [ "$mode" = "plan" ]; then
  if [ ! -f "$PLAN_DIR/00-REQUEST.md" ]; then
    echo "No request at $PLAN_DIR/00-REQUEST.md. Invoke abcplan in a chat to write it." >&2
    exit 1
  fi
  if [ -f "$PLAN_DIR/COPY-PASTA.md" ] && ! planning_is_open; then
    echo "Planning for $slug is already assembled at $PLAN_DIR/COPY-PASTA.md."
    echo "Run it with: ./scripts/abcplan/run.sh run $slug"
    exit 0
  fi
  if [ -f "$PLANNING_DIR/COPY-PASTA.md" ]; then
    if ! planning_is_open; then
      echo "Planning for $slug is finished. Review $PLAN_DIR/00-SUMMARY.md and"
      echo "$PLAN_DIR/COPY-PASTA.md, then run: ./scripts/abcplan/run.sh run $slug"
      exit 0
    fi
    echo "Continuing abcplan planning run $PLANNING_SET"
  else
    case " $* " in
      *" --resume "* | *" --clear "*)
        echo "No open planning run for $slug. Start one with: ./scripts/abcplan/run.sh plan $slug" >&2
        exit 1
        ;;
    esac
    mkdir -p "$PLANNING_DIR"
    sed -e "s/{{SET}}/$PLANNING_SET/g" -e "s/{{PLAN}}/$slug/g" "$TEMPLATE" >"$PLANNING_DIR/COPY-PASTA.md"
    echo "Started abcplan planning run $PLANNING_SET"
  fi
  exec node "$RUNNER" "$PLANNING_SET" --parallel "$@"
fi

if planning_is_open; then
  echo "Planning for $slug still has unticked steps. Finish it first:" >&2
  echo "  ./scripts/abcplan/run.sh plan $slug" >&2
  exit 1
fi
if [ ! -f "$PLAN_DIR/COPY-PASTA.md" ] && [ ! -f ".llm/plans/completed/$slug/COPY-PASTA.md" ]; then
  echo "No COPY-PASTA.md for $slug. Run the planning first: ./scripts/abcplan/run.sh plan $slug" >&2
  exit 1
fi
rm -rf "$PLANNING_DIR"
exec node "$RUNNER" "$slug" --parallel "$@"
