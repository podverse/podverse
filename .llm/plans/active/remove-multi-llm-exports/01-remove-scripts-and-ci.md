# Plan 01 — Remove scripts and CI (Podverse)

## Objective

Delete the deterministic export pipeline and all CI that publishes `.llm/exports/` mirrors.

## Scope

Podverse repo root: `/Users/mitcheldowney/repos/pv/podverse`

## Steps

### 1. Delete `scripts/llm/` entirely

Remove the whole directory:

```
scripts/llm/
├── export-from-cursor.mjs
├── allowed-targets.mjs
├── vendor-config.mjs
├── vendor-selector.mjs
├── guard-exports-prompt.sh
└── lib/
    ├── copilot-adapter.mjs
    ├── github-style-adapter.mjs
    └── opencode-adapter.mjs
```

### 2. Delete GitHub Actions workflows

Remove:

- `.github/workflows/llm-exports-sync.yml`
- `.github/workflows/llm-exports-full-sync.yml`
- `.github/workflows/llm-exports-optional-cloud-llm.yml`

### 3. Remove npm scripts from root `package.json`

Delete these entries:

- `llm:exports:sync`
- `llm:exports:sync:full`
- `llm:exports:check`
- `llm:exports:restore`
- `llm:vendors`

### 4. Remove pre-commit export guard

In `scripts/git-hooks/pre-commit`, remove the block that invokes `guard-exports-prompt.sh` (lines referencing `GUARD_EXPORTS` and the conditional `bash "$GUARD_EXPORTS"`).

Pre-commit should run only `lint-staged` after this change.

### 5. Remove `llm` label from PR labeler

In `.github/workflows/pr-labeler.yml`, remove the line that adds label `llm` when files under `.cursor/` or `.cursorrules` change.

### 6. Optional: remove `llm` label definition

In `scripts/github/setup-all-labels.sh`, remove the `llm` label entry if present (operator hygiene; not blocking).

## Key files

| Path | Action |
| ---- | ------ |
| `scripts/llm/**` | Delete |
| `.github/workflows/llm-exports-*.yml` | Delete (3 files) |
| `package.json` | Remove 5 scripts |
| `scripts/git-hooks/pre-commit` | Remove guard block |
| `.github/workflows/pr-labeler.yml` | Remove `llm` label line |

## Verification

```bash
test ! -d scripts/llm
test ! -f .github/workflows/llm-exports-sync.yml
rg 'llm:exports|export-from-cursor' package.json scripts/git-hooks .github/workflows
# Expect no matches (except possibly in comments elsewhere)
```

## Acceptance checklist

- [ ] `scripts/llm/` gone
- [ ] Three export workflows gone
- [ ] Five npm scripts removed
- [ ] Pre-commit no longer references export guard
- [ ] PR labeler no longer adds `llm` label
