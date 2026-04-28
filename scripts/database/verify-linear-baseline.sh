#!/usr/bin/env bash
# Fail if 0003_linear_baseline.sql does not match generate-linear-baseline.sh output.
# Use after editing ops/source/migrations and in CI (e.g. /test on a PR). Requires Docker.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT="$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql"

print_fix_hint() {
  {
    echo "To regenerate 0003 from the repo root:" >&2
    echo "  make regen_linear_baseline" >&2
    echo "  make verify_linear_baseline" >&2
    echo "Or: bash scripts/database/generate-linear-baseline.sh" >&2
  } >&2
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Linear baseline 0003 out of date"
      echo
      echo "Regenerate from the repository root, then commit \`0003_linear_baseline.sql\`:"
      echo
      echo '```'
      echo "make regen_linear_baseline"
      echo "make verify_linear_baseline"
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
trap 'rm -f "$GEN"' EXIT
bash "$REPO_ROOT/scripts/database/generate-linear-baseline.sh" "$GEN"
if ! cmp -s "$OUT" "$GEN"; then
  echo "Linear baseline 0003 is out of date (migrations or generator changed)." >&2
  print_fix_hint
  diff -u "$OUT" "$GEN" | head -200 >&2 || true
  exit 1
fi
echo "OK: 0003_linear_baseline.sql matches generated output."
