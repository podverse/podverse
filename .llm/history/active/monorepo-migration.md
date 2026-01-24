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

### Session 1 - 2026-01-23
#### Prompt (Developer)
The new podverse repo is intended to be a monorepo, which will unite the many separate repos we have today in one repo.

The repos that will need to be shifted into the monorepo would include:

podverse-ops
podverse-helpers
podverse-external-services
podverse-notifications
podverse-orm
podverse-parser
podverse-mq
podverse-api
podverse-web
podverse-workers
podverse-qa
podverse-management-api
podverse-management-web

there are 2 additional repos in the podverse infrastructure, but these should remain outside of the monorepo:

partytime (aka podverse-partytime, it is a fork of a public library)
podverse-ansible (it contains private keys)

Note that, due to directional dependency, the order of those repos/modules is important, and that should be reflected in a prominent doc somewhere.

The goals of the monorepo are to achieve 2 primary things:

1) Optimal setup for LLM driven development. There should be a directory that contains a history of all LLM prompts used in the development of features. Make recommendations as to a best practice way to handle this. (we are using cursor exclusively right now, but we should anticipate other llms potentially being used, so stay generic where possible). It should also be optimized for skills, cursorrules, and any other best practices for LLM driven development per your recommendations.

2) Ease of development by open source contributors. By shifting to a monorepo, we can avoid people having to clone many repos to get started, and when people work on a feature or bug fix, they will only need to make one PR, instead of many PRs across multiple repos.

We currently intend to keep all of our module and app version numbers on the same version number, so a version increase in one module does not necessarily mean that module contains code changes, but rather is a signal that all the modules and applications are up-to-date and aligned in their version.

If possible, we would like avoid using heavier monorepo tools, unless you strongly advise them given our requirements. Ideally we can start with lighter monorepo tooling (if any is needed, at all), and have the monorepo structured in a way where we can add more sophisticated tooling later, if needed.

Create concise, high level documentation to plan out the shift. Later on, we will use that plan to break the work into more detailed, separate plans that can be implemented in chunks.

Provide an analysis of if you think this is a good decision, and possible pros and cons.

Also include this prompt in your llmhistory (or whatever naming you recommend for best practices) implementation.

#### Key Decisions
- npm workspaces for lightweight monorepo management
- Feature-based LLM history structure proposed
- Fresh git history acceptable

---

### Session 2 - 2026-01-23
#### Prompt (Developer)
For the git repo history, a fresh start is acceptable.

Since podverse-ops is currently a combination of many things, consider if it would be cleaner and more maintainable if parts of it were broken into their own, new directory.

Will a date-based, LLM history work? What if the prompts related to some work span multiple days?

I would like the nvm version used across all builds to be identical. Lint rules and tsconfig rules should be as identical as possible. Consistency, unity, and adoption of modern best-practices are primary goals.

Currently podverse-external-services is a combination of all the possible external services, but with this new structure, it may be preferable to group them in the same directory, but as separate modules, so apps only import the parts they need from external services, rather than everything, just to end up using one part. This does not need to be completed in this plan, but it should be noted as work to be completed later.

podverse-workers is also currently using the same environment variables for all jobs, when in reality individual jobs only need specific environment variables. This does not need to be completed in this plan, but it should be noted as work to be completed later.

Currently our alpha deploy process involves merging all of the v5-develop branches into its own v5-alpha branch, and Github actions handle the publishing process. I imagine that after the shift is complete, this process will involve only one merge from develop to alpha branch from the monorepo. The new Github action process should be managed in a way that we can verify all the steps should complete successfully ahead of time, since it is a long pipeline, and would be time consuming if predictable failures happen later during the process.

After updates are published, we have jenkins files that handle deploying the new alpha versions. This process should remain the same after the monorepo shift (although some tasks, like pulling from the podverse-ops repo, will need to change).

#### Key Decisions
- Feature-based LLM history (not date-based) to support multi-day work
- Split podverse-ops into infra/, scripts/, pipelines/
- Single .nvmrc for all builds
- Pre-validation CI step before publishing
- Future work noted: split external-services, per-job env vars for workers

---

### Session 3 - 2026-01-23
#### Prompt (Developer)
The podverse-helpers module may be larger than is needed for all applications, because it is a catch-all for shared utilities. If this should be broken into distinct helper modules, make note of that. We do not need this work completed in this plan, but it should be noted and anticipated for later.

