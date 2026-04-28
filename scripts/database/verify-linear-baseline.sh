#!/usr/bin/env bash
# Fail if 0003_linear_baseline.sql or 0004_seed_linear_migration_history.sql does not match generator output.
# Use after editing infra/k8s/base/ops/source/database/linear-migrations and in CI (e.g. /test on a PR). Requires Docker for 0003.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT="$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql"
SEED="$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql"

print_fix_hint() {
  {
    echo "To regenerate 0003 and 0004 from the repo root:" >&2
    echo "  make db_regen_linear_baseline" >&2
    echo "  make db_verify_linear_baseline" >&2
    echo "Or: bash scripts/database/generate-linear-baseline.sh" >&2
  } >&2
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Linear baseline 0003 out of date"
      echo
      echo "Regenerate from the repository root, then commit \`0003_linear_baseline.sql\`:"
      echo
      echo '```'
      echo "make db_regen_linear_baseline"
      echo "make db_verify_linear_baseline"
      echo '```'
      echo
      echo "Or: \`bash scripts/database/generate-linear-baseline.sh\`"
    } >>"$GITHUB_STEP_SUMMARY"
  fi
}

if [[ ! -f "$OUT" ]]; then
  echo "Missing baseline: $OUT" >&2
  print_fix_hint
  exit 1
fi
GEN="$(mktemp)"
GEN_SEED="$(mktemp)"
trap 'rm -f "$GEN" "$GEN_SEED"' EXIT
bash "$REPO_ROOT/scripts/database/generate-linear-baseline.sh" "$GEN"
if ! cmp -s "$OUT" "$GEN"; then
  echo "Linear baseline 0003 is out of date (migrations or generator changed)." >&2
  print_fix_hint
  diff -u "$OUT" "$GEN" | head -200 >&2 || true
  exit 1
fi
echo "OK: 0003_linear_baseline.sql matches generated output."

if [[ ! -f "$SEED" ]]; then
  echo "Missing migration history seed: $SEED" >&2
  print_fix_hint
  exit 1
fi
bash "$REPO_ROOT/scripts/database/generate-linear-migration-history-seed.sh" "$GEN_SEED"
if ! cmp -s "$SEED" "$GEN_SEED"; then
  echo "Migration history seed 0004 is out of date (linear migration files or generator changed)." >&2
  print_fix_hint
  diff -u "$SEED" "$GEN_SEED" | head -200 >&2 || true
  exit 1
fi
echo "OK: 0004_seed_linear_migration_history.sql matches generated output."
