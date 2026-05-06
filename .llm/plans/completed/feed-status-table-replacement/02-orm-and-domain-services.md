# 02 — ORM and domain services

## Goal

Move service APIs from status IDs to condition/lifecycle primitives and keep clear boundaries:
conditions drive policy, lifecycle drives workflow orchestration.

## Files to update

- [packages/orm/src/index.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/index.ts)
- [packages/orm/src/services/feed/feed.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/feed/feed.ts)
- [packages/orm/src/services/feed/feedPolicy.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/feed/feedPolicy.ts)
- New service:
  [packages/orm/src/services/feed/feedLifecycleState.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/feed/feedLifecycleState.ts)
- New helper:
  [packages/orm/src/lib/feedLifecycleState.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/lib/feedLifecycleState.ts)
- Status service retirement/replacement:
  [packages/orm/src/services/feed/feedFlagStatus.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/feed/feedFlagStatus.ts)

## Work items

- Replace `FeedService.updateFlagStatus(...)` with explicit APIs:
  - `setFeedConditions(...)`
  - `setFeedLifecycleState(...)`
  - `refreshFeedPolicy(...)`
- Convert parser eligibility helper to policy/lifecycle-based logic.
- Provide one orchestration entrypoint that applies condition/lifecycle mutation + policy refresh
  transactionally.
- Remove exported types/constants that expose status table semantics.

## Parity checks

- Existing call sites can express all prior operations:
  - spam detection
  - takedown action with reason note
  - pending archive / archived transitions
- No public query helper depends on removed status IDs.

## Completion criteria

- `@podverse/orm` builds without references to `feed_flag_status` entities/services.
- Unit tests cover helper/service behavior for multi-condition and lifecycle transitions.
