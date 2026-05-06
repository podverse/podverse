# 03 — Parser pipeline migration

## Goal

Update parser execution to use condition and policy/lifecycle sources directly, supporting
simultaneous active reasons while preserving skip/allow behavior.

## Files to update

- [packages/parser/src/lib/rss/parser.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts)
- [packages/parser/src/lib/rss/parser.getAndParseRSSFeed.test.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.getAndParseRSSFeed.test.ts)
- [packages/parser/src/lib/rss/parser.noopLockLoser.test.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.noopLockLoser.test.ts)
- Parser helper files under
  [packages/parser/src/lib/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/)

## Work items

- Replace status-ID parser gate with:
  - `feed_policy.parse_allowed`
  - lifecycle-state allowlist check for parse execution.
- Keep spam threshold behavior, but write to `feed_condition` keys and recompute policy.
- Ensure oversized errors set/clear `oversized_detected` condition.
- Ensure parser no-op lock loser path remains side-effect free.

## Parity checks

- Feeds currently blocked from parsing remain blocked.
- `spam_detected` and `oversized_detected` can be active at the same time.
- Parser logs/metrics remain informative after API renames.

## Completion criteria

- Parser runtime has zero direct dependence on `FeedFlagStatusStatusEnum`.
- Parser integration tests cover mixed-condition scenarios.
