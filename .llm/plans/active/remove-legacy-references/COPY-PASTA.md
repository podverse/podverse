# Remove “legacy” references — COPY-PASTA prompts

**Plan set:** `.llm/plans/active/remove-legacy-references/`

**Do not implement until ready.** After each completed prompt: mark ✅ below; move completed plan file to `.llm/plans/completed/remove-legacy-references/` per plan-completion skill.

---

## Phase 1 — Inventory and exclusions

### Step 1.1

```
Read and execute .llm/plans/active/remove-legacy-references/01-inventory-and-exclusion-contract.md

Verify: baseline rg output captured; exclusion list is explicit.
```

---

## Phase 2 — Docs and env

### Step 2.1

```
Read and execute .llm/plans/active/remove-legacy-references/02-operator-docs-and-env-wording.md

Verify:
rg -i '\blegacy\b' docs apps/web/ENV.md apps/management-web/ENV.md scripts/local-env/setup.sh --glob '!**/.llm/**'
```

---

## Phase 3 — Cursor skills and rules

### Step 3.1

```
Read and execute .llm/plans/active/remove-legacy-references/03-cursor-skills-and-internal-docs.md

Verify:
rg -i '\blegacy\b' .cursor --glob '!**/.llm/**'
```

---

## Phase 4 — TypeScript identifiers

### Step 4.1

```
Read and execute .llm/plans/active/remove-legacy-references/04-typescript-identifiers-and-comments.md

Verify:
rg -i '\blegacy\b' apps packages scripts infra --glob '!**/.llm/**' --glob '!**/linear-migrations/**' --glob '!package-lock.json' --glob '!tools/web-perf/lighthouse/reports/**' --glob '!flake.nix'
./scripts/nix/with-env npm run lint
```

---

## Phase 5 — Verification

### Step 5.1

```
Read and execute .llm/plans/active/remove-legacy-references/05-verification-and-ci-guard.md

Verify: full gate from plan 05 passes; move plan set to completed/.
```

---

## Progress

- [ ] 1.1 — Inventory and exclusion contract
- [ ] 2.1 — Operator docs and env wording
- [ ] 3.1 — Cursor skills and internal docs
- [ ] 4.1 — TypeScript identifiers and comments
- [ ] 5.1 — Verification and CI guard
