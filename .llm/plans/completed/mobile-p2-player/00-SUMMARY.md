# Phase 2 — Player & now playing (P2.1.4)

Execution order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Prompts:
[COPY-PASTA.md](COPY-PASTA.md) · Inventory: [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md)

**Nextgen code today:** `apps/mobile/src/screens/player/`, `apps/mobile/src/components/player/`,
`apps/mobile/src/playback/PlaybackProvider.tsx`

**Legacy reference:** `../podverse-rn/src/screens/PlayerScreen.tsx`, plus `PlayerControls` /
`MediaPlayerCarousel` / `PlayerMoreActionSheet`

**Details:** [747 layout & scroll](/docs/proposals/mobile/_master-plan_/phase-2/details/747-player-screen-layout-and-scroll.md)
· [748 transport](/docs/proposals/mobile/_master-plan_/phase-2/details/748-player-transport-parity.md)
· [749 action rows & More](/docs/proposals/mobile/_master-plan_/phase-2/details/749-player-action-rows-and-more-sheet.md)
· [750 chips & panes](/docs/proposals/mobile/_master-plan_/phase-2/details/750-player-section-chips-and-panes.md)
· [751 volume deferral](/docs/proposals/mobile/_master-plan_/phase-2/details/751-defer-player-volume-slider.md)

## Locked decisions

Each entry is the operator's answer plus why. Do not deviate without asking.

### Layout and scroll

1. **The player screen scrolls.** The player region is a fixed height — viewport minus a peek band —
   so the section chips are visible peeking above the bottom edge on first open. That peek is the
   affordance; nothing else announces scrollability.
2. **Only the viewer flexes.** Segment title, episode title, channel title, and artwork live in the
   flexible middle. Progress, transport, and utility rows are the same height on every device, so
   loading data can never move a control under the user's thumb.
3. **Artwork is a measured, capped square.** Largest square that fits the leftover box, capped at
   420dp phone / 520dp tablet; leftover height becomes breathing room, not a bigger image. Same idea
   as web's `useModalArtworkSquareSize`, computed from constants instead of observed.
4. **Chips stick; a condensed bar joins them.** Scrolling past the player pins the chips row to the
   top, and a compact artwork + title + play/pause bar appears with it so transport stays reachable.
5. **One column everywhere.** Tablets get a larger cap and a wider max content width. The existing
   two-column tablet branch and its `full-player-two-column` E2E assertion retire — one layout is one
   set of jump bugs, not two.

### Viewer behavior

6. **Video letterboxes inside the fixed square.** Never crop, never resize the box for an aspect
   ratio. Web can afford to size its stage once the ratio is known; here that would move every row
   below the viewer, which is what decision 2 exists to prevent.
7. **Artwork keeps its lightbox; titles are not links.** Tapping artwork opens the existing
   `CoverImage` viewer. The player stays inside legacy parity, so there is no navigate-to-episode tap.
8. **Long episode titles marquee on one line, and hold still under reduce-motion.** Matches the mini
   player. Constant sideways motion directly above a scrubber is what the OS reduce-motion setting is
   for, so honor it rather than animating regardless.

### Controls

9. **Top row keeps the legacy icon set** — dismiss, create clip, add to playlist, share, queue — plus
   the config-gated V4V entry when the item has value tags.
10. **Working actions are wired, not stubbed.** Add to playlist, share, and queue do their real work.
    Only **create clip** is a placeholder, because clip authoring does not exist on mobile at all.
11. **The create-clip placeholder answers when pressed.** The scissors looks and behaves like a
    control; pressing it shows a "not available yet" message and changes nothing — no disabled icon,
    no standing caption. People learn a feature is unavailable by reaching for it, which is now the
    house rule ([`deferred-feature-placeholders`](/.cursor/rules/deferred-feature-placeholders.mdc)).
    This **amends** the earlier decision that kept Make Clip off the player entirely; clip authoring
    is still its own later area.
12. **Five transport controls:** previous, −10, play/pause, +30, next. Previous is chapter-aware, and
    `PlayerTransportButton` keeps owning loading and error/retry.
13. **Jump interval is 10 back / 30 forward on mobile and web.** `MEDIA_JUMP_BACK_SECONDS` in
    `@podverse/helpers` moves from 15 to 10, so web's jump buttons change with mobile instead of
    drifting from it. No preference and no player settings row yet.
14. **Utility row is the legacy three:** sleep timer, playback speed, More. Share and queue moved to
    the top row; V4V is top row too.
15. **Sleep timer, speed, and Up next become sheets.** Inline panels would resize the fixed player
    region, which is the whole thing decision 2 protects.
16. **More sheet is legacy parity only:** Subscribe / Unsubscribe, Mark as played / unplayed, Cancel.
    No go-to-episode, download, or queue rows — they exist elsewhere and the operator asked for
    parity, not a superset.
17. **The device volume slider is deferred** —
    [751](/docs/proposals/mobile/_master-plan_/phase-2/details/751-defer-player-volume-slider.md).
    Expo has no system-volume API, so it needs a native module and a dev-client rebuild. Not shipped
    as a placeholder either; it arrives working or not at all.

### Content below the player

18. **Chips reuse the episode tab set** — Summary, Clips, Chapters, Official clips, Transcript — with
    the same evidence-based visibility episode detail uses.
19. **Selection is shared with episode detail.** One `item:`-scoped pref, device-local, so a user who
    picks Chapters in the player finds Chapters on episode detail.
20. **Pane loading is extracted, not copied.** Episode detail's per-tab loader becomes a shared hook
    both screens call, in the same change that adds it.
21. **Transcript ships as a plain pane.** Follow-along highlight and scrubber coupling stay deferred
    in [598](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md).
22. **Pane content may jump on a chip press.** The player region above it may not.
23. **A new episode resets the section.** When the now-playing item changes, scroll back to the player
    and load the new item's remembered chip — otherwise the pane keeps describing an episode that is
    no longer playing.
24. **No item, no scroll.** Add-by-RSS and item-less livestreams collapse the peek and show no chips.

### Carried forward from the earlier notes

25. **Clip authoring is its own later area** (amended by decision 11 for the placeholder only).
26. **V4V stays a config-gated entry.** Boosts and streaming sats are Phase 3.
27. **The single native surface stays.** Mini ↔ full re-parents one `VideoSurfaceHost`; expanding must
    never remount a second engine.

## Inventory status values

| Status     | Meaning                                                             |
| ---------- | ------------------------------------------------------------------- |
| `have`     | Already in nextgen; protect, do not regress                         |
| `expected` | Agent expects this on a finished player; operator has not confirmed  |
| `decide`   | Real product choice; do not implement until the operator says so    |
| `out`      | Locked out of this area                                             |
| `keep`     | Operator confirmed it belongs                                       |
| `add`      | Operator asked to add it; not implemented yet                       |
| `done`     | Implemented in this area                                            |
