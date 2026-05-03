# log-level-helper-standardization

**Started:** 2026-05-03  
**Author:** Agent  
**Context:** Shared `isLogLevelDebug` / `isEnvLogLevelDebug` in core helpers; replace ad-hoc LOG_LEVEL checks.

---

### Session 1 - 2026-05-03

#### Prompt (Developer)

Standardize LOG_LEVEL debug checks (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Podverse: `@podverse/helpers` exports `logLevel.ts`; call sites use `isLogLevelDebug(config.log.level)` or `isLogLevelDebug(process.env.LOG_LEVEL)`; `hasDifferentValues` drops logger-internal `any` peek in favor of env-only helper.
- Metaboost: parallel module under `@metaboost/helpers`; `@metaboost/helpers-valkey` depends on `@metaboost/helpers`; `pingDisposable` import order fixed for `perfectionist/sort-imports`.

#### Files Created/Modified

- packages/helpers/src/lib/logLevel.ts, logLevel.test.ts, src/index.ts
- apps/management-api/src/app.ts
- apps/api/src/lib/keyvaldb/keyvaldb.ts
- packages/orm/src/lib/hasDifferentValues.ts
