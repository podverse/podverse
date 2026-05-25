# Plan 03 — Rewrite Cursor guidance (Podverse)

## Objective

Remove export-specific rules/skills and simplify remaining guidance to **Cursor-only** policy.

## Scope

Podverse `.cursor/`, `AGENTS.md`, `.llm/LLM.md`, and any other files referencing the export pipeline.

## Steps

### 1. Delete export-only artifacts

Remove entirely:

- `.cursor/skills/llm-exports-scripts/` (directory + `SKILL.md`)
- `.cursor/rules/llm-exports-ci.mdc`

### 2. Rewrite `llm-cursor-source` rule

File: `.cursor/rules/llm-cursor-source.mdc`

Replace export/CI content with Cursor-only policy:

- **Source of truth:** `.cursor/skills/`, `.cursor/rules/*.mdc`, `.cursorrules`, `.cursorignore`
- **Commit policy:** when changing AI guidance, commit only those paths
- **No** references to `.llm/exports/`, `llm-exports-sync`, `llm-full`, `LLM_EXPORT_ALLOW_LOCAL`, `npm run llm:exports:*`, or non-Cursor editors

Keep the rule **always-applied** (`alwaysApply: true`).

### 3. Rewrite `llm-cursor-source` skill

File: `.cursor/skills/llm-cursor-source/SKILL.md`

Mirror the rule content. Remove sections:

- "Other LLM editors"
- Machine-generated exports / CI branches
- `npm run llm:vendors`
- Links to `LLM-EDITOR-ALIGNMENT-PROMPT.md`, `GH-EXPORTS-SETUP.md`, `EXPORT-TARGETS.md`

Point to rewritten `docs/development/llm/DOCS-DEVELOPMENT-LLM.md` for contributor policy.

### 4. Update `AGENTS.md`

In the "LLM / editor guidance" section, remove:

- `.llm/exports/` machine-generated trees
- `llm-exports-sync` / `llm-exports-full-sync` Actions
- `LLM_EXPORT_ALLOW_LOCAL=1`
- Non-Cursor alignment prompt references

Replace with: authoritative guidance lives in `.cursor/` and `.cursorrules`; see `DOCS-DEVELOPMENT-LLM.md`.

### 5. Update `.llm/LLM.md`

Remove the **"Machine-generated exports"** section (lines describing `.llm/exports/` and `llm-cursor-source` export policy).

### 6. Repo-wide stale reference sweep

Grep and fix remaining references outside completed plan archives:

```bash
rg -l 'llm-exports|export-from-cursor|LLM_EXPORT|LLM-EDITOR-ALIGNMENT|llm:exports|llm-exports-scripts|llm-exports-ci|\.llm/exports' \
  --glob '!**/.llm/plans/completed/**' --glob '!**/node_modules/**'
```

Likely touch points (fix or remove stale links):

- `.cursorrules` — verify no export references (currently clean)
- Other skills/rules that link to deleted export docs
- `docs/QUICKSTART.md`, `docs/development/CONTRIBUTING.md` if they mention exports

**Do not edit** `.llm/plans/completed/**` historical files.

## Key files

| Path | Action |
| ---- | ------ |
| `.cursor/skills/llm-exports-scripts/` | Delete |
| `.cursor/rules/llm-exports-ci.mdc` | Delete |
| `.cursor/rules/llm-cursor-source.mdc` | Rewrite |
| `.cursor/skills/llm-cursor-source/SKILL.md` | Rewrite |
| `AGENTS.md` | Update LLM section |
| `.llm/LLM.md` | Remove exports section |

## Verification

```bash
./scripts/nix/with-env npm run lint
rg 'llm-exports-scripts|llm-exports-ci|LLM_EXPORT_ALLOW_LOCAL' .cursor AGENTS.md .llm/LLM.md
# Expect no matches
```

## Acceptance checklist

- [ ] Export skill and rule deleted
- [ ] `llm-cursor-source` is Cursor-only
- [ ] `AGENTS.md` and `.llm/LLM.md` updated
- [ ] No stale export references outside completed archives
