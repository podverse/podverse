---
description: "AI guidance source of truth is .cursor and .cursorrules; .llm/exports is machine-only"
applyTo:
  - ".llm/exports/opencode/skills/**"
  - ".llm/exports/opencode/instructions/**"
  - ".cursorrules"
---

# LLM / Cursor source of truth

Committed **authoring** guidance for this repo lives only in:

- `.llm/exports/opencode/skills/**`
- `.llm/exports/opencode/instructions/**`
- `.cursorrules`

**Do not** hand-edit the machine-generated tree at [`.llm/exports/`](.llm/exports/) (portable per-target exports). The **llm-exports-sync** and **llm-exports-full-sync** GitHub Actions produce and publish those files via the **`llm`** / **`llm-full`** branches and their PRs into **develop** — that is the normal path. **Do not** run `npm run llm:exports:sync` (or `export-from-cursor.mjs sync`) for routine `.cursor` work; the script is gated outside CI. Pull **develop** after the automation PR merges when you need updated exports locally.

**Exception — pipeline development only:** if you are changing [scripts/llm/](scripts/llm/) export code, you may set `LLM_EXPORT_ALLOW_LOCAL=1` to run a local sync; see [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](docs/development/llm/DOCS-DEVELOPMENT-LLM.md).

If you use another LLM or editor, follow [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](docs/development/llm/DOCS-DEVELOPMENT-LLM.md) and, if needed, [docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md](docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md).

When you change `.cursor` or `.cursorrules`, commit and push only those **source** files. Let automation refresh `.llm/exports` on the `llm` branch; do not mirror that with a local run unless you are editing the export pipeline.
