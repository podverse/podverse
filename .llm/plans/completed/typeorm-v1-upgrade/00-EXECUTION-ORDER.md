# Execution order — TypeORM 1.0 upgrade

**Run prompts from:** [COPY-PASTA.md](./COPY-PASTA.md) (01 → 09).

**Scope:** Podverse monorepo — `typeorm` 0.3.30 → 1.0.0 hard break.

## Critical rules

1. **Phases are sequential.** Do not start Phase N+1 until Phase N verification gates pass.
2. **Hard-break policy** from [00-SUMMARY.md](./00-SUMMARY.md) applies to every step — no legacy compatibility.
3. **Do not merge Dependabot #221** without completing this entire plan set.

---

## Phase 1 — Baseline contract (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 1.1 | [01-baseline-inventory-and-contract.md](./01-baseline-inventory-and-contract.md) | Baseline counts saved; scope contract committed |

**Gate:** Baseline summary table recorded in plan 01 completion note; team agrees on in-scope paths.

---

## Phase 2 — Dependency bump (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 2.1 | [02-dependency-bump-and-naming-strategy.md](./02-dependency-bump-and-naming-strategy.md) | `typeorm@^1.0.0`; vendored naming strategy; lockfile updated |

**Gate:** `rg "typeorm-naming-strategies" package.json packages apps tools` → 0; lockfile resolves `typeorm@1.x`.

---

## Phase 3 — Codemod (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 3.1 | [03-automated-codemod-pass.md](./03-automated-codemod-pass.md) | `@typeorm/codemod v1` applied; TODOs resolved |

**Gate:** `rg 'TODO.*typeorm|TODO.*codemod|@typeorm/codemod' --glob '*.ts'` → 0 (excluding `.llm/`).

---

## Phase 4 — Find options: ORM package (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 4.1 | [04-find-options-orm-package.md](./04-find-options-orm-package.md) | All string `relations`/`select` in `packages/orm` converted |

**Gate:** `rg "relations: \[|select: \[" packages/orm --glob '*.ts'` → 0.

---

## Phase 5 — Find options: apps and parser (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 5.1 | [05-find-options-apps-and-parser.md](./05-find-options-apps-and-parser.md) | All string `relations`/`select` in apps/parser/scripts converted |

**Gate:** `rg "relations: \[|select: \[" apps packages/parser scripts --glob '*.ts'` → 0.

---

## Phase 6 — QueryBuilder hotspots (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 6.1 | [06-querybuilder-and-high-risk-services.md](./06-querybuilder-and-high-risk-services.md) | `queueResource` fixed; QB services audited |

**Gate:** `rg "findOne\('" packages/orm` → 0; `./scripts/nix/with-env npm run build -w @podverse/orm`.

---

## Phase 7 — Management-api and tools (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 7.1 | [07-management-api-and-satellite-consumers.md](./07-management-api-and-satellite-consumers.md) | Satellite consumers compile under v1 |

**Gate:** `./scripts/nix/with-env npm run build -w apps/management-api && npm run build -w apps/workers`.

---

## Phase 8 — Docs and skills (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 8.1 | [08-docs-skills-and-type-exports.md](./08-docs-skills-and-type-exports.md) | ORM skill rewritten; stale references removed |

**Gate:** Grep gates from plan 08 pass.

---

## Phase 9 — Verification and merge (1 agent)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 9.1 | [09-verification-and-merge-gates.md](./09-verification-and-merge-gates.md) | Full build/lint/test; plan set moved to `completed/` |

**Gate:** All commands in plan 09 pass; move plan set per plan-completion skill.
