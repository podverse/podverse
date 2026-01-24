# Development Plans

Plans for significant development work, organized by project.

## Current Projects

### [monorepo-migration/](monorepo-migration/)

Migration of 13 repos into unified monorepo.

- [00-master-plan.md](monorepo-migration/00-master-plan.md) - Overview and phase tracking
- [01-infrastructure/](monorepo-migration/01-infrastructure/) - Phase 1 (5 sub-plans)
- Phases 2-5: Core migration outlines
- Phases 6-13: Workflow, tooling, and configuration (detailed)
- [99-future-work.md](monorepo-migration/99-future-work.md) - Backlog and deferred items

## Directory Structure

```
.cursor/plans/
├── README.md
└── monorepo-migration/
    ├── 00-master-plan.md
    ├── 01-infrastructure/
    │   ├── index.md
    │   ├── 01a-configs.md
    │   ├── 01b-git-hooks.md
    │   ├── 01c-llm-infra.md
    │   ├── 01d-cursor-config.md
    │   └── 01e-docs-verify.md
    ├── 02-packages-outline.md
    ├── 03-apps-outline.md
    ├── 04-infra-tooling-outline.md
    ├── 05-cicd-docs-outline.md
    ├── 06-local-dev-workflow.md
    ├── 07-environment-variables.md
    ├── 08-versioning-publishing.md
    ├── 09-database-migrations.md
    ├── 10-ide-configuration.md
    ├── 11-git-workflow.md
    ├── 12-dependency-management.md
    ├── 13-skills-migration.md
    ├── 98-file-naming-audit.md
    └── 99-future-work.md
```

## Guidelines

### Plan Size

**Aim for plans under 300 lines.** This is a guideline, not a hard rule. Use judgment:
- Simple, sequential steps can go longer
- Complex, interdependent steps should be split
- If a plan feels overwhelming to follow, split it

### Naming

- `00-` master plans
- `01-`, `02-` phases  
- `01a-`, `01b-` sub-plans
- `-outline` for future detail
- `99-` backlog/reference documents

### LLM Behavior

If plan exceeds 300 lines:
1. STOP - don't implement
2. Split into sub-plans
3. Save all files
4. Ask which to start
5. Work one at a time
