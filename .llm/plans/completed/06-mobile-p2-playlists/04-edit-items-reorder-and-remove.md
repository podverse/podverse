# 04 — Edit items: reorder and remove

**Cursor model:** Opus 5 · **Reasoning:** high

Decisions 6–7 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[774](/docs/proposals/mobile/_master-plan_/phase-2/details/774-playlist-edit-items-reorder-and-remove.md)

**Prerequisite:** queue details 757–759 are implemented on this branch (long-press body-drag prop on
`ReorderableSections` + drop resolver).

Owner edit-items mode: replace Move up / Move down buttons with long-press whole-row drag and
swipe-only remove.

## Mode

- Owner-only toggle (`library-playlist-detail-reorder-toggle`); labels
  `features.playlist.reorder` / `misc.done`
- While on: load **private-all** through `playlistRepository`
- While off: return to paginated view list from 03

## Drop resolver

Reuse the queue's pure resolver if the call shape matches playlist first / last / between; otherwise
add a playlist-local tested pure function with the same table:

| Drop index   | Call                                                  |
| ------------ | ----------------------------------------------------- |
| `0`          | `*AddFirst`                                           |
| `length - 1` | `*AddLast`                                            |
| middle       | `*AddBetween` with reordered neighbors' `list_position` |

Dispatch on item / clip / soundbite / add-by-RSS. Tests: first, last, middle, single, two-item,
no-op. On failure, reload from server. Membership → `handleGateError`.

## Gestures

Compose long-press row pan + `SwipeActionRow` + press so:

1. Quick tap still plays
2. Horizontal swipe reveals Remove (`features.playlist.remove_from_playlist`, testID
   `playlist-row-${id}-swipe`)
3. Drag does not play on release

Keep Move up / Move down as accessibility actions through the same resolver. Tab bar settings keep
handle-only drag. Haptics / springs / custom chrome stay deferred (599).

## Out of scope

Form delete and add-to sheet (05). DnD polish.

## Verification (operator)

Device check both platforms for the three gesture cases above, then:

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
