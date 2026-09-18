# `.llm/` directory

**Planning workspace** for this repo — feature plans, human templates, and reference context.

**Not abcmemory.** Standing agent guidance (what Cursor loads every session) lives **only** under [`.cursor/`](/.cursor/skills/abcmemory/SKILL.md) plus `.cursorrules` and `.cursorignore`. When you say **abcremember**, agents write to `.cursor/`, not here, unless you explicitly ask otherwise.

## Directory index — `.llm/` (planning workspace)

| Path                 | Operator doc                                            |
| -------------------- | ------------------------------------------------------- |
| `.llm/context/`      | [LLM-CONTEXT.md](context/LLM-CONTEXT.md)                |
| `.llm/plans/active/` | [LLM-PLANS-ACTIVE.md](plans/active/LLM-PLANS-ACTIVE.md) |
| `.llm/templates/`    | [LLM-TEMPLATES.md](templates/LLM-TEMPLATES.md)          |

## Directory index — abcmemory (`.cursor/`)

| Path               | Operator doc                                            |
| ------------------ | ------------------------------------------------------- |
| `.cursor/skills/`  | [CURSOR-SKILLS.md](/.cursor/skills/CURSOR-SKILLS.md)    |
| `.cursor/rules/`   | [CURSOR-RULES.md](/.cursor/rules/CURSOR-RULES.md)       |
| `.cursor/prompts/` | [CURSOR-PROMPTS.md](/.cursor/prompts/CURSOR-PROMPTS.md) |
| `.cursor/hooks/`   | [CURSOR-HOOKS.md](/.cursor/hooks/CURSOR-HOOKS.md)       |

Vocabulary: **abcmemory** / **abcremember** — [abcmemory skill](/.cursor/skills/abcmemory/SKILL.md).

## Layout

```
.llm/
├── LLM.md                 # This file
├── context/               # Codebase summaries for contributors (e.g. architecture)
├── plans/
│   └── active/
└── templates/             # Human templates for plans (not abcmemory)
```

Empty layout directories may contain a `.gitkeep` so git tracks the folder after clone.

## abcmemory vs `.llm/` (do not merge)

| Question                        | Answer                                                  |
| ------------------------------- | ------------------------------------------------------- |
| Where is abcmemory?             | **Only** `.cursor/` + `.cursorrules` + `.cursorignore`  |
| What is `.llm/`?                | Planning workspace — not loaded as standing agent rules |
| **abcremember** default target? | `.cursor/` only                                         |
| Agent prompt snippets?          | `.cursor/prompts/` (abcmemory), not `.llm/templates/`   |
| Human copy-paste blanks?        | `.llm/templates/`                                       |
| Active feature plans?           | `.llm/plans/active/<name>/`                             |

## Plans

Active work lives under `.llm/plans/active/`. Completed plan files are removed after the operator
confirms the work is no longer needed. See `.cursor/skills/plan-completion/SKILL.md` and repo rules
for the 300-line plan limit.

**Import specifiers (Tier A vs Next `src`):** see [docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md).
