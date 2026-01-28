# Plan 1e: Documentation and Verification

## Overview

Create documentation and verify the setup.

**Estimated time**: 20-30 minutes

**Depends on**: Plans 1a-1d

---

## Step 1: Create `docs/ARCHITECTURE.md`

```markdown
# Podverse Architecture

## Module Dependency Order

| Tier | Packages                         |
| ---- | -------------------------------- |
| 1    | helpers                          |
| 2    | external-services, orm           |
| 3    | notifications, parser            |
| 4    | mq                               |
| 5    | api, web, workers, management-\* |
| 6    | qa                               |

## Build Order

1. helpers → 2. external-services → 3. orm → 4. notifications
   → 5. parser → 6. mq → 7. apps (parallel) → 8. qa

## Directory Structure

- `packages/` - npm packages
- `apps/` - applications
- `tools/` - dev tools
- `infra/` - docker, database
- `scripts/` - utilities
```

---

## Step 2: Create `docs/CONTRIBUTING.md`

````markdown
# Contributing

## Setup

```bash
git clone https://github.com/podverse/podverse.git
cd podverse && nvm use && npm install
npm run build:packages
```
````

## Run Apps

```bash
npm run dev:api
npm run dev:web
```

## Workflow

1. Branch: `git checkout -b feature/name`
2. Code and lint: `npm run lint`
3. Commit with issue: `Fix bug #123`
4. Open PR

## LLM Development

- History auto-tracked in `.llm/history/`
- Provide issue links when possible

````

---

## Step 3: Create `README.md`

```markdown
# Podverse

Open source podcast app with Podcasting 2.0 support.

## Quick Start
```bash
nvm use && npm install
npm run build:packages
npm run dev:api    # localhost:3000
npm run dev:web    # localhost:3001
````

## Structure

- `packages/` - Shared packages
- `apps/` - Applications
- `docs/` - Documentation

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Contributing](docs/CONTRIBUTING.md)

## License

AGPL-3.0

````

---

## Step 4: Verification

### Check Files
```bash
cat .nvmrc                    # Should be: 22
ls package.json              # Should exist
ls .git/hooks/pre-commit     # Should exist
````

### Test Workspaces

```bash
npm install                   # Should succeed
```

### Test Hooks

```bash
# Test pre-commit
echo "x" > packages/helpers/test.ts
git add packages/helpers/test.ts
git commit -m "test"          # Should show reminder
# Abort and cleanup
```

---

## Final Checklist

### Core

- [ ] `.nvmrc`, `package.json`, `tsconfig.base.json`
- [ ] `eslint.config.mjs`, `.gitignore`

### Git Hooks

- [ ] `scripts/git-hooks/*` (3 files)
- [ ] Hooks in `.git/hooks/`

### LLM

- [ ] `.llm/README.md`, `templates/`, `context/`
- [ ] `.llm/history/active/monorepo-migration.md`

### Cursor

- [ ] `.cursorrules`
- [ ] `.cursor/rules/*` (2 files)
- [ ] `.cursor/skills/global/SKILL.md`

### Docs

- [ ] `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`
- [ ] `README.md`

---

## Phase 1 Complete!

Proceed to [Phase 2: Package Migration](../02-packages-outline.md)
