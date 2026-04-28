---
name: llm-exports-scripts
description: Conventions for scripts/llm (deterministic .cursor exports). Use when editing export-from-cursor, copilot-adapter, github-style-adapter, opencode-adapter, vendor-*, allowed-targets, or guard-exports.
---


# LLM export scripts (`scripts/llm/**`)

## When to use

Use this skill whenever you add or change files under `scripts/llm/` (import/export pipeline, adapters, local vendor config/CLI, export guard, allowlists).

**Policy and source of truth** live in the **llm-cursor-source** skill. **Per-target output** (what each adapter produces) is documented in [docs/development/llm/EXPORT-TARGETS.md](../../../docs/development/llm/EXPORT-TARGETS.md). **Podverse and Metaboost** share the same pipeline shape; keep the mirrored scripts aligned when behavior should match.

Allowlisted **export target** ids: `github-copilot`, `opencode` (see `allowed-targets.mjs`); each opt-in target has a marker under `.llm/exports/<id>/`. The `github-copilot` tree is the single portable mirror (no separate `vscode` target).

**CI:** the **`llm-exports-sync`** and **`llm-exports-full-sync`** GitHub Actions run `node scripts/llm/export-from-cursor.mjs sync` (with `--full` for full) on the runner. **Local** `sync` and `check` that write to disk are **disabled** unless `CI` is set (e.g. GitHub Actions) or you set `LLM_EXPORT_ALLOW_LOCAL=1` for pipeline debugging and tests of `scripts/llm/`. Set that env when you need to run `npm run llm:exports:sync` or `llm:exports:sync:full` outside CI.

## Console and CLI output

- Do **not** use `console.log`, `console.info`, or `console.debug`.
- Use `console.warn` for non-fatal progress or informational messages, `console.error` for failures.
- For interactive CLIs, you may use a small helper that writes with `process.stdout.write` (see `vendor-selector.mjs` `out()`).

## After edits

From repo root:

```bash
npx eslint "scripts/llm/**/*.mjs"
```

In Metaboost, if import order needs fixing: `npx eslint "scripts/llm/**/*.mjs" --fix`
