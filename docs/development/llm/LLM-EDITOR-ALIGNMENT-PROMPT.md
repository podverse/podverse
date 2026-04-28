# Alignment prompt (non-Cursor LLM / editor)

Copy everything in the fenced block below into your LLM chat **after** opening this repository in your workspace. Run it on first setup and **again** whenever `.cursor` or `.cursorrules` changes on `main` (or when you merge/pull such changes).

```text
You are helping me align my local AI/editor configuration with this repository.

## Source of truth (read-only in git)

Treat these paths as the canonical project guidance:

- `.cursor/skills/**` (each folder has `SKILL.md`)
- `.cursor/rules/**` (`.mdc` files)
- `.cursorrules` at the repository root

Do not ask to commit duplicate “mirror” trees under `.github/` for Copilot or other tools; this repo intentionally only commits `.cursor` and `.cursorrules`.

## Tasks

1. Read the skills, rules, and `.cursorrules` above. Summarize the main conventions in 5–10 bullets.
2. If my editor or LLM integration uses a **separate project directory** for rules (examples: tool-specific folders under the repo root, or generated instruction files), propose a mapping from the `.cursor` content to that format. If files already exist locally, **update them to match** the current `.cursor` content; add any **missing** files that should exist for parity.
3. Update the **root `.gitignore`** in this repository: append patterns that ignore any **new local-only** paths you create or that my tool generates so they are never committed. Use comments to group them, e.g. `# Local LLM/editor exports (see docs/development/llm/DOCS-DEVELOPMENT-LLM.md)`. If a pattern is already present, do not duplicate it.
4. Remind me to re-run this prompt after future pulls that change `.cursor` or `.cursorrules`, or when I see GitHub PRs/issues labeled `llm`.

Do not delete or modify files under `.cursor/` or `.cursorrules` unless I explicitly ask you to change project policy.
```
