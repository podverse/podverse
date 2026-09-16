# 01 — Player layout math

Decisions 1–5 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[747](/docs/proposals/mobile/_master-plan_/phase-2/details/747-player-screen-layout-and-scroll.md)

Pure module and tests only. No screen changes. Everything the fixed region argues about — how tall the
player is, how big the artwork gets, when the condensed bar appears — is arithmetic, and it is far
easier to agree on it here than inside a `SectionList` render.

## Add `apps/mobile/src/screens/player/fullPlayerLayout.ts`

### Fixed block heights

Constants in this module, not scattered through styles. Names describe the band, not the pixel count.

| Band                        | Height                                                  |
| --------------------------- | ------------------------------------------------------- |
| Top action row              | One icon-button row                                     |
| Segment (clip/chapter) band | One line, reserved whether or not a segment is playing   |
| Episode title band          | One line (marquee lives inside it)                      |
| Channel title band          | One line                                                |
| Progress + timestamps       | Scrubber plus the elapsed/remaining row                 |
| Transport row               | One row of five controls                                |
| Utility row                 | One row of three controls                               |
| Peek band                   | Chips row plus a sliver of the pane beneath it          |

Reserve the segment band unconditionally. A band that only exists while a chapter is playing is a band
that moves the artwork every time one starts.

### `resolveFullPlayerLayout(input): FullPlayerLayout`

```typescript
type FullPlayerLayoutInput = {
  hasSections: boolean;
  isTablet: boolean;
  maxContentWidth: number;
  safeAreaBottom: number;
  safeAreaTop: number;
  viewportHeight: number;
  viewportWidth: number;
};

type FullPlayerLayout = {
  artworkSize: number;
  peekHeight: number;
  playerRegionHeight: number;
  viewerHeight: number;
};
```

- `playerRegionHeight` = viewport − safe areas − `peekHeight`.
- `viewerHeight` = that, minus every fixed band (action row, segment, episode title, channel title,
  progress, transport, utility) and the gaps between them.
- `artworkSize` = the largest square fitting `viewerHeight` and the content width, capped at the phone
  or tablet cap. Leftover space is breathing room — distribute it, do not grow the image past the cap.
- `peekHeight` is zero when `hasSections` is false, so an add-by-RSS or item-less livestream target
  fills the viewport with no dangling scroll.

Guard the degenerate inputs: a zero or negative `viewportHeight` (first frame, before `onLayout`)
returns zeroed values rather than negative heights, and a short viewport floors `artworkSize` at a
minimum rather than going negative. A landscape phone where the square would eat the whole height must
still leave the fixed rows intact — the artwork shrinks, the rows do not.

### `resolveCondensedState(input): boolean`

Hysteresis, so a fingertip resting near the boundary cannot strobe the condensed bar:

```typescript
type CondensedStateInput = {
  isCondensed: boolean;
  playerRegionHeight: number;
  scrollOffset: number;
};
```

Condense past `playerRegionHeight × enter`, restore below `× exit`, with `exit` meaningfully below
`enter`; otherwise keep the current value. Both fractions are named constants in this module.

## Tests

`apps/mobile/src/screens/player/fullPlayerLayout.test.ts`, risk-first per
**unit-test-priority-confident** — the arithmetic that can produce a negative height or a jumping
artwork, not every field:

- A phone viewport yields a positive region, a positive viewer, and an artwork at or under the cap.
- A tall tablet viewport hits the tablet cap and does **not** exceed it.
- A short viewport keeps every fixed band and floors the artwork instead of going negative.
- `hasSections: false` yields `peekHeight: 0` and a region equal to the usable viewport.
- Zero viewport height yields zeros, never negatives.
- `resolveCondensedState` holds its value between the two thresholds in both directions.

## Out of scope

No component touches this yet. Do not edit `FullPlayerScreen.tsx`, and do not move
`screenLayout.ts` constants that other screens use.
