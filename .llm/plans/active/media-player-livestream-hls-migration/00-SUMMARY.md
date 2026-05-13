# Livestream / HLS migration — summary

## Status

**Placeholder plan-set.** Expand into thorough implementation plans
(like `media-player-architecture-refactor` phases 03a/04a) before
opening a branch or writing code. This directory documents intent and
ordering only.

## Prerequisite

Merge and ship
[`media-player-architecture-refactor`](../media-player-architecture-refactor/)
first. That plan-set delivers: load policy, non-live
`<MediaElement>`, bridge + controls context, removal of the
`MEDIA_PLAYER` window-event bus, and **keeps** `video.js` for
livestreams.

## Goals (when executed)

- Retire `video.js` from [`apps/web/package.json`](../../../../apps/web/package.json).
- Add `hls.js` (or chosen alternative) with native HLS where
  `canPlayType('application/vnd.apple.mpegurl')` allows.
- Fold `target.kind === 'livestream'` into the same `<MediaElement>` as
  non-live playback; remove `LegacyLiveStreamControllerSelector` and
  the entire `Controller/LiveStream/` tree plus
  `MediaPlayerControllerLiveStreamAV.tsx`.
- Preserve observable behavior using the Phase 1 livestream baseline
  from the architecture plan-set (matrix appendix + four E2E specs).

## Primary risks

- Long-tail browser / network / codec regressions vs. video.js.
- Live ↔ non-live transitions (the legacy dispose/recreate dance must
  not return as a bug under HLS).
- Bundle size and dynamic-import strategy for `hls.js`.

## Active but blocked

Keep this plan-set under `.llm/plans/active/` but treat execution as
blocked until the architecture refactor is merged.

## Verification (after real implementation)

Commands will be finalized when this plan-set is expanded. Expect at
minimum: `npm run lint -w apps/web`, `npm run test:unit -w apps/web`,
`make e2e_test_web_report`, plus the livestream spec list from Phase 1
section 6 of the architecture plan-set.