#### Key Decisions
- Future work noted: split helpers into focused modules (@podverse/types, @podverse/core, etc.)

---

### Session 4 - 2026-01-23
#### Prompt (Developer)
I suspect this work will be a large task. Should you break it into separate plan documents, and save the plan documents, and then I can implement and review the changes, one by one? Or do you think that is unnecessary?

#### Key Decisions
- Hybrid approach: detailed Plan 1 now, outlines for Plans 2-5
- Phase 1 Infrastructure detailed, later phases outlined

---

### Session 5 - 2026-01-23
#### Prompt (Developer)
create it

#### Files Created
- Initial Plan 1: Infrastructure Setup

---

### Session 6 - 2026-01-23
#### Prompt (Developer)
The authors credit should have 4 names, but no email addresses

Mitch Downey
Creon Creonopoulos
Archie Brentano
Kyle Downey

#### Key Decisions
- Contributors list updated in package.json spec

---

### Session 7 - 2026-01-23
#### Prompt (Developer)
I would like the documentation, llm history tracking, and any tasks that must be remembered and documented, to be handled automatically, whenever someone makes changes using LLM. Do we need skills, or some other method, to ensure that is always handled automatically, so the programmer does not need to remember to do them?

#### Key Decisions
- Added automatic LLM history tracking to .cursorrules
- Added .cursor/rules/llm-history-tracking.mdc
- Added pre-commit hook for documentation reminders
- Added commit-msg hook for issue reference encouragement

---

### Session 8 - 2026-01-23
#### Prompt (Developer)
Somewhere in the skills, it should encourage the LLM to keep plans to less than 300 lines, and if plans go over 300 lines, instead of proceeding with agent work, it should recommend saving the plans locally, and then proceeding to work on them sequentially, one plan at a time.

Also, the .cursor/plans directory should be structured in a way where plans are grouped together in directories. Today, all of the plans relate to this monorepo work, but the plans should be put in a subdirectory, using whatever convention you recommend.

#### Key Decisions
- 300 line plan guideline added to skills
- Plans organized in project subdirectories (.cursor/plans/monorepo-migration/)

---

### Session 9 - 2026-01-23
#### Prompt (Developer)
Look in the podverse-ops repo to the npm-link-modules.sh and the terminals-rundev.json.example for an indication of what the developer workflow has previously looked like. We will want a similar feeling process going forward, however you indicated that npm workspaces may replace the need for `npm link` how we have used it previously.

Look at the existing environment variable setups and write a plan based on them. Can you view the .env.example and other env var example files? The ENV.md files? Use those to guide your master plan environment variable plans.

You can skip testing strategy for now, but make note of it as needed for future work.

Rollback plan. Make recommendations based on our setup.

Database migrations should be handled through Jenkins jobs. They should apply only the migration file selected. Currently there is an `init` option for the database migration, but after we reach Beta deployent (after Alpha), then we will only use the init option one time, and beyond that we will be using the one-at-a-time method of Jenkins initiated migrations.

Dependency updates. What would you recommend?

Versioning mechanics. Look to the existing publish-alpha.yml for an idea of how the versioning mechanics should work. Also look to the podverse-ops alpha-publish-all-packages.sh for an idea of our process. We want a process that is similar, although it can also change significantly given the monorepo setup.

Existing skills should be migrated.

