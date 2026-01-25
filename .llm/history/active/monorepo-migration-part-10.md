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

### Session 91 - 2026-01-24
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Work
Completed Phase 11: Git Workflow - GitHub Templates and Documentation

#### Files Created
- .github/PULL_REQUEST_TEMPLATE.md (PR template with description, issue link, type checkboxes, checklist)
- .github/ISSUE_TEMPLATE/bug_report.md (bug report with reproduction steps, environment)
- .github/ISSUE_TEMPLATE/feature_request.md (feature request with problem statement, proposed solution)
- .github/CODEOWNERS (default ownership to @podverse/maintainers)
- docs/BRANCH-PROTECTION.md (GitHub UI configuration instructions for develop, alpha, beta, main)

#### Result
Phase 11 (Git Workflow) complete - all GitHub templates and branch protection documentation created.

---

### Session 92 - 2026-01-24
#### Prompt (Developer)
plan the @podverse/.cursor/plans/active/monorepo-migration/12-dependency-management.md  work. if it should be broken into smaller plans, do so. remember to update history.

#### Response
Analyzed Phase 12 plan. Found scripts/audit/audit.sh already exists from Session 66. Plan does NOT need splitting - estimated ~2 hours of mostly configuration work. Remaining items:
- Create renovate.json
- Optionally create .github/dependabot.yml
- Manual: Install Renovate GitHub App
- Manual: Enable Dependabot alerts in GitHub

Recommended executing plan directly as single task.

---

### Session 93 - 2026-01-24
#### Prompt (Developer)
execute the plan

#### Work
Implemented Phase 12: Dependency Management

#### Files Created
- renovate.json (Renovate configuration with grouping, auto-merge for patches, security alerts)
- .github/dependabot.yml (Alternative to Renovate - npm, Docker, GitHub Actions updates)

#### Files Modified
- scripts/audit/audit.sh (Enhanced with --fix flag, vulnerability counting with jq, better output)
- .github/workflows/publish-alpha.yml (Added security audit step: npm audit --audit-level=high)

#### Configuration Highlights
- Renovate runs weekly on Monday mornings (America/Chicago timezone)
- Patch updates auto-merge for non-0.x versions
- Major updates require dashboard approval
- Security updates bypass schedule (immediate)
- Lock file maintenance monthly
- ignoreDeps includes podverse-partytime (external fork)

#### Manual Setup Required
1. Install Renovate GitHub App at https://github.com/apps/renovate
2. Enable Dependabot alerts in GitHub repo Settings > Security > Code security and analysis
3. Configure branch protection to require CI pass for auto-merge

#### Result
Phase 12 complete - dependency management automation configured.

---

### Session 24 - 2026-01-24
#### Prompt (Developer)
plan the @podverse/.cursor/plans/active/monorepo-migration/13-skills-migration.md work. if it should be broken into smaller plans, do so. remember to update history.

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

#### Key Decisions
- Single plan sufficient (straightforward documentation migration)
- Copy all 10 web skill files from podverse-web to monorepo
- Update import paths: `podverse-helpers` → `@podverse/helpers`
- Update file paths: `src/` → `apps/web/src/`
- Create new API and ORM skill templates
- Add cross-references in global SKILL.md

#### Files Created
- `.cursor/skills/api/SKILL.md` (API patterns skill)
- `.cursor/skills/orm/SKILL.md` (ORM patterns skill)

#### Files Modified (copied from podverse-web and updated)
- `.cursor/skills/web/SKILL.md` (index with monorepo context)
- `.cursor/skills/web/01-component-patterns.md`
- `.cursor/skills/web/02-api-data-fetching.md`
- `.cursor/skills/web/03-styling.md`
- `.cursor/skills/web/04-configuration.md`
- `.cursor/skills/web/05-code-quality.md`
- `.cursor/skills/web/06-development-workflow.md`
- `.cursor/skills/web/07-reusable-utilities.md`
- `.cursor/skills/web/08-best-practices.md`
- `.cursor/skills/web/09-performance-optimization.md`
- `.cursor/skills/global/SKILL.md` (added Related Skills section)

#### Path Updates Applied
| Pattern | Replacement |
|---------|-------------|
| `podverse-helpers` | `@podverse/helpers` |
| `src/app/` | `apps/web/src/app/` |
| `src/components/` | `apps/web/src/components/` |
| `src/contexts/` | `apps/web/src/contexts/` |
| `src/config/` | `apps/web/src/config/` |
| `src/constants/` | `apps/web/src/constants/` |
| `src/styles/` | `apps/web/src/styles/` |
| `src/utils/` | `apps/web/src/utils/` |
| `src/providers/` | `apps/web/src/providers/` |
| `scripts/validate-env.ts` | `apps/web/scripts/validate-env.ts` |
| `docs/todo/improvements.md` | `apps/web/docs/todo/improvements.md` |
| `podverse-api/src/` | `apps/api/src/` |
| `podverse-helpers/src/` | `packages/helpers/src/` |

