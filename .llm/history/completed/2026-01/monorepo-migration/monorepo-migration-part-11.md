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

### Session 101 - 2026-01-24
#### Prompt (Developer)
MISSING_MESSAGE: Could not resolve `disclaimers.environment_warning.local.message` in messages for locale `en-US`. [...] following the monorepo migration, these errors surface in web. is that an oversight of the migration or an pre-existing error? either way, fix the error

#### Key Decisions
- Pre-existing issue: only `alpha` environment warning was defined, not `local`
- Code dynamically looks up translations based on `server_env`

#### Files Modified
- apps/web/i18n/compiled/en-US.json (added local environment warning)
- apps/web/i18n/overrides/en-US.json (added local environment warning)
- apps/web/i18n/originals/en-US.json (added local environment warning)
- apps/web/i18n/compiled/es.json (added local environment warning in Spanish)
- apps/web/i18n/overrides/es.json (added local environment warning in Spanish)
- apps/web/i18n/originals/es.json (added local environment warning in Spanish)
- apps/web/i18n/compiled/fr.json (added local environment warning in French)
- apps/web/i18n/overrides/fr.json (added local environment warning in French)
- apps/web/i18n/originals/fr.json (added local environment warning in French)
- apps/web/i18n/compiled/el-GR.json (added local environment warning in Greek)
- apps/web/i18n/overrides/el-GR.json (added local environment warning in Greek)
- apps/web/i18n/originals/el-GR.json (added local environment warning in Greek)

---

### Session 102 - 2026-01-24
#### Prompt (Developer)
Add a skill if it will help you avoid these issues in the future [Node version, stale builds]

If it would help you remember, add a skill that mentions the quickstart guide should be updated going forward if changes impacted it, and also any relevant documentation that is out of date following any changes.

#### Memories Created
- Podverse monorepo: Node.js version and build cache requirements (always use nvm use 22, clean stale builds)
- Podverse monorepo: Update documentation after impactful changes (QUICKSTART.md, README.md, ENV.md)

---

### Session 103 - 2026-01-25
#### Prompt (Developer)
I am not ready to create a PR to merge into develop branch. Is there anything I should know? Is there documentation I should be aware of for steps, standards and practices?

#### Response
Provided overview of PR documentation: CONTRIBUTING.md, BRANCH-PROTECTION.md, PR template, LLM history requirements, CI checks.

---

### Session 104 - 2026-01-25
#### Prompt (Developer)
It seems like the contributing file has steps that overlap with the QUICKSTART. if the quickstart supplants the need for those steps, then the CONTRIBUTING should cross-reference to the QUICKSTART. also, review the other documentation to determine if there is other documentation that should be updated or use cross-referencing to avoid unnecessarily separate documentation

#### Key Decisions
- CONTRIBUTING.md should cross-reference QUICKSTART.md instead of duplicating setup steps
- README.md had duplicate setup sections and a broken ENV.md link
- QUICKSTART.md should cross-reference IDE-SETUP.md for terminal configurations

#### Files Modified
- docs/CONTRIBUTING.md (replaced Setup/Run Apps with cross-reference to QUICKSTART.md)
- README.md (removed duplicate Development > Setup section, fixed broken ENV.md link, improved Documentation section)
- docs/QUICKSTART.md (added IDE-SETUP.md cross-reference in Watch Mode section)

---

### Session 105 - 2026-01-25
#### Prompt (Developer)
the contributing.md describes the workflow, which is ok, but shouldn't it guide the user to use the existing create-feature or related scripts for consistency?

#### Key Decisions
- Updated Workflow section to guide users to use `npm run start-feature` and `npm run complete-feature` scripts
- Scripts ensure consistent branch naming, proper LLM history file creation, and proper completion workflow

#### Files Modified
- docs/CONTRIBUTING.md (rewrote Workflow section to use feature scripts, updated LLM Development section)

---

### Session 106 - 2026-01-25
#### Prompt (Developer)
I think we can get rid of the Outcome handling for the monorepo entirely. It seems like it will be tedious and prohibitive towards people creating PRs.

#### Key Decisions
- Removed Outcome section requirement to reduce friction for contributors
- LLM history still tracks sessions, prompts, decisions, and files - just no mandatory summary
- Deleted GitHub workflows that enforced/auto-generated Outcomes
- ANTHROPIC_API_KEY secret no longer required

