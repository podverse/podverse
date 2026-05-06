# 06 — Web blocked-reason and takedown i18n

## Goal

Ensure web blocked and takedown experiences are keyed from policy/lifecycle reason data and are
fully localized without exposing raw backend keys.

## Includes adaptation of existing plan

The plan at
`/Users/mitcheldowney/.cursor/plans/podcast_index_blocked-reason_i18n_e185e72f.plan.md`
still needs implementation, and should be adapted to this schema as follows:

- Keep its i18n objective.
- Source data remains `feed_policy.primary_block_reason`.
- Do not introduce or depend on any status-table field in API/UI contracts.

## Files to update

- [apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx)
- [apps/web/src/app/podcast-index/feed/[podcast_index_id]/PodcastIndexFeedClient.tsx](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast-index/feed/[podcast_index_id]/PodcastIndexFeedClient.tsx)
- [apps/web/src/app/takedown-notice/[podcast_index_id]/TakedownNoticeClient.tsx](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/takedown-notice/[podcast_index_id]/TakedownNoticeClient.tsx)
- [packages/helpers/src/dtos/feed/feedPolicy.ts](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/dtos/feed/feedPolicy.ts)
- [apps/web/i18n/originals/en-US.json](/Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/en-US.json)
- Matching locale originals/overrides under
  [apps/web/i18n/originals/](/Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/)
  and
  [apps/web/i18n/overrides/](/Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/overrides/)

## Work items

- Enforce a typed reason-key union for `primary_block_reason`.
- Use translation-key mapping for blocked reason rendering.
- Update takedown notice logic to rely on lifecycle/policy reason source instead of status IDs.
- Provide unknown-reason fallback translation (never render raw key).

## Parity checks

- Same visible blocked/takedown UX states remain available.
- Banner and reason text are localized in all supported locales.

## Completion criteria

- Web blocked/takedown pages are policy/lifecycle driven and i18n-safe.
