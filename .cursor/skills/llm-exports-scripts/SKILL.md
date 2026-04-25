---
name: llm-exports-scripts
description: Conventions for scripts/llm (deterministic .cursor exports). Use when editing export-from-cursor, copilot-adapter, vendor-*, allowed-targets, or guard-exports.
---

# LLM export scripts (`scripts/llm/**`)

## When to use

Use this skill whenever you add or change files under `scripts/llm/` (import/export pipeline, GitHub Copilot adapter, local vendor config/CLI, export guard, allowlists).

**Policy and source of truth** live in the **llm-cursor-source** skill. **Podverse and Metaboost** share the same pipeline shape; keep the mirrored scripts aligned when behavior should match.

The **`llm-exports-sync`** GitHub Action runs `node scripts/llm/export-from-cursor.mjs sync` (no root `npm install`); that matches `npm run llm:exports:sync` from a full clone.

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