#### Files Modified
- scripts/start-feature.sh (removed ## Outcome section from template)
- scripts/complete-feature.sh (removed Outcome checking logic)
- docs/CONTRIBUTING.md (removed Outcome mention from workflow)
- docs/modules/SECRETS.md (removed ANTHROPIC_API_KEY references)
- scripts/git-hooks/pre-push (removed Outcome comment)

#### Files Deleted
- .github/workflows/pr-auto-complete.yml (no longer needed)
- .github/workflows/pr-completion-check.yml (no longer needed)

---

### Session 107 - 2026-01-25
#### Prompt (Developer)
The pre-commit hook reminds you if code changes are committed without history updates.

I think this hook may be too prohibitive as well, given that some contributors may not be using LLM for dev workflow. I think we can remove it, but it should just be encouraged in the documentation to be mindful to let LLM keep track of your prompt history for LLM driven development

#### Key Decisions
- Removed pre-commit hook that enforced LLM history updates
- LLM history tracking now documented as optional best practice, not enforced
- Simplified CONTRIBUTING.md to encourage rather than require history tracking
- Contributors no longer need SKIP_HISTORY_CHECK workaround

#### Files Modified
- scripts/git-hooks/install-hooks.sh (removed pre-commit installation)
- docs/CONTRIBUTING.md (made LLM Development optional, removed Non-LLM section)
- docs/BRANCH-PROTECTION.md (removed pre-commit from Local Enforcement list)

#### Files Deleted
- scripts/git-hooks/pre-commit (no longer needed)

---

### Session 108 - 2026-01-25
#### Prompt (Developer)
We need a github action that can verify that all the packages and modules build without failure, before a PR can be merged into the develop branch. I am unsure how to handle this action however. The build process should NOT be triggered when the PR is created, because this is an open source project, and we do not want people to be able to spam our Github actions. However, it seems like it should be a step before approval, because we can't confidently "approve" code until it is verified that everything can build.

#### Key Decisions
- Implemented comment-triggered CI using `/test` command
- CI only runs when a maintainer (OWNER, MEMBER, COLLABORATOR) comments `/test` on a PR
- Prevents abuse from spam PRs consuming GitHub Actions minutes
- Workflow adds 🚀 reaction to confirm CI started, posts success/failure comment when done

#### Files Modified
- .github/workflows/ci.yml (rewrote to use issue_comment trigger with permission checks)
- docs/CONTRIBUTING.md (added "CI for External Contributors" section explaining /test workflow)
- docs/BRANCH-PROTECTION.md (added "Comment-Triggered CI" section with workflow details)

---

### Session 109 - 2026-01-25
#### Prompt (Developer)
The ci test process should also confirm that the init_database and same for management matches the combined result of the numbered migrations files (to ensure the combine step has not been skipped)

#### Key Decisions
- Added CI step to verify database migration files are properly combined
- Created verification script that compares combined files with expected output (ignoring timestamps)
- Added npm scripts: `db:combine` (run combine) and `db:verify` (check sync)
- CI fails with helpful message if migrations are added without running combine

#### Files Created
- scripts/database/verify-migrations-combined.sh (verification script)

#### Files Modified
- .github/workflows/ci.yml (added "Verify database migrations combined" step)
- package.json (added db:combine and db:verify npm scripts)

---

### Session 110 - 2026-01-25
#### Prompt (Developer)
do you think any reviewers, assignees, or labels should be automatically added when a pr is created?

should the PR have a minimal checklist that encourages the dev to fill out reviewers or assignees or labels themselves?

I created a team "@reviewers" that should be auto set as the reviewers when anyone creates a PR

The corresponding github issue for the PR should be auto filled in the default PR message.

Anything else you recommend?

#### Key Decisions
- Updated CODEOWNERS to use @podverse/reviewers team for auto-review requests
- Simplified PR template: removed LLM history checkbox (now optional), added /test note
- Created auto-labeling workflow that adds labels based on file paths changed
- Labels: packages, apps, docs, infra, ci, scripts, tools

#### Files Created
- .github/workflows/pr-labeler.yml (auto-labels PRs based on changed files)

#### Files Modified
- .github/CODEOWNERS (changed @podverse/maintainers to @podverse/reviewers)
- .github/PULL_REQUEST_TEMPLATE.md (simplified checklist, added CI /test note)

---

