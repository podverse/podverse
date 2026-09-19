# 03 — Playlist detail parity

**Cursor model:** Codex 5.3 · **Reasoning:** high

Decisions 4, 8 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[773](/docs/proposals/mobile/_master-plan_/phase-2/details/773-playlist-detail-parity.md)

View-mode detail: header metadata, follow, paginated resources, tap-to-play with playlist auto-queue.
Owner edit-items mode stays inert-toggle-ready for 04 (keep the existing reorder toggle visible for
owners with 2+ items, but Move up/down buttons can remain until 04 replaces them — or leave the
toggle disabled until 04 if cleaner; prefer keeping the toggle and swapping the body in 04).

## Header

Show title, description (when set), item count, last updated, medium, creator. Keep Share.
Non-owner + signed-in: Follow / Unfollow through `playlistRepository` (membership-gated on press).
Owner: Edit → `PlaylistEdit` (metadata form); do not show Follow.

## Resource list (view mode)

- Paginated load via repository (`GetManyByPlaylistIdText`), not private-all
- `FillList` + `HomeFeedRow` from `playlistResourceToHomeRow` (add-by-RSS included from 01)
- **Whole-row tap plays** and seeds playlist auto-queue (`playPlaylistRowById` or equivalent), with
  `autoQueueShouldClear` parity to web's `createPlayHandler`
- Per-item share from row More when supported

Do not navigate to episode detail on row tap from this screen.

## States

Public playlists from Browse must load when sharable allows (including signed-out public). Private
non-owned playlists stay gated. Offline Mode serves cache when present. Loading / empty / error
through `AuthAwareLoadState`; empty never while in flight.

## Out of scope

Long-press drag, swipe remove, delete playlist, add-to sheet — 04 / 05.

## Verification (operator)

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
