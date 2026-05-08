# `.llm/` directory

This folder holds plans, optional development notes, and shared context for the Podverse monorepo.

## Layout

```
.llm/
├── LLM.md                 # This file
├── context/               # Codebase summaries for contributors (e.g. architecture)
├── history/
│   ├── active/            # Optional per-feature folders if your team records notes here
│   └── completed/         # Archived by automation or manually (see below)
├── plans/
│   ├── active/
│   └── completed/
└── templates/             # Prompt templates (optional)
```

## Plans

Active work lives under `.llm/plans/active/`; completed sets move to `.llm/plans/completed/`. See `.cursor/skills/plan-completion/SKILL.md` and repo rules for the 300-line plan limit.

## Optional history notes

Some teams keep markdown notes under `.llm/history/active/<feature>/`. That is **optional** and not required for contributing.

A retired description of an older session-logging workflow (for humans only) lives in
`docs/development/llm/LLM-HISTORY-WORKFLOW-ARCHIVE.md`. That path is listed in `.cursorignore`
so Cursor does not treat it as agent instructions.

### Completing features (GitHub Actions)

When a PR merges to `develop`, `.github/workflows/complete-feature.yml` may detect a matching
folder under `.llm/history/active/<feature-name>/` (derived from the branch name), set completion
metadata, move it under `.llm/history/completed/YYYY-MM/`, and push. If no folder exists, the job
no-ops.

## Machine-generated exports

Portable AI-editor bundles under `.llm/exports/` are produced by CI from `.cursor/` (see
`llm-cursor-source` skill). Do not hand-edit those exports.
