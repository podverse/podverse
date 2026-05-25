# Execution order — Remove “legacy” references

**Run prompts from:** [COPY-PASTA.md](./COPY-PASTA.md) (01 → 05).

**Scope:** Podverse monorepo — docs, `.cursor`, apps, packages, infra comments/scripts. Exclude list in plan 01 is binding.

## Critical rule

**Phases are sequential.** Complete verification gates before the next phase.

---

## Phase 1 — Contract (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 1.1 | [01-inventory-and-exclusion-contract.md](./01-inventory-and-exclusion-contract.md) | Baseline `rg` output saved; exclusion doc committed in plan 01 or `docs/development/tooling/` if team wants runtime reference |

**Gate:** Team agrees on exclusions (SQL filenames, third-party APIs, lockfile, Lighthouse reports).

---

## Phase 2 — Docs and env (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 2.1 | [02-operator-docs-and-env-wording.md](./02-operator-docs-and-env-wording.md) | No `legacy` in `docs/` (except exclusions), `apps/*/ENV.md`, env override docs |

**Gate:** `rg -i '\blegacy\b' docs apps/web/ENV.md apps/management-web/ENV.md scripts/local-env --glob '!**/.llm/**'` → only `BRAND_COLOR_BACKGROUND` alternate-key lines rephrased (zero matches) |

---

## Phase 3 — Cursor guidance (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 3.1 | [03-cursor-skills-and-internal-docs.md](./03-cursor-skills-and-internal-docs.md) | `.cursor/skills` and `.cursor/rules` free of confusing “legacy” |

**Gate:** `rg -i '\blegacy\b' .cursor --glob '!**/.llm/**'` clean per exclusions |

---

## Phase 4 — Code identifiers (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 4.1 | [04-typescript-identifiers-and-comments.md](./04-typescript-identifiers-and-comments.md) | Renamed symbols; updated comments in apps + packages |

**Gate:** `rg -i '\blegacy\b' apps packages scripts infra --glob '!**/.llm/**' --glob '!**/linear-migrations/**' --glob '!package-lock.json' --glob '!tools/web-perf/lighthouse/reports/**'` clean per exclusions |

---

## Phase 5 — Verification (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 5.1 | [05-verification-and-ci-guard.md](./05-verification-and-ci-guard.md) | Full-repo grep; `npm run lint`; targeted tests for renamed exports |

**Gate:** Plan 05 verification commands pass; move plan set to `completed/` per plan-completion skill.
