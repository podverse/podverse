# LLM exports CI sync — summary (implemented)

## Scope

Deterministic `npm run llm:exports:sync` from `.cursor` + `.cursorrules` into `.llm/exports/<target-id>/`, with `github-copilot` as the first allowlisted target. Max 10 opt-in target directories; each needs `.gitkeep` or `.export-target` plus an allowlist entry in `scripts/llm/allowed-targets.mjs`.

## Delivered

- `scripts/llm/*` (export driver, allowlist, Copilot adapter, pre-commit guard)
- `.llm/exports/README.md`, `github-copilot/.gitkeep`, `.state/.gitkeep`, generated `github-copilot/` tree
- `package.json` scripts `llm:exports:sync` / `llm:exports:check`
- Workflows: `llm-exports-sync.yml` (verify on PR, commit on `develop` push, `workflow_dispatch`); `llm-exports-optional-cloud-llm.yml` (disabled stub)
- `docs/development/llm/GH-EXPORTS-SETUP.md` and README updates; AGENTS / QUICK-START (Metaboost) callouts
- Parity: same layout in the Metaboost repository

## Verification

- `npm run llm:exports:sync` then `git add .llm/exports && npm run llm:exports:check` → exit 0
- Pre-commit: staging only `.llm/exports` without `ALLOW_DERIVED_EXPORT_EDIT=1` and without `.cursor` blocks with message

## Follow-ups (not in v1)

- Committed per-file hash state for incremental export (see plan iteration)
- Additional adapters beyond `github-copilot` when a second target is allowlisted
