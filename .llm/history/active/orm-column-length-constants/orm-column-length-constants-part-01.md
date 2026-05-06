# ORM column length constants

## Metadata

- **Started:** 2026-05-05
- **Author:** Agent
- **Context:** Implement plan for feed lifecycle VARCHAR limits, Joi alignment, documentation.

### Session 1 - 2026-05-05

#### Prompt (Developer)

ORM `length` literals vs constants

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `packages/orm/src/lib/feedLifecycleLimits.ts` with domain-named max lengths aligned to migration 0025.
- Wired `feedLifecycleEvent`, `feedLifecycleState`, `feedLifecycleStateType` to use those constants; exported from
  `@podverse/orm`.
- Aligned `lifecycle_reason_key` Joi max from 256 to `FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH` (64) to match DB.
- Documented pattern in `AGENTS.md` and `.cursor/skills/orm/SKILL.md`; noted canonical linear migrations path in ORM
  skill header.

#### Files Created/Modified

- packages/orm/src/lib/feedLifecycleLimits.ts
- packages/orm/src/entities/feed/feedLifecycleEvent.ts
- packages/orm/src/entities/feed/feedLifecycleState.ts
- packages/orm/src/entities/feed/feedLifecycleStateType.ts
- packages/orm/src/index.ts
- apps/management-api/src/schemas/feedOperationsPolicy.ts
- AGENTS.md
- .cursor/skills/orm/SKILL.md

### Session 2 - 2026-05-05

#### Prompt (Developer)

@podverse/packages/orm/src/entities/billingDomainEvent.ts:14-15 we want to use imported
constants whenever possible for length unless there is a specific reason not to use them in
entities files. sweep through and fix

#### Key Decisions

- Added `packages/orm/src/lib/billingLimits.ts` (`BILLING_IDEMPOTENCY_KEY_MAX_LENGTH`,
  `ISO_4217_CURRENCY_CODE_CHAR_LENGTH`) and `feedTableLimits.ts` (`FEED_CONTAINER_ID_MAX_LENGTH`);
  exported from `@podverse/orm`.
- Replaced remaining numeric `length` literals in entities with `@orm/lib` /
  `DATABASE_CONSTANTS` usage; feed policy / condition type / condition source reuse
  `feedLifecycleLimits` where widths match migrations (
  `0024_feed_policy_split.sql` / `0025_feed_lifecycle_state_replacement.sql`).

#### Files Created/Modified

- packages/orm/src/lib/billingLimits.ts
- packages/orm/src/lib/feedTableLimits.ts
- packages/orm/src/index.ts
- packages/orm/src/entities/billingDomainEvent.ts
- packages/orm/src/entities/billingPrice.ts
- packages/orm/src/entities/account/accountMembershipStatus.ts
- packages/orm/src/entities/feed/feed.ts
- packages/orm/src/entities/feed/feedCondition.ts
- packages/orm/src/entities/feed/feedConditionType.ts
- packages/orm/src/entities/feed/feedPolicy.ts
- .llm/history/active/orm-column-length-constants/orm-column-length-constants-part-01.md
