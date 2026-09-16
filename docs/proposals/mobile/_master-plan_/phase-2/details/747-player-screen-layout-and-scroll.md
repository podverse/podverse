# 747-player-screen-layout-and-scroll

**Master step:** P2.1.4
**Model (author + implement):** Opus 5
**Status:** planned

## Scope

Rebuild the full player as a **scrollable screen with a fixed-height player region**. The player
region occupies the viewport minus a peek band, so the section chips are visible peeking above the
bottom edge on first open and the user knows there is more below. Scrolling lifts the player away;
the chips row sticks to the top and a condensed now-playing bar appears beside it.

Within the player region, only the **viewer** (segment title, episode title, channel title, artwork)
flexes. Every other block is a fixed height on every device, so no data arriving — chapter titles,
long episode titles, artwork swaps — can move a control the user is reaching for.

### Region contract

Top to bottom, inside the fixed-height player region:

| Block          | Height   | Contents                                                                   |
| -------------- | -------- | -------------------------------------------------------------------------- |
| Segment band   | fixed    | Active clip / chapter title, one line, blank when none                     |
| Episode title  | fixed    | `MarqueeText`, one line                                                    |
| Channel title  | fixed    | Accent color, semibold, one line                                           |
| **Viewer**     | **flex** | Square artwork + the shared native video surface, centered                 |
| Progress block | fixed    | Scrubber + position / duration clocks                                      |
| Transport row  | fixed    | Five controls ([748](748-player-transport-parity.md))                      |
| Utility row    | fixed    | Sleep timer, speed, More ([749](749-player-action-rows-and-more-sheet.md)) |

The top action row sits above the scroller and never scrolls
([749](749-player-action-rows-and-more-sheet.md)).

### Sizing

`apps/mobile/src/screens/player/fullPlayerLayout.ts` owns the math as a pure resolver so it is unit
testable and both phone and tablet go through one code path:

```text
playerHeight  = max(viewportHeight - peekHeight, fixedBlocks + gaps + artworkMin)
viewerHeight  = playerHeight - fixedBlocks - gaps
artworkSize   = clamp(min(contentWidth, viewerHeight), artworkMin, artworkMax)
artworkMax    = 420 phone / 520 tablet
```

One measurement feeds it: the scroller's viewport height from `onLayout`. Everything else is a
constant, so the artwork lands at its final size on the first paint after measurement — no
second-pass reflow, and no per-block measuring the way web's `useModalArtworkSquareSize` needs a
`ResizeObserver`. When the artwork is capped, the leftover viewer height becomes breathing room
above and below rather than growing the image.

### Viewer behavior

- **Video letterboxes inside the square.** Aspect ratio never crops the frame and never resizes the
  box. Web can size its stage once the ratio is known; here that would move every row below the
  viewer, which is the one thing this region exists to prevent.
- **Artwork keeps its `CoverImage` lightbox**; the titles are plain text, not navigation. The player
  stays inside legacy parity.
- **The episode title marquees on one line and holds still under reduce-motion.** Continuous sideways
  motion directly above a scrubber is exactly what the OS setting is for, so read it from the platform
  accessibility API rather than adding a preference.

### Scroll shell

`SectionList` with `stickySectionHeadersEnabled`:

- `ListHeaderComponent` — the player region at exactly `playerHeight`.
- Sticky **section header** — the chips row, plus the condensed now-playing bar once scrolled.
- Sections — the active pane ([750](750-player-section-chips-and-panes.md)); list panes render as
  rows so they virtualize, prose panes render in the section footer.

`SectionList` rather than a `ScrollView` with `stickyHeaderIndices` because the clips, chapters and
official-clips panes are user-data lists and must virtualize
([`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc)).

The condensed bar (artwork, title, play/pause) lives **inside** the sticky header, so it costs no
layout while the header is unpinned and cannot shift the player region when it appears.
`resolveCondensedState` applies hysteresis around the threshold so a slow drag cannot flicker it.

### When there is nothing to scroll to

Add-by-RSS playback and livestreams without an item have no chips and no panes. In that case the
peek band collapses to zero, the player region takes the whole viewport, and the screen does not
scroll. Same for the idle state when nothing is playing.

## Acceptance criteria

- On first open the chips row is visible peeking above the bottom edge; nothing is clipped.
- Chapter changes, long titles, and artwork swaps never move the scrubber, transport row, or utility
  row by a single pixel.
- Artwork is the largest square that fits the viewer box, capped, and centered.
- A video item letterboxes inside that square; the square's size is identical to an audio item's.
- With reduce-motion on, a long episode title truncates instead of scrolling.
- Scrolling past the player pins the chips row to the top with the condensed bar beside it; scrolling
  back restores the full player without a jump.
- One column on phones and tablets; tablets get the larger cap and a wider max content width. The
  two-column branch and its `full-player-two-column` E2E assertion are gone.
- Expanding from the mini player still re-parents the single native surface — no second engine.
- `resolveFullPlayerLayout` and `resolveCondensedState` have unit tests covering short phones, tall
  phones, tablets, landscape, and the collapse-the-peek case.

## Web parity references

- [`useModalArtworkSquareSize.ts`](apps/web/src/hooks/useModalArtworkSquareSize.ts) — the same
  "largest square in the leftover box" idea, measured instead of computed
- [`MediaPlayerInfoModal.module.scss`](apps/web/src/styles/components/MediaPlayer/Modal/MediaPlayerInfoModal.module.scss)
  — reserved title / subtitle bands as the anti-jump mechanism
- [`MediaPlayerModal.module.scss`](apps/web/src/styles/components/MediaPlayer/Modal/MediaPlayerModal.module.scss)
  — fixed control rows, flexible middle

## Verification

`npm run mobile:e2e:test -- player-screen` plus the mobile unit tier.
