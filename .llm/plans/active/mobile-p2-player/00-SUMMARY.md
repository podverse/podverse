# Phase 2 — Player & now playing (P2.1.4)

Working notes while the operator dictates additions. Not an implementation plan yet.

**Inventory (check later):** [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md)

**Nextgen code today:** `apps/mobile/src/screens/player/`, `apps/mobile/src/components/player/`,
`apps/mobile/src/playback/PlaybackProvider.tsx`

**Legacy reference:** `../podverse-rn/src/screens/PlayerScreen.tsx`, `SleepTimerScreen.tsx`,
`StartPodcastFromTimeScreen.tsx`, plus `PlayerControls` / `MediaPlayerCarousel` /
`PlayerMoreActionSheet`

## Locked decisions

1. **Make Clip is out of this area.** Plan clip authoring as its own later area. Do not add a
   Make Clip control on the player as part of P2.1.4.
2. **Player transcript chrome stays deferred**
   ([598](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md)).
   Transcripts stay on episode detail, not in the player.
3. **V4V stays a config-gated entry only.** Boost / Alby / streaming sats belong to Phase 3.
4. **Single native surface stays.** Mini ↔ full re-parents one `VideoSurfaceHost`. Expanding must
   never remount a second engine.

## How to use the inventory

The operator will say what to add. When they do, mark the matching inventory row `keep` or `add`,
and drop or move anything they reject. Do not treat `expected` rows as committed work — they are
the agent's checklist of things a finished player usually has, so we can see what was skipped.

Status values on inventory rows:

| Status     | Meaning                                                              |
| ---------- | -------------------------------------------------------------------- |
| `have`     | Already in nextgen; protect, do not regress                          |
| `expected` | Agent expects this on a finished player; operator has not confirmed  |
| `decide`   | Real product choice; do not implement until the operator says so     |
| `out`      | Locked out of this area                                              |
| `keep`     | Operator confirmed it belongs                                        |
| `add`      | Operator asked to add it; not implemented yet                        |
| `done`     | Implemented in this area                                             |
