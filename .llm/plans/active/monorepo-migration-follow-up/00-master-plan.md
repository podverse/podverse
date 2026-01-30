# Podverse Monorepo Migration - Master Plan

## Overview

Migration of 13 repositories into a unified monorepo for LLM-driven development and simplified open source contribution.

## Phases

| Phase                                                     | Description                                | Status  |
| --------------------------------------------------------- | ------------------------------------------ | ------- |
| [1. Infrastructure](01-infrastructure/index.md)           | Directory structure, configs, LLM tooling  | Planned |
| [2. Packages](02-packages-outline.md)                     | Migrate 6 npm packages                     | Outline |
| [3. Applications](03-apps-outline.md)                     | Migrate 5 applications                     | Outline |
| [4. Infra/Tooling](04-infra-tooling-outline.md)           | Split ops, migrate qa                      | Outline |
| [5. CI/CD & Docs](05-cicd-docs-outline.md)                | GitHub Actions, Jenkins, docs              | Outline |
| [6. Local Dev Workflow](06-local-dev-workflow.md)         | npm workspaces, setup scripts, terminals   | Planned |
| [7. Environment Variables](07-environment-variables.md)   | Env templates, validation, per-app config  | Planned |
| [8. Versioning & Publishing](08-versioning-publishing.md) | Unified version, bump scripts, GH Actions  | Planned |
| [9. Database Migrations](09-database-migrations.md)       | Jenkins-triggered, post-Beta workflow      | Planned |
| [10. IDE Configuration](10-ide-configuration.md)          | VS Code, Terminals Manager, launch configs | Planned |
| [11. Git Workflow](11-git-workflow.md)                    | Branch strategy, PR process, protection    | Planned |
| [12. Dependency Management](12-dependency-management.md)  | Renovate config, security updates          | Planned |
| [13. Skills Migration](13-skills-migration.md)            | Migrate podverse-web skills to monorepo    | Planned |

## Module Dependency Order

```
1. helpers
2. external-services
3. orm
4. notifications
5. parser
6. mq
7. apps (parallel)
8. qa
```

## Key Decisions

- **npm workspaces** (no Nx/Turborepo initially)
- **Feature-based LLM history** (not date-based)
- **Smart context gathering** by LLM
- **Encouraged issue linking** (not required)
- **Pre-commit hooks** for documentation reminders
- **Fresh git history** (not migrating old commits)
- **Renovate** for dependency updates (over Dependabot)
- **Terminals Manager** for dev workflow

## Repos Being Migrated

- podverse-ops, podverse-helpers, podverse-external-services
- podverse-notifications, podverse-orm, podverse-parser, podverse-mq
- podverse-api, podverse-web, podverse-workers
- podverse-qa, podverse-management-api, podverse-management-web

## Repos Staying Separate

- **partytime** - External fork
- **podverse-ansible** - Contains private keys

## Rollback Strategy

For each phase, if issues arise:

| Phase | Rollback Approach                                  |
| ----- | -------------------------------------------------- |
| 1-4   | Delete monorepo content, original repos unaffected |
| 5     | Keep original CI workflows until monorepo proven   |
| 6-13  | Revert commits, configuration-only changes         |

**Archive original repos only after:**

- 2+ successful alpha deployments
- All team members confirm workflow works
- No critical issues for 1+ week

## Future Work (Post-Migration)

See [99-future-work.md](99-future-work.md) for detailed backlog.

**Major items:**

1. Split helpers into focused modules (`@podverse/types`, `@podverse/core`, etc.)
2. Split external-services per integration (`@podverse/firebase`, `@podverse/paypal`)
3. Per-job env vars for workers
4. Selective CI builds (only affected packages)
5. Testing strategy (unit, integration, e2e)

**Deferred during planning:**

- Makefile commands migration
- Docker build context updates
- TypeORM migration generation workflow
- Beta/production deployment details

## Estimated Total Effort

| Phase Group                      | Hours     |
| -------------------------------- | --------- |
| Phases 1-5 (Core Migration)      | 40-60     |
| Phases 6-13 (Tooling & Workflow) | 20-30     |
| **Total**                        | **60-90** |

## Quick Links

### Core Migration

- [Infrastructure Setup](01-infrastructure/index.md)
- [Package Migration](02-packages-outline.md)
- [App Migration](03-apps-outline.md)

### Workflow & Tooling

- [Local Development](06-local-dev-workflow.md)
- [Environment Variables](07-environment-variables.md)
- [Git Workflow](11-git-workflow.md)

### CI/CD

- [Versioning & Publishing](08-versioning-publishing.md)
- [Database Migrations](09-database-migrations.md)
- [Dependency Management](12-dependency-management.md)

### Reference

- [File Naming Audit](98-file-naming-audit.md)
- [Future Work & Backlog](99-future-work.md)
