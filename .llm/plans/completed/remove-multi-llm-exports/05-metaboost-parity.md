# Plan 05 — Metaboost parity

## Objective

Apply the same removal in **Metaboost** as Podverse plans 01–04. Metaboost mirrors Podverse’s export system today.

## Scope

Metaboost repo root: `/Users/mitcheldowney/repos/pv/metaboost`

Execute after Podverse plans 01–04 are complete (or in a parallel PR if preferred).

## Instructions

Run the Metaboost-local plan files (same content, Metaboost paths):

| Metaboost plan | Equivalent Podverse plan |
| -------------- | ------------------------ |
| `metaboost/.llm/plans/active/remove-multi-llm-exports/01-remove-scripts-and-ci.md` | Podverse 01 |
| `metaboost/.llm/plans/active/remove-multi-llm-exports/02-remove-exports-tree-and-gitignore.md` | Podverse 02 |
| `metaboost/.llm/plans/active/remove-multi-llm-exports/03-rewrite-cursor-guidance.md` | Podverse 03 |
| `metaboost/.llm/plans/active/remove-multi-llm-exports/04-revise-llm-docs.md` | Podverse 04 |

## Metaboost-specific extras

In addition to Podverse parity, update:

| Path | Action |
| ---- | ------ |
| `.cursor/skills/INDEX.md` | Remove `llm-exports-scripts` entry |
| `docs/QUICK-START.md` | Remove export pipeline references if present |
| `.llm/LLM.md` | Same exports section removal as Podverse |

Metaboost has **no** `complete-feature.yml` — do not add one; history automation differs from Podverse.

## Verification (Metaboost)

```bash
cd /Users/mitcheldowney/repos/pv/metaboost
test ! -d scripts/llm
test ! -d .llm/exports
./scripts/nix/with-env npm run lint
rg 'llm-exports|export-from-cursor|LLM_EXPORT|LLM-EDITOR-ALIGNMENT|llm:exports|\.llm/exports' \
  --glob '!**/.llm/plans/completed/**' --glob '!**/node_modules/**'
# Expect no hits outside completed archives
```

## Acceptance checklist

- [ ] Metaboost plans 01–04 complete
- [ ] `INDEX.md` and `QUICK-START.md` updated
- [ ] Lint passes in Metaboost
