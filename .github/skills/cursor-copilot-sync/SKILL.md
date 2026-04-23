---
name: cursor-copilot-sync
description: Keep Cursor skills/rules as source of truth while maintaining synced VS Code Copilot mirrors in .github. Use when adding, editing, or deleting customization files.
---

# Cursor to Copilot Sync

Use this workflow whenever customization files are changed.

## Source of Truth

- `.cursor/skills/**`
- `.cursor/rules/**`
- `.cursorrules`

## Mirrored Targets

- `.github/skills/**`
- `.github/instructions/**`
- `.github/copilot-instructions.md`

## Procedure

1. Edit Cursor source files first.
2. Run sync:
   - `npm run llm:sync:cursor-copilot`
3. Run validation:
   - `npm run llm:sync:cursor-copilot:check`
4. Confirm both source and mirror files changed together.

## Stop and Fix Rule

- If only one side changed (Cursor or `.github` mirror), stop and add the missing counterpart changes.
- If a counterpart file is missing, create it in the same change.
- If validation fails, do not proceed with implementation summaries until the sync check is green.

## Tooling

- Sync script: `scripts/development/llm/cursor-to-copilot-sync.mjs`
- Reference rewrite: `scripts/development/llm/cursor-to-copilot-rewrite-refs.mjs`
- Validation: `scripts/development/llm/cursor-to-copilot-validate.mjs`

## Notes

- Rules are transformed from Cursor frontmatter (`globs`, `alwaysApply`) to Copilot frontmatter (`applyTo`).
- Skill frontmatter is normalized so `name` matches the skill folder name.
- Validation enforces source/mirror parity for skills, rules, and `.cursorrules`/`copilot-instructions`.
