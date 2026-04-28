#!/usr/bin/env bash
# Do not hand-commit machine-generated .llm/exports (see .llm/exports/README). Pushes to
# develop trigger llm-exports-sync; published exports go through branch llm and its PR to
# develop. Allow README, target .gitkeep, and .state only, unless bypass is set.
# Does not run the full sync (keeps pre-commit fast).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT" || exit 0

if [[ -n "$ALLOW_DERIVED_EXPORT_EDIT" ]]; then
  exit 0
fi

staged=$(git diff --cached --name-only 2>/dev/null || true)
if ! echo "$staged" | grep -qE '^\.llm/exports/'; then
  exit 0
fi

forbidden=0
while IFS= read -r p; do
  [[ -z "$p" ]] && continue
  if [[ "$p" == .llm/exports/LLM-EXPORTS.md ]]; then
    continue
  fi
  if [[ "$p" == .llm/exports/.state/* || "$p" == .llm/exports/.state/.gitkeep ]]; then
    continue
  fi
  if [[ "$p" =~ ^\.llm/exports/[^/]+/\.gitkeep$ ]]; then
    continue
  fi
  forbidden=1
  echo "$p" >&2
done < <(echo "$staged" | grep -E '^\.llm/exports/' || true)

if [[ "$forbidden" -eq 0 ]]; then
  exit 0
fi

cat << 'EOF' >&2
llm-exports: You are trying to commit paths under .llm/exports that are machine exports (or not allowlisted for manual commit).

Policy: .cursor/ and .cursorrules are the source of truth. The llm-exports-sync workflow runs npm run llm:exports:sync on the runner, updates branch llm, and opens/updates a PR to develop. Do not hand-commit skills/, instructions/, or copilot-instructions.md. See .llm/exports/LLM-EXPORTS.md and docs/development/llm/

To bypass (rare, emergencies only): ALLOW_DERIVED_EXPORT_EDIT=1 git commit ...
EOF
exit 1
