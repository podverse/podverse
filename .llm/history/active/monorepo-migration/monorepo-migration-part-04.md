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

### Session 37 - 2026-01-23
#### Prompt (Developer)
Have any of the monorepo plans been completed? If yes, move to completed.

#### Key Decisions
- Verified all 5 sub-plans in Phase 1 Infrastructure are complete
- Moved 01-infrastructure/ from active/ to completed/

#### Files Moved
- .cursor/plans/active/monorepo-migration/01-infrastructure/ → .cursor/plans/completed/monorepo-migration/01-infrastructure/

---

## Outcome
[To be filled when migration is complete]

### Session 38 - 2026-01-23
#### Prompt (Developer)
Start to implement the @podverse/.cursor/plans/active/monorepo-migration/02-packages-outline.md and let me know if you have questions or concerns.

#### Key Decisions
- Migrate packages in dependency order: helpers → external-services → orm → notifications → parser → mq
- Use CommonJS for now, NodeNext (ESM) migration planned separately
- Apply strict TypeScript settings from tsconfig.base.json
- Enforce semicolons in ESLint

#### Files Created
- packages/helpers/package.json, tsconfig.json, src/* (copied from podverse-helpers)
- packages/external-services/package.json, tsconfig.json, src/*
- packages/orm/package.json, tsconfig.json, src/* (with TypeORM decorator support)
- packages/notifications/package.json, tsconfig.json, src/*
- packages/parser/package.json, tsconfig.json, src/* (with @parser/* path alias)
- packages/mq/package.json, tsconfig.json, src/* (with @queue/* path alias)

#### Files Modified
- eslint.config.mjs (updated to enforce semicolons)
- packages/helpers/src/lib/backend/index.ts (added os.ts export)
- packages/orm/src/index.ts (added itemFlagStatus export)
- Multiple strict TypeScript fixes across all packages

---

### Session 39 - 2026-01-23
#### Prompt (Developer)
I just ran `nvm use`

#### Response
Continued with package migration after user switched to Node 22.

---

### Session 40 - 2026-01-23
#### Prompt (Developer)
Why did your terminal use Node 16? Is there a way to tell you to use the same node version as is specified in our monorepo nvmrc at all times?

#### Response
Explained that terminal commands spawn fresh shell sessions that don't auto-switch Node versions. Recommended `nvm alias default 22` as the quickest fix.

---

