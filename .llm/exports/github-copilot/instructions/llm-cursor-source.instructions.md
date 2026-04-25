---
description: "AI guidance source of truth is .cursor and .cursorrules; no in-repo mirrors under .github"
applyTo:
  - ".llm/exports/github-copilot/skills/**"
  - ".llm/exports/github-copilot/instructions/**"
  - ".cursorrules"
---

# LLM / Cursor source of truth

Committed guidance for this repo lives only in:

- `.llm/exports/github-copilot/skills/**`
- `.llm/exports/github-copilot/instructions/**`
- `.cursorrules`

Do not add or maintain parallel copies under `.github`. **Optional** deterministic exports for other tools live in [`.llm/exports/`](.llm/exports/); they are updated with `npm run llm:exports:sync` (or CI on `develop`). Do not hand-edit that tree. If you use another LLM or editor, follow [docs/development/llm/README.md](docs/development/llm/README.md) and, if needed, [docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md](docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md).

When you change `.cursor` or `.cursorrules`, commit those source files; then run `llm:exports:sync` and commit [`.llm/exports/`](.llm/exports/) as needed, or let automation update `develop`.
