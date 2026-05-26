# TypeORM 1.0 upgrade — COPY-PASTA prompts

**Plan set:** `.llm/plans/active/typeorm-v1-upgrade/`

**Do not implement until ready.** After each completed prompt: mark ✅ below; move completed plan file to `.llm/plans/completed/typeorm-v1-upgrade/` per plan-completion skill.

**Hard-break policy:** No legacy TypeORM compatibility. See [00-SUMMARY.md](./00-SUMMARY.md).

---

## Phase 1 — Baseline contract

### Step 1.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/01-baseline-inventory-and-contract.md

Hard-break policy: no legacy TypeORM compatibility.

Verify: baseline rg counts captured in plan 01 completion note; scope contract agreed.
```

---

## Phase 2 — Dependency bump

### Step 2.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/02-dependency-bump-and-naming-strategy.md

Hard-break policy: no legacy TypeORM compatibility.

Verify:
rg "typeorm-naming-strategies" package.json packages apps tools
rg '"typeorm"' package.json packages apps tools/web-perf/lighthouse
```

---

## Phase 3 — Codemod

### Step 3.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/03-automated-codemod-pass.md

Hard-break policy: no legacy TypeORM compatibility.

Verify:
rg 'TODO.*typeorm|TODO.*codemod' --glob '*.ts' --glob '!**/.llm/**'
./scripts/nix/with-env npm run lint:fix
```

---

## Phase 4 — Find options: ORM package

### Step 4.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/04-find-options-orm-package.md

Hard-break policy: no legacy TypeORM compatibility.

Verify:
rg "relations: \[|select: \[" packages/orm --glob '*.ts'
```

---

## Phase 5 — Find options: apps and parser

### Step 5.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/05-find-options-apps-and-parser.md

Hard-break policy: no legacy TypeORM compatibility.

Verify:
rg "relations: \[|select: \[" apps packages/parser scripts --glob '*.ts'
```

---

## Phase 6 — QueryBuilder hotspots

### Step 6.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/06-querybuilder-and-high-risk-services.md

Hard-break policy: no legacy TypeORM compatibility.

Verify:
rg "findOne\('" packages/orm --glob '*.ts'
./scripts/nix/with-env npm run build -w @podverse/orm
```

---

## Phase 7 — Management-api and tools

### Step 7.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/07-management-api-and-satellite-consumers.md

Hard-break policy: no legacy TypeORM compatibility.

Verify:
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run build -w apps/workers
```

---

## Phase 8 — Docs and skills

### Step 8.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/08-docs-skills-and-type-exports.md

Hard-break policy: no legacy TypeORM compatibility.

Verify: grep gates from plan 08 pass.
```

---

## Phase 9 — Verification and merge

### Step 9.1

```
Read and execute .llm/plans/active/typeorm-v1-upgrade/09-verification-and-merge-gates.md

Hard-break policy: no legacy TypeORM compatibility.

Verify: all build/lint/test commands from plan 09 pass; move plan set to completed/.
```

---

## Progress

- [ ] 1.1 — Baseline inventory and contract
- [ ] 2.1 — Dependency bump and naming strategy
- [ ] 3.1 — Automated codemod pass
- [ ] 4.1 — Find options: ORM package
- [ ] 5.1 — Find options: apps and parser
- [ ] 6.1 — QueryBuilder and high-risk services
- [ ] 7.1 — Management-api and satellite consumers
- [ ] 8.1 — Docs, skills, and type exports
- [ ] 9.1 — Verification and merge gates
