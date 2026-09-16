# 04 — Fixed region and scroll shell

Decisions 1–8 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[747](/docs/proposals/mobile/_master-plan_/phase-2/details/747-player-screen-layout-and-scroll.md)

Rebuild `FullPlayerScreen` around step 01's math and step 03's rows: the player region becomes a fixed
height list header, the chips row peeks and sticks, and the condensed bar appears. Ship this with only
the Summary pane wired so the scroll behavior can be judged on its own; step 05 adds the rest.

## Screen structure

```
SectionList
  ListHeaderComponent  → player region (fixed height from resolveFullPlayerLayout)
  stickySectionHeadersEnabled
  section header       → chips row, plus the condensed bar once condensed
  section              → active pane
```

`SectionList` rather than `ScrollView` because the panes are user-data lists
([`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc)). The list owns the
scroll; the player region is its header, not a sibling.

## Player region internals

Top to bottom inside the fixed height, matching the region contract in detail 747: action row (above
the scroller), segment band, episode title, channel title, artwork, progress and timestamps, transport
row, utility row. The artwork is the flexible block; every band is its constant height.

- **Artwork** is a square of `artworkSize`, centered, with the existing
  `PodverseVideoSurfaceView targetId="full"` absolutely filling it exactly as today. Video
  **letterboxes** inside the square — never crop, never resize the box for an aspect ratio. Chapter
  artwork swaps the image source inside the same square.
- **Artwork keeps its `CoverImage` lightbox.** Titles are plain text, not links.
- **Episode title** is `MarqueeText` on one line inside a one-line band, held still when the OS
  reduce-motion setting is on. Read that setting through React Native's accessibility API; do not add a
  new preference.
- **Segment band** is reserved whether or not a clip or chapter is playing, so starting one moves
  nothing.

## Sticky header

`FullPlayerSectionHeader` renders the chips row, and when condensed also a compact artwork + title +
play/pause bar above them. Drive condensation from `resolveCondensedState` on scroll offset, so the bar
cannot flicker at the threshold.

The condensed bar reuses `PlayerTransportButton` — the same control, the same states. Two play buttons
with different loading behavior on one screen is a bug waiting to be filed.

## Peek

The region height already subtracts the peek band, so the chips sit visible above the bottom edge with
a sliver of pane beneath them on first open. Nothing else advertises scrollability — no arrow, no hint
text, no auto-scroll nudge.

When the target has no item (add-by-RSS, item-less livestream), `hasSections` is false: no chips, no
peek, no sections, and the region fills the usable viewport.

## Retire the two-column tablet layout

Delete the two-column branch, `styles.contentTablet`, `styles.controlsColumn`, and the
`full-player-two-column` assertion in the existing Maestro flow. Tablets take the one-column layout
with the larger artwork cap and wider max content width. One layout is one set of jump bugs.

## Orientation

Recompute on dimension change: layout math is a function of the viewport, so a rotation is new input,
not a special case. A landscape phone shrinks the artwork and keeps every fixed row — it does not drop
controls or switch layouts.

## Verification focus

What the operator should be able to see in the screenshots:

- Chips peek above the bottom edge on first open, on phone and tablet.
- Scrolling up pins the chips and reveals the condensed bar; scrolling back restores the player without
  flicker.
- Playing a chapter with its own artwork and a long title moves nothing below the viewer.
- A video item letterboxes inside the square rather than cropping or resizing it.

## Out of scope

Only the Summary pane is wired. Chip persistence, the other four panes, and the shared pane hook are
step 05.
