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

### Session 51 - 2026-01-24
#### Prompt (Developer)
Fix the lint errors. If you are unsure how to, ask me

#### Files Modified
- packages/helpers/src/lib/fileSize.ts (== null → === null || === undefined)
- packages/helpers/src/lib/item/itemEnclosure.ts (!= null → !== null && !== undefined)
- packages/helpers/src/lib/validation/password.ts (require('joi') → import Joi from 'joi')

#### Result
Build now passes with 0 errors, 16 warnings (warnings display but don't block)

---

### Session 52 - 2026-01-24
#### Prompt (Developer)
Fix the lint warnings

#### Files Modified
- packages/helpers/src/lib/image.ts (12× `!` → `?? 0` for non-null assertions in sort callbacks)
- packages/helpers/src/lib/requests/api/playlist/playlist.ts (3× `range!` → `range ?? 'week'`)
- packages/helpers/src/lib/stringify.ts (`Record<string, any>` → `Record<string, unknown>`)

#### Result
Build now passes with 0 errors and 0 warnings

---

### Session 53 - 2026-01-24
#### Prompt (Developer)
Continue on with the next package

#### Work
Building and fixing lint issues for packages/external-services


#### Prompt (Developer)
Fix the warnings


#### Files Modified
- packages/external-services/src/factory.ts (console.log → console.warn, eslint-disable for dynamic require)
- packages/external-services/src/module-alias-config.ts (eslint-disable for require)
- packages/external-services/src/services/paypal/index.ts (eslint-disable for any type)
- packages/external-services/src/services/podcast-index/index.ts (catch without variable, console.error, eslint-disable for any types)

#### Result
external-services builds with 0 errors, 0 warnings

---

### Session 54 - 2026-01-24
#### Prompt (Developer)
continue to orm

#### Work
Building and fixing lint issues for packages/orm


#### Files Modified
- packages/orm/src/module-alias-config.ts (eslint-disable for require)
- packages/orm/src/services/channel/channelPodroll.ts (! → ?. for optional chaining)
- packages/orm/src/services/publisherFeed.ts (! → ?. for optional chaining)
- packages/orm/src/services/queue/queueResource.ts (refactored to avoid non-null assertion)

#### Result
orm builds with 0 errors, 0 warnings

---

### Session 55 - 2026-01-24
#### Prompt (Developer)
continue to notifications

#### Work
Building and fixing lint issues for packages/notifications


#### Files Modified
- packages/notifications/src/factory.ts (console.log → console.warn)
- packages/notifications/src/services/webpush/webpushNotificationOrchestrator.ts (console.log → console.warn)
- packages/notifications/src/services/unifiedpush/unifiedpushNotificationOrchestrator.ts (console.log → console.warn)

#### Result
notifications builds with 0 errors, 0 warnings

---

### Session 56 - 2026-01-24
#### Prompt (Developer)
continue to parser

#### Work
Building and fixing lint issues for packages/parser


#### Files Modified
- packages/parser/src/module-alias-config.ts (eslint-disable for require)
- packages/parser/src/lib/rss/item/item.ts (!= → !==)
- packages/parser/src/lib/rss/liveItem/liveItem.ts (!= → !==, ! → ??)
- packages/parser/src/lib/compat/partytime/channel.ts (! → ??, added null check)
- packages/parser/src/lib/compat/partytime/item.ts (eslint-disable for any)
- packages/parser/src/lib/notifications/sharedNotificationHelpers.ts (! → ??)

#### Result
parser builds with 0 errors, 0 warnings

---

### Session 57 - 2026-01-24
#### Prompt (Developer)
continue to mq

#### Work
Building and fixing lint issues for packages/mq (final package)


#### Files Modified
- packages/mq/src/module-alias-config.ts (eslint-disable for require)
- packages/mq/src/functions/mq/rss/runLiveItemListener.ts (console.info → console.warn)
- packages/mq/src/services/activeMQArtemis/index.ts (refactored to avoid non-null assertions)

#### Result
mq builds with 0 errors, 0 warnings

---

## ALL 6 PACKAGES NOW BUILD CLEANLY

| Package | Status |
|---------|--------|
| helpers | ✅ 0 errors, 0 warnings |
| external-services | ✅ 0 errors, 0 warnings |
| orm | ✅ 0 errors, 0 warnings |
| notifications | ✅ 0 errors, 0 warnings |
| parser | ✅ 0 errors, 0 warnings |
| mq | ✅ 0 errors, 0 warnings |

---

### Session 58 - 2026-01-24
#### Prompt (Developer)
We are now ready to proceed with @podverse/.cursor/plans/active/monorepo-migration/03-apps-outline.md 

However it will be a lot of work, and should be broken up into smaller plans, with no more than 1 app per plan, and if there are additional steps that should be multiple plans, create those as well

#### Key Decisions
- Split Phase 3 into 6 sub-plans (one per app + integration plan)
- Migration order: management-api → management-web → workers → api → web → integration
- Simplest apps first to establish patterns

#### Files Created
- .cursor/plans/active/monorepo-migration/03a-management-api.md (1-2 hrs)
- .cursor/plans/active/monorepo-migration/03b-management-web.md (2-3 hrs)
- .cursor/plans/active/monorepo-migration/03c-workers.md (2-3 hrs)
- .cursor/plans/active/monorepo-migration/03d-api.md (3-4 hrs)
- .cursor/plans/active/monorepo-migration/03e-web.md (4-6 hrs)
- .cursor/plans/active/monorepo-migration/03f-integration.md (2-3 hrs)

#### Files Modified
- .cursor/plans/active/monorepo-migration/03-apps-outline.md (updated status, added sub-plan references)

---

### Session 59 - 2026-01-24
#### Prompt (Developer)
It looks like you forgot to update the history. If there is a skill missing that should remind you to update the history, then add the skill. Also, add to documentation for devs to read that explains how the auto history system works, and explain the situations where you may not update the history, how to avoid those situations, and to be on the look out for and manually give prompts to you to update the history when you forget.

#### Key Decisions
- Identified gap: llm-history-tracking.mdc rule only triggers for code files, not plan files
- Updated rule globs to include: `.cursor/plans/**/*.md`, `scripts/**/*.sh`, `scripts/**/*.ts`, `infra/**/*`
- Created comprehensive documentation explaining when auto-history may not trigger
- Added end-of-response confirmation pattern to skills

#### Files Modified
- .cursor/rules/llm-history-tracking.mdc (expanded globs, added limitation warning)
- .llm/README.md (complete rewrite with auto-history documentation)
- .cursor/skills/global/SKILL.md (added History Rule Limitations section)

---

### Session 60 - 2026-01-24
#### Prompt (Developer)
Proceed with @podverse/.cursor/plans/active/monorepo-migration/03-apps-outline.md 

#### Key Decisions
- Start Phase 3 app migrations one app at a time (per complexity rules)
- Begin with 03a-management-api as simplest app to establish patterns

---

