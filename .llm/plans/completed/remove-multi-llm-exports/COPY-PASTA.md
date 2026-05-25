# Remove multi-LLM exports — COPY-PASTA prompts

**Plan set:** `.llm/plans/active/remove-multi-llm-exports/`

**Do not implement until ready.** After each completed prompt: mark ✅ below; move completed plan file to `.llm/plans/completed/remove-multi-llm-exports/` per plan-completion skill.

---

## Phase 1 — Podverse pipeline removal

### Step 1.1

```
Read and execute .llm/plans/active/remove-multi-llm-exports/01-remove-scripts-and-ci.md

Verify:
test ! -d scripts/llm
rg 'llm:exports|export-from-cursor' package.json .github/workflows scripts/git-hooks || true
```

### Step 1.2

```
Read and execute .llm/plans/active/remove-multi-llm-exports/02-remove-exports-tree-and-gitignore.md

Verify:
test ! -d .llm/exports
git ls-files .llm/exports
```

---

## Phase 2 — Podverse guidance and docs

### Step 2.1

```
Read and execute .llm/plans/active/remove-multi-llm-exports/03-rewrite-cursor-guidance.md

Verify:
./scripts/nix/with-env npm run lint
rg 'llm-exports-scripts|LLM_EXPORT_ALLOW_LOCAL' .cursor AGENTS.md || true
```

### Step 2.2

```
Read and execute .llm/plans/active/remove-multi-llm-exports/04-revise-llm-docs.md

Verify:
rg 'EXPORT-TARGETS|GH-EXPORTS-SETUP|LLM-EDITOR-ALIGNMENT' docs .cursor AGENTS.md --glob '!**/.llm/plans/completed/**' || true
```

---

## Phase 3 — Metaboost parity

### Step 3.1

```
Read and execute .llm/plans/active/remove-multi-llm-exports/05-metaboost-parity.md

This runs Metaboost plans 01–04 from metaboost/.llm/plans/active/remove-multi-llm-exports/

Verify in Metaboost:
test ! -d scripts/llm
./scripts/nix/with-env npm run lint
```

---

## Phase 4 — Remote cleanup (after merge to develop)

### Step 4.1

```
Read and execute .llm/plans/active/remove-multi-llm-exports/06-remote-and-operator-cleanup.md

Manual GitHub steps for Podverse and Metaboost repos.
```

---

## Completion checklist

- [x] 01-remove-scripts-and-ci.md
- [x] 02-remove-exports-tree-and-gitignore.md
- [x] 03-rewrite-cursor-guidance.md
- [x] 04-revise-llm-docs.md
- [x] 05-metaboost-parity.md
- [x] 06-remote-and-operator-cleanup.md (runbook below — run after plans 01–05 merge to `develop`)

When all are done, move the plan set directory to `.llm/plans/completed/remove-multi-llm-exports/`.
