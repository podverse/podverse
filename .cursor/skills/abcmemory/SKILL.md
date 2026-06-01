---
name: abcmemory
description: User vocabulary abcmemory and abcremember — where Cursor guidance lives and how to persist new instructions. Use when the user says abcmemory or abcremember.
---

# abcmemory / abcremember

## One rule (Cursor-only)

**abcmemory is only under `.cursor/`** (plus `.cursorrules` and `.cursorignore`). That is where Cursor loads standing agent guidance.

**`.llm/` is a planning workspace** (plans, optional history, human templates, reference context). It is **not** abcmemory. Skills under `.cursor/` may *reference* `.llm/plans/` for workflow, but **abcremember** writes to `.cursor/` unless you explicitly ask to store something under `.llm/`.

## When to use

- User says **abcmemory** — they mean the repo's Cursor guidance files (skills, rules, prompts, hooks, etc.).
- User says **abcremember** — save what they told you into abcmemory and apply it going forward.

## Where abcmemory lives

Committed guidance for this repo lives only in:

- `.cursor/skills/**` — one `SKILL.md` per directory
- `.cursor/rules/**` — Cursor rules (`.mdc`)
- `.cursor/prompts/**` — reusable agent-facing prompt snippets
- `.cursor/hooks/**` and `.cursor/hooks.json` — optional Cursor project hooks (when used)
- `.cursorrules` — root-level rules
- `.cursorignore` — path-level ignores for Cursor

**Not abcmemory:** `.llm/plans/`, `.llm/history/`, `.llm/templates/`, and `.llm/context/` are operator workflow and reference material. See [.llm/LLM.md](../../../.llm/LLM.md).

Do not duplicate the same guidance under `.github/`, docs, or `.llm/history/` unless the user explicitly asks.

Contributor policy: [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](../../../docs/development/llm/DOCS-DEVELOPMENT-LLM.md). See also **llm-cursor-source**.

## Prompts vs `.llm/templates/`

- **`.cursor/prompts/`** — abcmemory; standing or reusable agent prompt snippets (kebab-case `.md` files).
- **`.llm/templates/`** — human copy-paste templates for plans and optional history notes; not agent instruction source.

## How to abcremember (placement guide)

| Kind of instruction | Prefer |
| --- | --- |
| Always-on repo convention | `.cursorrules` or new/updated always-applied `.cursor/rules/*.mdc` |
| Applies to specific paths/file types | Scoped `.cursor/rules/*.mdc` with `globs` |
| Domain/task workflow (API, E2E, K8s, etc.) | New or extended `.cursor/skills/<topic>/SKILL.md` |
| Reusable prompt block for agents | `.cursor/prompts/<topic>.md` |
| Cursor event automation (shell gates, etc.) | `.cursor/hooks.json` + `.cursor/hooks/*` |
| Path ignores for Cursor indexing | `.cursorignore` |
| Feature plan, session log, or one-off note | `.llm/plans/` or `.llm/history/` — **not** abcremember unless you also want standing policy in `.cursor/` |

## Rules when abremembering

- One source of truth — do not duplicate the same guidance elsewhere unless the user explicitly asks.
- Match existing repo style (frontmatter, skill `name` = folder name, blank line after closing `---`).
- Keep changes minimal and focused on what the user asked to remember.
- After editing abcmemory, tell the user which files were updated so they can commit them.
