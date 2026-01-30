# Feature: Monorepo Migration

## Metadata

- Started: 2026-01-23
- Completed: 2026-01-25
- Author: Mitch Downey
- LLM(s): Cursor (Claude)
- GitHub Issue: None

## Context

Migrating 13 repositories into a unified monorepo for LLM-driven development and simplified open source contribution.

## Sessions

### Session 71 - 2026-01-24

#### Prompt (Developer)

execute @podverse/.cursor/plans/active/monorepo-migration/05b-documentation.md

#### Work

Implemented Phase 5B: Documentation Finalization.

#### Files Modified

- README.md (23 → 98 lines): Added Features section, expanded directory structure with descriptions, Development section with prerequisites/setup/environment, Docker development, Deployment overview
- docs/ARCHITECTURE.md (24 → 155 lines): Added mermaid system overview diagram, data flow sequence diagram for feed parsing, user authentication overview, expanded directory structure, database section (technology, key entities, caching), external service integrations (Podcast Index, Firebase, PayPal, Matomo), message queue architecture
- docs/CONTRIBUTING.md (42 → 84 lines): Added Testing section with current state, Code Review Guidelines (authors/reviewers), PR Checklist, Release/Deployment Process overview
- .llm/context/architecture.md (22 → 91 lines): Added detailed app descriptions (api, web, workers, management-api, management-web), common code patterns (Service, DTO, Entity, Logger), "Where to Find X" quick reference table, troubleshooting tips
- .llm/context/conventions.md (20 → 97 lines): Added import order conventions with example, error handling patterns for API/services, logging conventions with guidelines, environment variable patterns

#### Plan Updated

- .cursor/plans/active/monorepo-migration/05b-documentation.md: Status → Completed, all checklist items marked done

---

### Session 72 - 2026-01-24

#### Prompt (Developer)

if parts of the 05 monorepo plans are complete, then mark them as complete. if parts should only be completed after the full monorepo migration is finished, then apply a new number so the plan happens after all of that work is finished.

#### Key Decisions

- Phase 5A (GitHub Actions) and 5B (Documentation) are complete → moved to completed/
- Phase 5C (Archive Repos) should happen after ALL migration work + successful deployments → renumbered to 97

#### Files Moved

- .cursor/plans/active/monorepo-migration/05a-github-actions.md → completed/monorepo-migration/05-cicd-docs/
- .cursor/plans/active/monorepo-migration/05b-documentation.md → completed/monorepo-migration/05-cicd-docs/
- .cursor/plans/active/monorepo-migration/05c-archive-repos.md → renamed to 97-archive-repos.md

#### Files Modified

- .cursor/plans/active/monorepo-migration/05-cicd-docs-outline.md (updated status to Completed, noted archive moved to 97)
- .cursor/plans/active/monorepo-migration/97-archive-repos.md (renamed from 05c, updated header to Phase 97)

---

### Session 73 - 2026-01-24

#### Prompt (Developer)

put a plan together to run plan @podverse/.cursor/plans/active/monorepo-migration/06-local-dev-workflow.md. split into shorter plans that can be run in parallel if you recommend it. remember to update history.

#### Response

Created implementation plan for Phase 6. Determined the work is simple enough (2 files to create) that splitting is unnecessary.

---

### Session 74 - 2026-01-24

#### Prompt (Agent)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Work

Implemented Phase 6: Local Development Workflow

#### Files Created

- scripts/dev/setup.sh - Development setup script (nvm, clean, npm install, build:packages)
- .vscode/terminals-rundev.json.example - Terminals Manager configuration adapted for monorepo

#### Files Modified

- tools/qa/package.json - Fixed workspace:_ → _ syntax (pnpm → npm workspaces)

#### Verification

- setup.sh runs correctly: sources nvm, switches to Node 22, cleans all workspaces, runs npm install
- npm install completes successfully (1152 packages)
- build:packages starts correctly (existing ESLint environment issue unrelated to this plan)

---

### Session 75 - 2026-01-24

#### Prompt (Developer)

begin to plan for @podverse/.cursor/plans/active/monorepo-migration/06-local-dev-workflow.md. if it should be broken into smaller plans, do so.

#### Response

Analyzed Phase 6 plan and found it ~85% complete. Main files (setup.sh, terminals-rundev.json.example, package.json scripts, package scripts) already existed. Only remaining work: add local\_\* Makefile targets and move plan to completed.

---

### Session 76 - 2026-01-24

#### Prompt (Agent)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Work

Completed Phase 6 remaining work:

- Added local\_\* Makefile targets (local_db_up/down, local_mq_up/down, local_keyvaldb_up/down, local_management_db_up/down/init, local_network_create/remove, local_all_down)
- Added auto-copy rules for local env files (db.env, mq.env, keyvaldb.env, api.env, workers.env, management-db.env, management-api.env)
- Moved 06-local-dev-workflow.md from active/ to completed/

#### Files Modified

- Makefile (added ~130 lines of local environment targets)

#### Files Moved

- .cursor/plans/active/monorepo-migration/06-local-dev-workflow.md → completed/monorepo-migration/

---

### Session 77 - 2026-01-24

#### Prompt (Developer)

for clarity, i think the Makefile should be split into Makefile and Makefile.local and Makefile.alpha

#### Work

Split monolithic Makefile into three files for clarity:

#### Files Created

- Makefile.local (126 lines) - All local\_\* environment targets
- Makefile.alpha (218 lines) - All alpha\_\* environment targets

#### Files Modified

- Makefile (reduced to 29 lines) - Shell detection, common targets, includes for .local and .alpha

---

### Session 78 - 2026-01-24

#### Prompt (Developer)

it looks like you have @podverse/.cursor/plans/active/monorepo-migration/06-local-dev-workflow.md @podverse/.cursor/plans/completed/monorepo-migration/06-local-dev-workflow.md but there should only be one unless active is incomplete

#### Work

Removed duplicate plan file from active/ (completed copy already exists in completed/)

#### Files Deleted

- .cursor/plans/active/monorepo-migration/06-local-dev-workflow.md

---

### Session 79 - 2026-01-24

#### Prompt (Developer)

begin to plan @podverse/.cursor/plans/active/monorepo-migration/07-environment-variables.md if it should be split into smaller more manageable plans, do so. note you may need special access to confirm the .env are correct in case cursor blocks it. remember to update history

#### Response

Analyzed Phase 7 plan and found most work already complete:

- App validation files exist for all 5 apps (api, web, workers, management-api, management-web)
- Shared validation utilities in @podverse/helpers
- ENV.md documentation complete for all apps
- Infrastructure env templates (stubs) in infra/config/env-templates/

Only remaining work: Migrate Docker service env files from podverse-ops/config/ to infra/config/local/

---

### Session 80 - 2026-01-24

#### Prompt (Agent)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Work

Migrated Docker service environment files from podverse-ops to monorepo.

#### Files Created

- infra/config/local/db.env (from podverse-ops/config/podverse-local-db.env)
- infra/config/local/mq.env (from podverse-ops/config/podverse-local-mq.env)
- infra/config/local/keyvaldb.env (from podverse-ops/config/podverse-local-keyvaldb.env)
- infra/config/local/management-db.env (from podverse-ops/config/podverse-local-management-db.env)

#### Verification

- All 4 docker-compose files validate successfully with `docker compose config`
- Files correctly referenced by docker-compose files at ../../../config/local/{service}.env
- infra/config/local/ already gitignored (confirmed in .gitignore line 21)

#### Result

Phase 7 complete - all Docker service env files migrated to monorepo

---
