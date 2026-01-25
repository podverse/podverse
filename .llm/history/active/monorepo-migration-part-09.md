# Feature: Monorepo Migration

## Metadata
- Started: 2026-01-23
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor (Claude)
- GitHub Issue: None

## Context
Migrating 13 repositories into a unified monorepo for LLM-driven development and simplified open source contribution.

## Sessions

### Session 81 - 2026-01-24
#### Prompt (Developer)
begin to plan @podverse/.cursor/plans/active/monorepo-migration/08-versioning-publishing.md if it should be split into smaller more manageable plans, do so. remember to update history

#### Key Decisions
- Split Phase 8 into two focused sub-plans for better manageability
- CI workflow already exists (no work needed there)
- Packages need `publishConfig: { access: "public" }` added

#### Analysis
- Original plan is 363 lines, slightly over 300-line guideline
- CI workflow already complete at `.github/workflows/ci.yml`
- All 5 Dockerfiles exist and are ready for builds
- All 6 packages missing `publishConfig` for public scoped publishing

#### Files Created
- .cursor/plans/active/monorepo-migration/08a-package-config-version-bump.md (1-2 hrs)
  - Add publishConfig to all 6 packages
  - Create bump-version.sh script
- .cursor/plans/active/monorepo-migration/08b-publish-alpha-workflow.md (4-6 hrs)
  - Create publish-alpha.yml with npm + Docker publishing
  - Document secrets

#### Files Modified
- .cursor/plans/active/monorepo-migration/08-versioning-publishing.md (updated status, added sub-plan references)

---

### Session 82 - 2026-01-24
#### Prompt (Developer)
execute the first one

#### Work
Implemented Phase 8A: Package Config and Version Bump Script

#### Files Modified
- packages/helpers/package.json (added publishConfig)
- packages/external-services/package.json (added publishConfig)
- packages/orm/package.json (added publishConfig)
- packages/notifications/package.json (added publishConfig)
- packages/parser/package.json (added publishConfig)
- packages/mq/package.json (added publishConfig)

#### Files Created
- scripts/publish/bump-version.sh (version bump script with validation)

#### Verification
- npm pack --dry-run succeeds for @podverse/helpers and @podverse/mq
- Script is executable (chmod +x applied)

#### Result
Phase 8A complete - all packages configured for public npm publishing

---

### Session 83 - 2026-01-24
#### Prompt (Developer)
execute the next one

#### Work
Implemented Phase 8B: Publish Alpha Workflow

#### Files Created
- .github/workflows/publish-alpha.yml
  - Validate job: lint, type-check, build:packages, build:apps
  - Publish-packages job: Sequential npm publish for 6 packages in dependency order
    - helpers → external-services → orm → notifications → parser → mq
  - Publish-docker job: Parallel Docker builds for 5 apps using matrix strategy
    - api, web, workers, management-api, management-web
  - Alpha version auto-increment logic (X.Y.Z-alpha.N)
  - Docker Buildx with GitHub Actions caching
  - Tags both versioned and :alpha for Docker images

#### Notes
- SECRETS.md already had NPM_TOKEN documentation from Phase 5A
- Workflow uses GITHUB_TOKEN (automatic) for GHCR push
- Docker images tagged with both specific version and :alpha tag

#### Result
Phase 8B complete - publish-alpha.yml workflow created

---

### Session 84 - 2026-01-24
#### Prompt (Developer)
update them all to use the same unified version. we can drop the .6 and .7 etc handling at the end of the deployment, and rely on the earlier semver version numbers going forward

#### Key Decisions
- Simplified versioning: all packages use same unified version (X.Y.Z-alpha)
- Dropped per-package alpha.N incrementing
- Version calculated ONCE from root package.json, used for all 6 packages and 5 Docker images
- Future releases will bump semver version (5.2.0 → 5.2.1) rather than alpha.N

#### Files Modified
- .github/workflows/publish-alpha.yml (simplified version calculation, unified versioning)

---

### Session 85 - 2026-01-24
#### Prompt (Developer)
begin to plan work for @podverse/.cursor/plans/active/monorepo-migration/09-database-migrations.md if it should be split into smaller more manageable plans then do so. remember to update history.

