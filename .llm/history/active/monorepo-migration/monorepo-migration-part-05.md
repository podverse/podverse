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

### Session 41 - 2026-01-23
#### Prompt (Developer)
It looks like you did not update the @podverse/.llm/history/active/monorepo-migration.md history automatically yet again. Why not? What do I need to do to get you to remember that step consistently? Or what approach should I pivot to that will be more reliable? Are you just inevitably going to forget sometimes?

#### Response
Honest acknowledgment that cognitive overload during complex work causes me to forget auxiliary tasks. Proposed two-pronged solution:
1. Automated enforcement via pre-commit hook
2. Complexity assessment skill to break down large tasks

---

### Session 42 - 2026-01-23
#### Prompt (Developer)
Option A would be good, but what if we also add a skill that, when I attempt to run a command that is too complex for you to remember something like the auto history recording step, you do not immediately care out the plan, and instead urge me to have to break the plan into smaller pieces / plans first? For example, you just handled migrating multiple packages as one plan. Perhaps if we had broken your plan into one plan per module, then you would have been able to remember the skill, like the auto history recording? What would you recommend, and how can we get you to make these suggestions to prevent you from working on an overwhelming prompt?

#### Key Decisions
- Add complexity thresholds: 3+ packages, 10+ files, 2+ dependency chains, 20+ min estimated
- When exceeded: STOP, list factors, propose breakpoints, require explicit approval of reduced scope

---

### Session 43 - 2026-01-23
#### Prompt (Developer)
Sounds great

#### Response
Created plan for LLM History Reliability improvements.

---

### Session 44 - 2026-01-23
#### Prompt (Developer)
Sometimes people may do feature work without using LLM. For them, there would be no history check. Make sure the SKIP_HISTORY_CHECK you propose is clearly documented somewhere.

#### Key Decisions
- Add SKIP_HISTORY_CHECK documentation to CONTRIBUTING.md
- Document as expected workflow for non-LLM development

---

### Session 45 - 2026-01-23
#### Prompt (Agent)
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Files Modified
- scripts/git-hooks/pre-commit (stricter enforcement, SKIP_HISTORY_CHECK support, comments)
- docs/CONTRIBUTING.md (added Non-LLM Development section)
- .cursor/skills/global/SKILL.md (added Complexity Assessment section with thresholds)
- .cursorrules (added COMPLEXITY ASSESSMENT section)
- .llm/history/active/monorepo-migration.md (this update)

---

### Session 46 - 2026-01-23
#### Prompt (Developer)
I see that your removed nodemon as a dependency in our repos. The reason for nodemon was to ensure that consumer packages and apps of a package would automatically rebuild after the linked package that they import is rebuilt. Will this still happen with your build:watch command?

#### Response
Identified that `tsc --watch` does NOT cascade rebuilds to dependent packages. The old nodemon setup explicitly watched `node_modules` paths.

---

### Session 47 - 2026-01-23
#### Prompt (Developer)
Which do you recommend? I am looking for the cleanest, lightest, most reliable option, which still getting the rebuild behavior I am used to.

#### Key Decisions
- Recommended TypeScript Project References over nodemon
- Project references: native TypeScript, zero extra dependencies, incremental builds
- Requires `composite: true` and `references` in tsconfig.json files

---

### Session 48 - 2026-01-23
#### Prompt (Developer)
Update them

#### Files Modified
- packages/helpers/tsconfig.json (added composite: true)
- packages/external-services/tsconfig.json (added composite: true, references to helpers)
- packages/orm/tsconfig.json (added composite: true, references to helpers)
- packages/notifications/tsconfig.json (added composite: true, references to helpers, external-services)
- packages/parser/tsconfig.json (added composite: true, references to helpers, external-services, orm)
- packages/mq/tsconfig.json (added composite: true, references to all packages)
- All package.json build:watch scripts updated to use `tsc --build --watch`
- Fixed additional strict TypeScript errors revealed by composite mode in parser and helpers

---

### Session 49 - 2026-01-24
#### Prompt (Developer)
I see that the target in helpers is ES2022 and the module is CommonJS. Why is the module CommonJS, but the base is NodeNext?

#### Response
Explained intentional design: base tsconfig has NodeNext as forward-looking target, but packages override with CommonJS for current compatibility. ESM migration deferred to separate phase (tracked in 14-esm-migration.md).

---

### Session 50 - 2026-01-24
#### Prompt (Developer)
npm run build successfully runs for the new helpers module, but I see linting errors like "Strings must use singlequote". Why is the build succeeding if linter errors exist? Can the build command be made more strict so linting errors will cause failure? Can linting warnings display when building, but not cause failure?

#### Key Decisions
- TypeScript (`tsc`) and ESLint are separate tools - tsc only checks types, not style
- ESLint already distinguishes errors (fail) from warnings (display only)
- Solution: Add `npm run lint &&` before `tsc` in build scripts

#### Files Modified
- packages/helpers/package.json (build: "npm run lint && tsc")
- packages/external-services/package.json (build: "npm run lint && tsc")
- packages/orm/package.json (build: "npm run lint && tsc")
- packages/notifications/package.json (build: "npm run lint && tsc")
- packages/parser/package.json (build: "npm run lint && tsc")
- packages/mq/package.json (build: "npm run lint && tsc")

---

