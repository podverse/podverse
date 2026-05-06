### Session 1 - 2026-05-05

#### Prompt (Developer)

Feed State Consolidation Recommendation

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Kept the dual-model architecture in place: `feed_policy` for access gating and
  `feed_flag_status` for lifecycle operations.
- Consolidated public read paths to rely on `feed_policy.public_visible` only where behavior is
  equivalent.
- Added explicit lifecycle-state constants/helpers and reused them in parser eligibility and
  archiver workflows to clarify boundaries before any future status-table reduction.
- Added focused ORM unit tests for lifecycle boundary helpers and active-feed where clause shape.

#### Files Modified

- .llm/history/active/feed-state-consolidation/feed-state-consolidation-part-01.md
- packages/orm/src/lib/feedFlagHelpers.ts
- packages/orm/src/lib/feedFlagHelpers.test.ts
- packages/orm/src/lib/feedLifecycleState.ts
- packages/orm/src/lib/feedLifecycleState.test.ts
- packages/orm/src/index.ts
- packages/orm/src/services/account/accountFollowingChannel.ts
- packages/orm/src/services/archiver.ts
- packages/orm/src/services/channel/channel.ts
- packages/orm/src/services/clip.ts
- packages/orm/src/services/feed/feedFlagStatus.ts
- packages/orm/src/services/item/item.ts
