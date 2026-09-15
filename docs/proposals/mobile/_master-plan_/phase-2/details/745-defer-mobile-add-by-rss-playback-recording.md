# 745-defer-mobile-add-by-rss-playback-recording

**Master step:** P2.3.17
**Model (author + implement):** Opus 5
**Status:** deferred

## Scope

Mobile does not record playback events for add-by-RSS episodes. Playing one on the phone writes no
position, enqueues no outbox row, and never takes part in reconciliation or multi-device handoff.

`nowPlayingResourceFromTarget` in `apps/mobile/src/playback/playbackEventSource.ts` returns `null`
for the `add-by-rss` target kind, and `recordPlaybackEvent` in
`apps/mobile/src/playback/PlaybackProvider.tsx` returns early on that `null` before it reaches the
outbox. `apps/mobile/src/hooks/useAddByRssPlayback.ts` has no recording path of its own.

**Livestream also returns `null`, and that is correct.** A livestream has no meaningful resume
position, so it must keep returning `null` when this is picked up.

## Why this is a gap rather than a design choice

Every other layer already handles the kind:

- `PLAYBACK_OUTBOX_RESOURCE_KINDS` in `apps/mobile/src/data/repositories/playbackOutbox.ts` includes
  `'add_by_rss'`.
- `apps/mobile/src/data/repositories/playbackReconcile.ts` resolves and merges `add_by_rss` refs.
- The API exposes `POST /queue/:queue_id_text/item-add-by-rss/now-playing` and accepts the same
  `last_played_at` / `playback_event_kind` fields as the linked-resource routes.
- `QueueResourceService.replayPlaybackEvents` applies add-by-RSS events through
  `applyAddByRssPlaybackWriteTransactional`.
- Web records add-by-RSS positions with event kinds via `apps/web/src/hooks/useAddByRSSPositionSave.tsx`.

So mobile is the only surface that cannot produce an add-by-RSS timestamp, while still being able to
_read_ one. That asymmetry is the actual harm: mobile can detect a conflict against a remote
add-by-RSS row but can never win one, so a stale server row can overwrite real listening that
happened on the phone. This is the case
[`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc) exists to catch —
cross-device state must be written by every surface that can change it.

## Why deferred

Add-by-RSS is a smaller share of mobile listening than subscribed content, and the fix touches the
playback recording path that the rest of reconciliation depends on. Landing it separately keeps that
change reviewable on its own rather than folding it into the reconciliation work it corrects.

## Acceptance criteria (when picked up)

- Playing an add-by-RSS episode on mobile enqueues outbox events with the same meaningful-event rule
  as linked resources, using the resource kind `add_by_rss` and the feed's hash id.
- Offline add-by-RSS listening drains to the API after reconnect and lands in history in
  chronological order alongside linked-resource listening.
- An add-by-RSS episode played on mobile wins a later-wins merge against an older server row.
- A different-item handoff conflict where either side is add-by-RSS prompts with a usable title, not
  a bare hash id, whenever the stored feed bundle has one.
- Livestream targets still record nothing.

## Web parity references

- `apps/web/src/hooks/useAddByRSSPositionSave.tsx`
- `apps/mobile/src/playback/playbackEventSource.ts`
- `apps/mobile/src/playback/PlaybackProvider.tsx`
- `apps/mobile/src/hooks/useAddByRssPlayback.ts`
- `apps/mobile/src/data/repositories/playbackOutbox.ts`
- `apps/mobile/src/data/repositories/playbackReconcile.ts`
- [743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
- [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)

## Verification

```bash
# Mobile Maestro — when implemented
npm run mobile:e2e:test -- playback-offline-reconciliation
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
