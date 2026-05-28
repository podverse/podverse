# Plan 02 — Remove exports tree and git config (Podverse)

## Objective

Remove `.llm/exports/` and all git/cursor configuration that existed only for multi-editor mirrors.

## Scope

Podverse repo root.

## Steps

### 1. Delete `.llm/exports/` directory

Remove the entire tree, including:

- `.llm/exports/LLM-EXPORTS.md`
- `.llm/exports/.state/`
- `.llm/exports/github-copilot/` (skills, instructions, `copilot-instructions.md`, `.gitkeep`)
- `.llm/exports/opencode/` (same shape)

**Note:** ~166 paths may be **git-tracked** despite `.gitignore` (CI used `git add -A -f`). Use explicit removal from the index.

### 2. Untrack cached export paths

If `git ls-files .llm/exports` returns paths:

```bash
git rm -r --cached .llm/exports 2>/dev/null || true
```

Then delete any remaining files on disk.

### 3. Clean `.gitignore`

Remove the block that ignores generated export paths (~lines 94–109), including:

- `/.llm/local/vendors.json`
- `/.llm/exports/github-copilot/skills/`, `instructions/`, `copilot-instructions.md`
- `/.llm/exports/opencode/skills/`, `instructions/`, `opencode-instructions.md`
- Commented examples for `.copilot/`, `.windsurf/`, etc. (if only export-related)

Remove the policy comment that points to `DOCS-DEVELOPMENT-LLM.md` export sections if no longer accurate.

### 4. Clean `.cursorignore`

Remove the line that hides `.llm/exports/` from Cursor (no longer needed — directory will not exist).

## Key files

| Path | Action |
| ---- | ------ |
| `.llm/exports/**` | Delete |
| `.gitignore` | Remove export-related blocks |
| `.cursorignore` | Remove `.llm/exports/` entry |

## Verification

```bash
test ! -d .llm/exports
git ls-files .llm/exports
# Expect empty output
rg '\.llm/exports' .gitignore .cursorignore
# Expect no matches
```

## Acceptance checklist

- [ ] `.llm/exports/` directory deleted
- [ ] No tracked files under `.llm/exports/`
- [ ] `.gitignore` export blocks removed
- [ ] `.cursorignore` export entry removed
