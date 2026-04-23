# Cursor/Copilot Customization Sync

This repo treats Cursor customization files as the source of truth and keeps VS Code Copilot customization files in sync.

## Source of truth

- `.cursor/skills/**`
- `.cursor/rules/**`
- `.cursorrules`

## Synced mirror targets

- `.github/skills/**`
- `.github/instructions/**`
- `.github/copilot-instructions.md`

## Commands

Run from the repository root:

```bash
npm run llm:sync:cursor-copilot
npm run llm:sync:cursor-copilot:check
```

## Script locations

- `scripts/development/llm/cursor-to-copilot-sync.mjs`
- `scripts/development/llm/cursor-to-copilot-rewrite-refs.mjs`
- `scripts/development/llm/cursor-to-copilot-validate.mjs`

## Expected workflow

1. Edit Cursor source files first.
2. Run `npm run llm:sync:cursor-copilot`.
3. Run `npm run llm:sync:cursor-copilot:check`.
4. Commit source + mirror updates in the same change.

## Notes

- Rule frontmatter is transformed from Cursor format (`globs`, `alwaysApply`) to Copilot format (`applyTo`).
- Skill frontmatter is normalized so skill `name` matches its folder.
- Validation reports informational `.cursor` references in `.github` docs; these are expected when documenting source-of-truth policy.
