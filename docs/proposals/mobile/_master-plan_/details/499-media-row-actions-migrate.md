# 499-media-row-actions-migrate

**Master step:** 9c.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Migrate Home feed rows, Episode/Clip/Album/Artist list actions, and Add-by-RSS item/feed chrome
  to shared `MediaRowActions`.
- Wire play / queue next / queue last to Track 10 hooks when available; stubs OK until PG-7a
  lands (same stub surface as today, not wrong labels).
- Feed/channel remove or unfollow must use `features.unsubscribe` (or subscribe toggle), **never**
  `features.queue.*`.

## Acceptance criteria

- No mobile screen uses queue i18n for non-queue actions
- Add-by-RSS item rows expose play + queue next/last (or more sheet) consistent with web episode
  rows when item UI exists; feed list keeps feed-level actions only
- Home/Episode/Clip use shared component
- E2E add-by-rss / home still pass (update selectors if needed)

## Web parity references

- `AddByRSSEpisodeRow` more menu; `ListEpisodeRow` / common episode row actions
- Add-by-RSS podcast header Subscribe/Unsubscribe

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- add-by-rss
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## Depends on

- 9c.2; preferably Track 10.6/10.14 for real handlers (stubs acceptable interim)

## Implementation notes

- Migrated the **shared** `HomeFeedRow` (`apps/mobile/src/screens/home/HomeFeedRow.tsx`) to render
  `MediaRowActions` (9c.2): inline **Play** + a **More** action sheet with **Queue: Next** and
  **Queue: Last**. Because `HomeFeedRow` is reused everywhere, this migrates all ~13 call sites at
  once: Home, Episode detail (soundbites/clips/episode), Clip detail, Album/Artist track lists,
  Playlist detail, Library (queue/history/my-clips), Podcast detail, and the full-player up-next
  sheet. Search/Profile keep no-op handlers.
- **Fixed the 9c.1 mislabel:** the old single inline button was labelled `features.queue.queue_next`
  but appended (`addToQueueLast`). `useHomeRowPlayback.runQueueAction` now takes a
  `position: 'next' | 'last'` and calls `addToQueueNext` / `addToQueueLast`; `HomeFeedRow`'s
  `onQueuePress(row, position)` threads it, and each call site forwards `position`. The More sheet
  exposes both with correct keys (`features.queue.queue_next` / `features.queue.queue_last`).
- Wired to **real** Track 10 handlers (PG-7a is in place): play via the orchestrator, queue via
  `useQueueMutations` (`addToQueueNext` was previously unwired; now surfaced).
- **Add-by-RSS chrome unchanged** and confirmed correct: `AddByRssRootScreen` feed rows use
  `media_player.play` (feed play-first) and `features.unsubscribe` (feed remove/unfollow) — never a
  `features.queue.*` key. Feed list stays feed-level only (no item rows exist yet; when built they
  reuse `MediaRowActions`).
- testIDs preserved/added: Play keeps `home-row-play-<id>`; new More trigger `home-row-more-<id>`;
  sheet actions `media-row-action-queue-next-<id>` / `-queue-last-<id>`. Removed the old inline
  `home-row-queue-<id>` button.
- **E2E updated:** `apps/mobile/e2e/queue-add.yaml` now opens the More sheet
  (`home-row-more-*` → assert `media-row-sheet-*`) and taps `media-row-action-queue-last-*` instead
  of the removed inline queue button. Home/play flows (`home-row-play-*`) are unchanged.
