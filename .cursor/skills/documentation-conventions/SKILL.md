---
name: podverse-documentation-conventions
description: Documentation file naming conventions for the Podverse monorepo. Use when creating or modifying documentation files, README files, or any markdown documentation.
---

# Documentation Conventions

## Single-Instance Documentation Files

**Critical Rules**: These files should only exist once in the repository (at root/docs):

- **One** `README.md` at repository root
- **One** `QUICKSTART.md` in `docs/` directory

**Only one file in the entire repository may be named README** (the root `README.md`). Subdirectories must use descriptive names (e.g. `scripts/github/SCRIPTS-GITHUB.md`, not `README.md`).

### Directory-Specific Documentation

If a directory needs its own documentation file, name it after the **full path** from root:

```
✅ Correct:
apps/api/APPS-API.md
apps/web/APPS-WEB.md
tools/qa/TOOLS-QA.md
infra/docker/ci/INFRA-DOCKER-CI.md
.llm/LLM.md

❌ Incorrect:
apps/api/README.md
apps/web/README.md
tools/qa/README.md
```

### Rationale

Multiple `README.md` files:

- Create ambiguity in navigation
- Confuse search results
- Break expectations about repository entry points
- Complicate documentation tooling

### Naming Pattern

```
[FULL-PATH-WITH-HYPHENS].md
```

Convert the directory path to uppercase, replacing slashes with hyphens:

- `apps/api/` → `APPS-API.md`
- `packages/orm/` → `PACKAGES-ORM.md`
- `.llm/plans/active/` → place plan files under `active/<project>/` (see `.llm/LLM.md`)

### Examples

| Directory                        | Documentation File                 |
| -------------------------------- | ---------------------------------- |
| Root                             | `README.md` (the only one)         |
| `apps/api/`                      | `APPS-API.md`                      |
| `apps/web/`                      | `APPS-WEB.md`                      |
| `apps/workers/`                  | `APPS-WORKERS.md`                  |
| `apps/management-api/`           | `APPS-MANAGEMENT-API.md`           |
| `apps/management-web/`           | `APPS-MANAGEMENT-WEB.md`           |
| `tools/qa/`                      | `TOOLS-QA.md`                      |
| `tools/web-perf/`                | `TOOLS-WEB-PERF.md`                |
| `packages/helpers/`              | `PACKAGES-HELPERS.md`              |
| `packages/orm/`                  | `PACKAGES-ORM.md`                  |
| `infra/docker/ci/`               | `INFRA-DOCKER-CI.md`               |
| `infra/k8s/`                     | `INFRA-K8S.md`                     |
| `scripts/github/`                | `SCRIPTS-GITHUB.md`                |
| `infra/pipelines/jenkins/alpha/` | `INFRA-PIPELINES-JENKINS-ALPHA.md` |
| `.llm/`                          | `LLM.md`                           |

Per-project plans live under `.llm/plans/active/` and `.llm/plans/completed/` (see `.llm/LLM.md`). There is no single markdown file at the `.llm/plans/` root.

### Special Cases

**Plan directories** use a special convention:

```
.llm/plans/active/feature-name/
├── 00-master-plan.md         # Primary: Master overview/index
├── 00-overview.md            # Alternative: Overview/guide
├── EXECUTION.md              # Parallel execution / agent assignment guide
├── 01-part1.md               # Numbered sequential plans
├── 02-part2.md
└── specific-task.md          # Descriptive task names
```

**Plan index file naming:**

- **Primary**: `00-master-plan.md` - For comprehensive master plans
- **Alternative**: `00-overview.md` - For overviews and guides
- **Legacy**: `index.md` - Acceptable but less preferred
- **Never**: `README.md` or full-path names like `LLM-PLANS-ACTIVE-FEATURE.md`

**Plan execution guides:**

- Use `EXECUTION.md` for parallel execution guides, agent assignments, or running instructions
- **Never**: `QUICK-START.md` or `QUICKSTART.md` (reserved for root `docs/QUICKSTART.md`)

The `00-` prefix ensures index files sort first in directory listings.

### When Creating Documentation

1. **Root-level overview?** → Update `README.md`
2. **Quick start guide?** → Update `docs/QUICKSTART.md`
3. **Directory-specific docs?** → Create `[FULL-PATH].md` in that directory
4. **Specific topic docs?** → Use descriptive names (e.g., `MIGRATIONS.md`, `TESTING.md`)
5. **Plan index/overview?** → Use `00-master-plan.md` or `00-overview.md`
6. **Plan execution guide?** → Use `EXECUTION.md` (for parallel/agent instructions)
7. **Plan files?** → Must go in `.llm/plans/` (NOT `.cursor/plans/`)
8. **History files?** → Must go in `.llm/history/` (NOT `.cursor/history/`)

### Plan and History Location

**Critical**: Plans and history are **not Cursor-specific** and must never be placed in `.cursor/` directory.

```
✅ Correct:
.llm/plans/active/feature-x/
.llm/history/active/feature-y/

❌ Incorrect:
.cursor/plans/active/feature-x/
.cursor/history/active/feature-y/
```

The `.cursor/` directory is for Cursor IDE-specific configuration only (rules, skills, settings).

### Migration Note

If you encounter existing `README.md` files in subdirectories (from legacy structure), rename them following the full-path convention.