IDE configuration. Make recommendations in your plans and anticipate creating documentation. (Note, I am using the Terminals Manager extension, which is how the terminals-rundev.json.example works.

Git workflow details. Add plans as you see fit.

It may make sense to create separate plan files for each of the areas of improvement you noted above, unless they should integrate with existing plans. Wait until your new plans are generated before creating new skills, so we can verify your skills are up-to-date with the final master plan.

#### Key Decisions
- Created phases 6-13 for supplemental plans
- Local dev workflow plan (06)
- Environment variables plan (07)
- Versioning & publishing plan (08)
- Database migrations plan (09)
- IDE configuration plan (10)
- Git workflow plan (11)
- Dependency management plan (12) - Renovate recommended
- Skills migration plan (13)

---

### Session 10 - 2026-01-23
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Response
Implementation was being done but large file issue emerged.

---

### Session 11 - 2026-01-23
#### Prompt (Developer)
why is there a giant @podverse/.cursor/plans/01-infrastructure-setup.md when i asked for there to be files ~300 or less? is that a mistake?

#### Response
Identified as archived/redundant file from before splitting into sub-plans.

---

### Session 12 - 2026-01-23
#### Prompt (Developer)
yes

#### Key Decisions
- Deleted the oversized 01-infrastructure-setup.md file

---

### Session 13 - 2026-01-23
#### Prompt (Developer)
Review and rate your current plans, and let me know if you think anything critical is missing.

#### Response
Rated plans 8.5/10, identified areas for improvement.

---

### Session 14 - 2026-01-23
#### Prompt (Developer)
I notice that you have not written any of our prompts to an llm history yet. Is the intention that that will begin after the work on these plans begin?

#### Response
Explained that history tracking was intended to start with Phase 1 implementation.

---

### Session 15 - 2026-01-23
#### Prompt (Developer)
You can wait. Also, for all the areas of improvement that you mentioned could be handled in the future, put brief notes about them in another plan or plans, with the intention of using them as a reminder to work on them later.

#### Files Created
- 99-future-work.md with deferred items and backlog

---

### Session 16 - 2026-01-23
#### Prompt (Developer)
It looks like your README.md is out of date in .cursor/plans/README.md. Update it. Also check if there is similar out of date documentation, and do not update it, but let me know.

#### Files Modified
- .cursor/plans/README.md updated with complete phase list

---

### Session 17 - 2026-01-23
#### Prompt (Developer)
Let's begin on the implementation. Is there any work required for @podverse/.cursor/plans/monorepo-migration/00-master-plan.md ?

#### Response
Clarified that master plan is reference document, implementation starts with Phase 1.

---

### Session 18 - 2026-01-23
#### Prompt (Developer)
Yes

#### Key Decisions
- Execute Phase 1 sub-plans in order: 01a → 01b → 01c → 01d → 01e

#### Files Created
- Directory structure (packages/, apps/, tools/, infra/, scripts/, pipelines/, .llm/, .github/, docs/)
- .nvmrc (Node 22)
- package.json (workspaces config)
- tsconfig.base.json (strict TypeScript)
- eslint.config.mjs (shared rules)
- .gitignore
- scripts/git-hooks/pre-commit, commit-msg, install-hooks.sh
- .llm/README.md, templates/, context/architecture.md, context/conventions.md
- .cursorrules
- .cursor/rules/llm-history-tracking.mdc, documentation-updates.mdc
- .cursor/skills/global/SKILL.md
- docs/ARCHITECTURE.md, docs/CONTRIBUTING.md
- README.md

---

### Session 19 - 2026-01-23
#### Prompt (Developer)
In my previous non-monorepo setup, I would use the Terminals Manager extension to run a build:watch or dev:watch command across all repos. Will there be a comparable multi-terminal shortcut after your full implementation completes?

#### Response
Confirmed Phase 6 and Phase 10 include Terminals Manager configuration with staggered timing pattern.

---

### Session 20 - 2026-01-23
#### Prompt (Developer)
Add a plan file that serves as a reminder that the project should be combed through and make sure all file names match the @podverse/.llm/context/conventions.md

#### Files Created
- .cursor/plans/monorepo-migration/98-file-naming-audit.md

---

### Session 21 - 2026-01-23
#### Prompt (Developer)
It looks to me like the monorepo-migration.md file does not contain the exact wording I used for the "Prompt" section. Is that expected and recommended?

#### Response
Explained current approach was summarization, recommended exact wording for initial prompts.

---

### Session 22 - 2026-01-23
#### Prompt (Developer)
I would like you to always use the full, exact user input prompt, and never summarize the prompt for purposes of history keeping. Is that possible, or not realistic?

#### Response
Confirmed this is possible and realistic. Proposed .cursorrules update.

---

### Session 23 - 2026-01-23
#### Prompt (Developer)
Make the change

#### Files Modified
- .cursorrules (added Prompt Recording rule requiring exact verbatim prompts)
- .llm/history/active/monorepo-migration.md (partial update with some exact prompts)

---

### Session 24 - 2026-01-23
#### Prompt (Developer)
It seems like you are missing many prompts from our journey through preparing the monorepo migration work. Can you add the FULL prompt history? Or is that not feasible?

#### Response
Explained limitation: only have summarized earlier prompts, not verbatim. Requested transcript.

---

### Session 25 - 2026-01-23
#### Prompt (Developer)
I have attached a full transcript of our prompt history. The prompts in the history themselves should always be exactly the user input used, while your replies and work and everything else can be summarized according to your smart judgment. Going forward, user prompts should be added to history in real-time, so the prompts do not get lost due to lack of persistent memory. @/Users/mitcheldowney/Downloads/cursor_podverse_monorepo_migration_plan.md

#### Key Decisions
- Full transcript provided
- All prompts to be captured verbatim
- Real-time capture going forward

#### Files Modified
- .llm/history/active/monorepo-migration.md (complete rewrite with all exact prompts)

---

### Session 26 - 2026-01-23
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Files Modified
- .llm/history/active/monorepo-migration.md (complete rewrite with all exact prompts)
- .cursorrules (real-time capture guidance)

---

### Session 27 - 2026-01-23
#### Prompt (Developer)
Somewhere in the plans, enforce the need to commit from freature branches, or branches with properly defined, standardized conventions. If the user tries to push to a branch and it defies a convention, the user should be notified in the terminal, and either be given the chance to correct it, or override the convention and push anyway.

#### Key Decisions
- Added pre-push hook for branch naming enforcement
- Valid patterns: feature/*, fix/*, chore/*, docs/*, hotfix/*, release/*
- Protected branches (main, beta, alpha, develop) block direct push
- Non-conforming branch names show warning with override option

#### Files Created
- scripts/git-hooks/pre-push

#### Files Modified
- scripts/git-hooks/install-hooks.sh (added pre-push installation)

---

### Session 28 - 2026-01-23
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Files Created/Modified
- scripts/git-hooks/pre-push (created)
- scripts/git-hooks/install-hooks.sh (updated)
- .git/hooks/pre-push (installed)

---

### Session 29 - 2026-01-23
#### Prompt (Developer)
It appears that in your history, the prompts written by me "Developer:" and you "Agent:" are not diffentiated. Are you able to differentiate these going forward? And can you correct them in the history retroactively?

#### Key Decisions
- Differentiate prompts using `#### Prompt (Developer)` vs `#### Prompt (Agent)`
- Developer = manually typed by user
- Agent = system-generated when clicking "Build" on a plan

#### Files Modified
- .llm/history/active/monorepo-migration.md (retroactive update with Developer/Agent labels)
- .cursorrules (updated format specification)
- .llm/templates/prompt-template.md (updated format)

---

### Session 30 - 2026-01-23
#### Prompt (Developer)
Is the @podverse/.cursor/plans/monorepo-migration/01-infrastructure/01a-configs.md plan completed?

#### Response
Verified plan 01a-configs.md is fully completed. All checklist items confirmed: directories, .nvmrc, package.json, tsconfig.base.json, eslint.config.mjs, .gitignore.

---

### Session 31 - 2026-01-23
#### Prompt (Developer)
It will be a common pattern to have .cursor/plans directories for features. After a plan has been completed, you should ask the dev if they would like you to mark it as completed. Update the skills.

#### Key Decisions
- Plans should be organized into `active/` and `completed/` subdirectories
- When a plan is confirmed complete, move it from `active/` to `completed/`

---

### Session 32 - 2026-01-23
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Files Created
- .cursor/plans/active/ (directory)
- .cursor/plans/completed/ (directory)

#### Files Modified
- .cursor/skills/global/SKILL.md (updated Plan Management section with active/completed structure and Plan Completion workflow)

#### Files Moved
- .cursor/plans/monorepo-migration/ → .cursor/plans/active/monorepo-migration/

---

### Session 33 - 2026-01-23
#### Prompt (Developer)
It appears you forgot to update the llm history. Update it, and if you need skills to be updated to remind you, update the skills.

#### Key Decisions
- Need to update skills to remind about LLM history tracking

---

### Session 34 - 2026-01-23
#### Prompt (Developer)
It is not enough for you to update the history after completing the work. You need to update the history in real-time, or else you will forget prompts due to lack of persistent memory. Do your skills, or some other feature, need to be updated, so you remember to do this continuously with prompts?

#### Key Decisions
- Identified need for real-time prompt capture (at START of response, not end)
- Discussed challenges: tool overhead, feature identification, not all prompts need logging

---

### Session 35 - 2026-01-23
#### Prompt (Developer)
Which do you recommend?

#### Key Decisions
- Recommended selective logging with immediate capture
- Log prompts that lead to file changes at START of response
- Skip pure Q&A
- Trigger rule: "If this response will modify files, log the prompt first"

---

### Session 36 - 2026-01-23
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Files Modified
- .cursorrules (updated Real-Time Capture section)
- .cursor/skills/global/SKILL.md (updated LLM History section)

---

## Outcome
[To be filled when migration is complete]
