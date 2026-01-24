# Plan 1d: Cursor Configuration

## Overview

Set up `.cursorrules` and `.cursor/` rules and skills.

**Estimated time**: 25-35 minutes

**Depends on**: Plan 1a (directory structure)

---

## Step 1: Create `.cursorrules`

```markdown
# Podverse Monorepo Rules

## Stack
- Node.js 22, TypeScript strict, npm workspaces

## Architecture
See `.llm/context/architecture.md`. Lower tiers cannot depend on higher.

## Code Quality
- No `any` types
- DTOs from `@podverse/helpers`
- Follow `tsconfig.base.json`

---

## LLM WORKFLOW

### Context Gathering
For substantial requests, ask first:
- "What's the goal?"
- "GitHub issue?"

### Issue Linking
Ask once at start: "Related GitHub issue?"

### Scope Management
Warn if drifting: "This seems outside scope. Continue?"

---

## HISTORY TRACKING

Before work: Check/create `.llm/history/active/[feature].md`

After changes, update with:
- Session date, prompt summary, decisions, files

End with: **LLM History**: Updated `.llm/history/active/[feature].md`

---

## PLAN MANAGEMENT

**Plans must be under 300 lines.**

If over 300: STOP, split into sub-plans, save, then work sequentially.
```

---

## Step 2: Create `.cursor/rules/llm-history-tracking.mdc`

```markdown
---
description: LLM history tracking for code changes
globs:
  - "packages/**/*.ts"
  - "apps/**/*.ts"
  - "apps/**/*.tsx"
  - "tools/**/*.ts"
alwaysApply: false
---

# History Tracking

When modifying code, update `.llm/history/active/[feature].md`:

```markdown
### Session N - YYYY-MM-DD
#### Prompt
[Description]
#### Files Changed
- path/to/file.ts
```

End response with history confirmation.
```

---

## Step 3: Create `.cursor/rules/documentation-updates.mdc`

```markdown
---
description: Doc updates for config changes
globs:
  - "package.json"
  - "packages/*/package.json"
  - "tsconfig.base.json"
alwaysApply: false
---

# Documentation Updates

When changing configs:
- Update `docs/ARCHITECTURE.md` if deps changed
- Update `.llm/context/` files
```

---

## Step 4: Create `.cursor/skills/global/SKILL.md`

```markdown
---
name: podverse-global-patterns
version: 1.0.0
---

# Global Patterns

## Dependencies
Tier 1 → Tier 2 → ... → Tier 5. Only depend on lower tiers.

## Workspace Deps
```json
{ "dependencies": { "@podverse/helpers": "workspace:*" } }
```

## TypeScript Config
```json
{ "extends": "../../tsconfig.base.json" }
```

## Package Structure
```
packages/name/
├── src/index.ts
├── package.json
└── tsconfig.json
```

## Plan Management

**300 line limit.** Split large plans:
```
feature/
├── index.md
├── 01a-part1.md
└── 01b-part2.md
```

Plans organized by project:
```
.cursor/plans/
├── monorepo-migration/
├── feature-xyz/
└── README.md
```
```

---

## Checklist

- [ ] `.cursorrules`
- [ ] `.cursor/rules/llm-history-tracking.mdc`
- [ ] `.cursor/rules/documentation-updates.mdc`
- [ ] `.cursor/skills/global/SKILL.md`

---

## Next

Proceed to [01e-docs-verify.md](01e-docs-verify.md)
