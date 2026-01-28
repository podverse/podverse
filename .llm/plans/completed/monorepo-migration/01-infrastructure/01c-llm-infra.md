# Plan 1c: LLM Infrastructure

## Overview

Set up the `.llm/` directory with templates and context documents.

**Estimated time**: 20-30 minutes

**Depends on**: Plan 1a (directory structure)

---

## Step 1: Create `.llm/README.md`

```markdown
# LLM Development History

## Structure

- `history/active/` - Features in progress
- `history/completed/YYYY-MM/` - Archived by completion month
- `context/` - Codebase summaries for LLM context
- `templates/` - Templates for new entries

## Usage

1. Create file in `history/active/` for new features
2. Use template from `templates/prompt-template.md`
3. Document sessions as you work
4. Move to `completed/` when done
```

---

## Step 2: Create `.llm/templates/prompt-template.md`

```markdown
# Feature: [Name]

## Metadata

- Started: YYYY-MM-DD
- Completed: In Progress
- Author: [Name]
- LLM(s): Cursor, Claude, etc.
- GitHub Issue: #123 or None

## Context

[What problem? What goal?]

## Sessions

### Session 1 - YYYY-MM-DD

#### Prompt

[Prompt text]

#### Key Decisions

- [Decision]

#### Files Changed

- path/to/file.ts

---

## Outcome

- [What was done]
- [Lessons learned]
```

---

## Step 3: Create `.llm/context/architecture.md`

```markdown
# Podverse Architecture

## Module Dependency Order

| Tier | Packages                         | Depends On                              |
| ---- | -------------------------------- | --------------------------------------- |
| 1    | helpers                          | (none)                                  |
| 2    | external-services, orm           | helpers                                 |
| 3    | notifications, parser            | helpers, external-services, orm         |
| 4    | mq                               | helpers, external-services, orm, parser |
| 5    | api, web, workers, management-\* | various                                 |
| 6    | qa                               | helpers, external-services, orm, parser |

## Directory Structure

- `packages/` - Publishable npm packages
- `apps/` - Deployable applications
- `tools/` - Development tools
- `infra/` - Docker, database, configs

## Technologies

- Node.js 22, TypeScript (strict), npm workspaces
- Next.js 15, Express 5, PostgreSQL, TypeORM
```

---

## Step 4: Create `.llm/context/conventions.md`

```markdown
# Podverse Conventions

## TypeScript

- Strict mode, no `any` types
- DTOs from `@podverse/helpers`

## Naming

- Files: kebab-case
- Classes: PascalCase
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

## Style

- No semicolons, single quotes
- Trailing commas, 2-space indent

## Git

- Present tense commits
- Include issue refs (#123)
- Branches: feature/, fix/, chore/
```

---

## Step 5: Create `.llm/history/active/monorepo-migration.md`

```markdown
# Feature: Monorepo Migration

## Metadata

- Started: 2026-01-23
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor (Claude)
- GitHub Issue: None

## Context

Migrating 13 repos into unified monorepo for LLM-driven development.

## Sessions

### Session 1 - 2026-01-23

#### Prompt

Plan monorepo migration with npm workspaces, LLM history tracking,
smart context gathering, pre-commit hooks.

#### Key Decisions

- npm workspaces (no Nx initially)
- Feature-based LLM history
- Split podverse-ops into infra/, scripts/, pipelines/
- Plans under 300 lines, split if larger

#### Files Created

- .cursor/plans/monorepo-migration/

---

## Outcome

[To be filled]
```

---

## Checklist

- [ ] `.llm/README.md`
- [ ] `.llm/templates/prompt-template.md`
- [ ] `.llm/context/architecture.md`
- [ ] `.llm/context/conventions.md`
- [ ] `.llm/history/active/monorepo-migration.md`

---

## Next

Proceed to [01d-cursor-config.md](01d-cursor-config.md)