#### Response
Analyzed Phase 9 plan. Database files already migrated to `infra/database/`. Only remaining work: create unified scripts and Jenkins pipeline. Plan is small enough (~3 files) that splitting is unnecessary.

---

### Session 86 - 2026-01-24
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Work
Completed Phase 9: Database Migrations - created migration scripts and Jenkins pipeline.

#### Files Created
- scripts/database/combine-migrations.sh (unified script for both main and management databases)
- scripts/database/apply-migration.sh (local migration tool with dry-run support)
- pipelines/jenkins/database/apply-migration.jenkinsfile (production migration pipeline)

#### Features
- combine-migrations.sh: Combines all migrations for both databases, adds timestamps and "DO NOT EDIT" headers
- apply-migration.sh: Supports --database (main/management), --dry-run, --help; validates migration exists
- Jenkins pipeline: Environment selection (alpha/beta/prod), database selection, dry-run default enabled, credential management

#### Result
All Phase 9 scripts and pipeline created and verified working.

---

### Session 87 - 2026-01-24
#### Prompt (Developer)
plan the @podverse/.cursor/plans/active/monorepo-migration/10-ide-configuration.md work. if it should be broken into smaller plans, do so. remember to update history.

#### Key Decisions
- Split Phase 10 into two sub-plans for manageability
- `.vscode/terminals-rundev.json.example` already exists from Phase 6
- Sub-plans can run in parallel (no dependencies)

#### Analysis
- Original plan: 399 lines, 9 files to create
- Already exists: `.vscode/terminals-rundev.json.example`
- Remaining: 8 files split across two focused sub-plans

#### Files Created
- .cursor/plans/active/monorepo-migration/10a-vscode-core.md (VS Code settings, extensions, launch, tasks, workspace)
- .cursor/plans/active/monorepo-migration/10b-terminals-docs.md (terminal configs, IDE documentation)

#### Files Modified
- .cursor/plans/active/monorepo-migration/10-ide-configuration.md (updated status, added sub-plan references)

---

### Session 88 - 2026-01-24
#### Prompt (Developer)
begin working on the first plan

#### Work
Implemented Phase 10A: VS Code Core Configuration

#### Files Created
- .vscode/settings.json (editor, TypeScript, search, ESLint, file watcher settings)
- .vscode/extensions.json (13 recommended extensions: Terminals, ESLint, Prettier, TypeScript, GitLens, etc.)
- .vscode/launch.json (3 debug configurations: API, Current File, Jest)
- .vscode/tasks.json (7 tasks: Build All, Build Packages, Lint, Type Check, Start DB/MQ/All)
- podverse.code-workspace (multi-root workspace with root, helpers, orm, api, web)

#### Verification
- All 5 JSON files validated successfully

#### Files Moved
- .cursor/plans/active/monorepo-migration/10a-vscode-core.md → completed/monorepo-migration/10-ide-configuration/

---

### Session 89 - 2026-01-24
#### Prompt (Developer)
begin working on the next plan

#### Work
Implemented Phase 10B: Terminal Configs & Documentation

#### Files Created
- .vscode/terminals.json.example (basic 3-terminal config: Root, Git, Docker)
- .vscode/terminals-services.json.example (infrastructure services: Database, Message Queue, Key-Value DB)
- docs/IDE-SETUP.md (comprehensive IDE setup guide with VS Code, Terminals Manager, debugging, troubleshooting)

#### Verification
- All JSON files validated successfully

#### Files Moved
- .cursor/plans/active/monorepo-migration/10b-terminals-docs.md → completed/monorepo-migration/10-ide-configuration/

#### Result
Phase 10 (IDE Configuration) fully complete - all sub-plans finished.

---

### Session 90 - 2026-01-24
#### Prompt (Developer)
plan the @podverse/.cursor/plans/active/monorepo-migration/11-git-workflow.md work. if it should be broken into smaller plans, do so. remember to update history.

#### Response
Analyzed Phase 11 plan and found ~75% already complete from earlier phases:
- Git hooks (pre-commit, commit-msg, pre-push) already in scripts/git-hooks/
- CI workflow already at .github/workflows/ci.yml
- publish-alpha.yml already configured

Remaining work identified as small enough (~5 files) not requiring sub-plans:
- PR template
- Issue templates (bug_report, feature_request)
- CODEOWNERS file
- Branch protection documentation

---