#### Result
Phase 13 complete - Skills migrated to monorepo with updated paths and new API/ORM skill templates.

---

### Session 95 - 2026-01-24
#### Prompt (Developer)
The most important parts of the monorepo migration should now be finished. Create a developer friendly quick start guide that explains how someone who has freshly cloned the repo can start running all the apps and watch build the packages and everything needed. Also include steps that are requirements like creating the docker database and other docker services. If the documentation is too long, then make it multiple files that are accessible with cross-reference links, but ideals there will be one document that provides very simple, short number of steps to go from cloned repo to running everything and successfully opening apps in the browser and they connect to their running back-end services. If the monorepo doesn't have a quick start path, and it seems like a problem to you, then analyze what is needed to get there. Create plans if this will be too much work and should be split up into smaller more manageable tasks.

#### Key Decisions
- Created comprehensive docs/QUICKSTART.md (290 lines) with full setup guide
- Added convenience Makefile targets: `local_infra_up`, `local_setup`
- Updated README.md with complete quick start flow and links to detailed guide

#### Files Created
- docs/QUICKSTART.md (comprehensive guide with 5-step quick start, verification checklist, troubleshooting, architecture diagram)

#### Files Modified
- Makefile.local (added `local_infra_up` and `local_setup` convenience targets)
- README.md (improved Quick Start section with prerequisites, complete steps, link to QUICKSTART.md)

#### Result
Developer quick start simplified to:
```bash
git clone && cd podverse && nvm use && npm install
make local_setup
npm run build:packages
npm run dev:api    # Terminal 1
npm run dev:web    # Terminal 2
```

---

### Session 96 - 2026-01-24
#### Prompt (Developer)
for convenience in the podverse monorepo, the make local_setup is a great idea, but if there is a down command, it should not remove non-podverse images if it is avoidable and would be smart to keep them for later. ex. we don't want to remove and re-pull the postgres image every time we start and stop the local setup

#### Key Decisions
- Added `local_clean` target (stops containers, removes volumes, preserves images)
- Added `local_prune_podverse_images` target (removes only podverse-specific images)
- Added `clean:packages`, `clean:apps`, `clean:all` npm scripts for build cache cleanup
- Updated QUICKSTART.md with new troubleshooting section for stale build caches

#### Files Modified
- Makefile.local (added local_clean, local_prune_podverse_images targets)
- package.json (added clean:packages, clean:apps, clean:all scripts)
- docs/QUICKSTART.md (updated Fresh Start section, added Stale Build Cache troubleshooting)

---

### Session 97 - 2026-01-24
#### Prompt (Developer)
[Build errors related to Node.js version and stale tsconfig.tsbuildinfo files]

#### Key Decisions
- Identified Node.js version mismatch (user had v16, monorepo requires v22)
- Stale `tsconfig.tsbuildinfo` files from failed builds cause TypeScript to skip emitting declaration files
- Created memory/skill for always using `source ~/.nvm/nvm.sh && nvm use 22` in terminal commands
- Added `clean:packages` script to remove tsconfig.tsbuildinfo and dist folders

#### Files Modified
- packages/helpers (and other packages) - rebuilt after cleaning stale caches

---

### Session 98 - 2026-01-24
#### Prompt (Developer)
[Path alias errors - Cannot find module '@api/config']

#### Key Decisions
- TypeScript path aliases (@api/*, @workers/*, @management-api/*) not transformed by tsc
- Added `tsc-alias` as post-build step to rewrite paths to relative imports
- Updated build scripts: `tsc && tsc-alias`

#### Files Modified
- apps/api/package.json (added tsc-alias to build/dev scripts)
- apps/management-api/package.json (added tsc-alias to build/dev scripts)
- apps/workers/package.json (added tsc-alias to build script)

---

### Session 99 - 2026-01-24
#### Prompt (Developer)
[valkey container failing with permission denied]

#### Key Decisions
- valkey-entrypoint.sh and valkey-healthcheck.sh missing execute permissions
- Fixed with `chmod +x`

#### Files Modified
- infra/scripts/keyvaldb/valkey-entrypoint.sh (chmod +x)
- infra/scripts/keyvaldb/valkey-healthcheck.sh (chmod +x)

---

### Session 100 - 2026-01-24
#### Prompt (Developer)
Add a simple endpoint for curl http://localhost:1234/api/v2/meta so that the test returns a success message or whatever you expect to be returned

#### Files Modified
- apps/api/src/app.ts (added /api/v2/meta endpoint returning { version, status: "ok" })

---

