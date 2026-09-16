# 749-player-action-rows-and-more-sheet

**Master step:** P2.1.4
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

The two chrome rows that bracket the player region, and the More sheet they open.

### Top action row (fixed, above the scroller)

| Control         | Behavior                                                                   |
| --------------- | -------------------------------------------------------------------------- |
| Dismiss         | Chevron-down; closes the player (keeps `full-player-close`)                |
| Create clip     | **Placeholder** — pressable; says it is not available yet, changes nothing |
| Add to playlist | Real — the existing `useAddToPlaylist` sheet                               |
| Share           | Real — the existing `shareResolvedUrl` / `buildNowPlayingShareUrl`         |
| Queue           | Real — opens Up next as a sheet                                            |
| Value for value | Config-gated, as today (keeps `full-player-v4v`)                           |

Clip authoring remains its own later area. The scissors is visible so the affordance is not lost, and
it behaves like the icons beside it: pressing it shows a short "not available yet" message and changes
nothing — no state, no request, no persistence. A user learns the feature is unavailable by reaching
for it, rather than reading a caption that would sit there forever
([`deferred-feature-placeholders`](/.cursor/rules/deferred-feature-placeholders.mdc)). The message is a
single-acknowledge dialog; extend `ConfirmDialog` if it cannot yet express one action.

### Utility row (fixed, bottom of the player region)

Three controls: **sleep timer**, **playback speed** (showing the current rate), **More**.

Share, Up next, and V4V move out of this area — they are top-row icons or More-sheet rows now — so
the row matches the screenshot's moon / `1X` / `•••`.

### Panels become sheets

Sleep timer, speed, and Up next are inline expanding panels today. Inside a fixed-height player
region an inline panel would resize the region and defeat [747](747-player-screen-layout-and-scroll.md),
so all three move into the existing `MoreMenu` bottom-sheet pattern. This is the change that makes
the fixed region possible; it is not cosmetic.

### More sheet

Legacy parity, nothing more:

- Subscribe / Unsubscribe — `subscriptionsRepository`, membership gate as on podcast detail
- Mark as played / unplayed — `useQueueMutations().markAsPlayed`, same gate as row actions
- Cancel

No create-clip row here: the placeholder lives on the icon that owns the affordance, and answers there.

Deliberately **not** added: go-to-episode, go-to-podcast, download, queue actions. They are all
reachable elsewhere and the operator asked for parity with the previous generation. The device volume
slider is deferred — [751](751-defer-player-volume-slider.md).

## Acceptance criteria

- Top row renders dismiss, create clip, add to playlist, share, queue, and V4V when the item has value
  tags.
- Add to playlist, share, and queue perform their real actions.
- Pressing create clip shows a "not available yet" message that a screen reader announces; dismissing
  it leaves playback, queue, and stored state untouched.
- Utility row shows the sleep-timer glyph, the live playback rate, and More.
- Sleep timer, speed, and Up next open as sheets; the player region height never changes when they
  open or close.
- More sheet subscribes / unsubscribes and marks played / unplayed against the now-playing item, with
  the same gating and notice copy those actions use elsewhere.
- Every control has an accessible name; 44pt minimum targets.

## Web parity references

- Web player modal secondary button row (`apps/web/src/components/MediaPlayer/Modal/MediaPlayerButtonsModal.tsx`)

## Verification

`npm run mobile:e2e:test -- player-screen`.
