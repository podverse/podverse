# Standardize Import Order via ESLint

## Overview

Import order can be standardized across the Podverse monorepo with ESLint. The repo already documents the desired order (Node built-ins, external, workspace, relative, styles last) but does not enforce it. Adding an ESLint plugin with an import-order rule and enabling autofix will enforce and normalize order everywhere the single root config applies.

## Current state

- **No import-order rule today.** [eslint.config.mjs](../../eslint.config.mjs) has no plugin or rule for import order; it only has `@typescript-eslint/consistent-type-imports`.
- **Convention is documented** in [.llm/context/conventions.md](../../.llm/context/conventions.md) (Import Order): 1) Node built-ins, 2) External packages, 3) Workspace `@podverse/*`, 4) Relative imports, with blank lines between groups.
- **Styles last** is required by [.cursor/skills/styles-import-last/SKILL.md](../../.cursor/skills/styles-import-last/SKILL.md) for components/pages.

## Plugin options

- **Option A – eslint-plugin-import + import/order:** pathGroups for `@podverse/*`, `newlines-between`, alphabetize. Tune `pathGroupsExcludedImportTypes` for monorepo.
- **Option B – eslint-plugin-simple-import-sort:** Regex-based groups, strong autofix. Final group e.g. `^.+\\.s?css$` for styles last. **Recommended** for simplicity.

## Implementation steps

1. Add the chosen plugin to root [package.json](../../package.json) devDependencies.
2. Configure in [eslint.config.mjs](../../eslint.config.mjs): register plugin and import-order rule; set groups (Node → external → @podverse → relative → styles last); keep `eslint-config-prettier` last.
3. Exception: [apps/management-web/src/app/layout.tsx](../../apps/management-web/src/app/layout.tsx) (“root styles must be imported first”) — add an override to disable the import-order rule for that file (or path pattern).
4. One-time bulk fix: run `npm run lint:fix` from root; commit on branch `chore/import-order`.
5. Docs: note in [.llm/context/conventions.md](../../.llm/context/conventions.md) (or AGENTS.md) that import order is enforced by ESLint and fixable with `npm run lint:fix`.
6. Optional: add `eslint --fix` to lint-staged for `*.{ts,tsx,js,mjs,cjs}` (after Prettier or in a defined order).

---

## Update Cursor skills and rules

Align skills and rules with the new ESLint import-order rule so they reference enforcement and stay consistent.

### 1. Skill: styles-import-last

**File:** [.cursor/skills/styles-import-last/SKILL.md](../../.cursor/skills/styles-import-last/SKILL.md)

- Add a short note that **ESLint enforces** styles-last (and overall import order) and that `npm run lint:fix` will fix order.
- Keep the existing instructions and example so the skill still reminds to put styles last when editing; frame it as “ESLint enforces this; run `npm run lint:fix` to fix.”

### 2. Skill: global (Module format and imports)

**File:** [.cursor/skills/global/SKILL.md](../../.cursor/skills/global/SKILL.md)

- In the “Module format and imports” section, add one bullet: **Import order** (Node built-ins → external → workspace → relative → styles last) is enforced by ESLint; fix with `npm run lint:fix`.

### 3. Rule: type-imports-separate-line

**File:** [.cursor/rules/type-imports-separate-line.mdc](../../.cursor/rules/type-imports-separate-line.mdc)

- In the Enforcement section, add one line: Import **order** (groups and styles last) is also enforced by ESLint and fixed by the same `npm run lint:fix` command.

### 4. No changes needed

- **.cursor/rules/avoid-type-assertions.mdc** – “Import aliases” is about `as` vs import syntax; no order change.
- **.cursor/skills/api/SKILL.md**, **web**, **time-format-local**, etc. – example code only; no need to change unless examples are updated to match the new order (lint:fix will handle real files).
- **.cursor/rules/config-type-safety.mdc** – import examples are illustrative; optional to leave as-is.

### Summary table

| Item | Action |
|------|--------|
| styles-import-last/SKILL.md | Add “ESLint enforces; run lint:fix” and keep instructions/example |
| global/SKILL.md | Add bullet: import order enforced by ESLint, fix with lint:fix |
| type-imports-separate-line.mdc | Add line: import order also enforced and fixed by lint:fix |
| conventions.md (or AGENTS.md) | Already in main steps; mention ESLint enforcement |

All updates are additive (reference ESLint and lint:fix); no removal of existing guidance.
