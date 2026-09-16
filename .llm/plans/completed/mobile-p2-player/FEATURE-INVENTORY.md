# P2.1.4 Player — feature inventory

Check-later list for the full player and mini player. Status key is in
[00-SUMMARY.md](00-SUMMARY.md). `expected` is the agent's guess, not a locked decision.

Where a row also appears in § Decided in this pass, that table wins — it carries the operator's
answer and the detail doc that owns the work.

## Already in nextgen (`have`)

| Item                                                              | Notes                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Mini player: art, title, channel, play/pause, thin progress       | Hidden when nothing is playing                                        |
| Mini expand → full player                                         | Same `usePlayback()` session                                          |
| Full: large art + lightbox (`CoverImage`)                         | Video overlays the same surface                                       |
| Single native video surface re-parent (mini ↔ full)               | Must not remount the engine                                           |
| Title + channel title                                             | From `nowPlaying`                                                     |
| Tap-to-seek scrubber + elapsed / duration clocks                  | No drag yet; `adjustable` a11y on the scrubber                        |
| Play / pause                                                      |                                                                       |
| Skip to next (queue / auto-queue)                                 | `skipToNext` in `PlaybackProvider`                                    |
| Up Next panel: manual upcoming + auto-queue                       | Empty copy when neither has rows                                      |
| Playback speed panel (0.5–2.0, web labels)                        | Session-only; not persisted                                           |
| Sleep timer panel (Off / 15 / 30 / 60)                            | Session-only; pause only; no fade, no end-of-episode                  |
| OS share of now-playing URL                                       | Disabled when no share URL                                            |
| Config-gated V4V entry                                            | Phase 3 owns the destination                                          |
| Chapters + official soundbites list                               | Hidden when the item has neither; tap starts bounded playback         |
| Tablet two-column layout                                          | Art left, controls right                                              |
| Android hardware Back closes full player                          |                                                                       |
| Idle state when nothing is playing                                | Full player still opens; shows idle copy                              |

## Transport the agent expects (`expected`)

These are the biggest gaps vs legacy and vs web desktop.

| Item                                                              | Why it is on this list                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Skip / jump back N seconds                                        | Legacy + web desktop; nextgen has none                                |
| Skip / jump forward N seconds                                     | Same                                                                  |
| Skip to previous (queue / chapter start)                          | Legacy previous-or-restart-track; nextgen has no `skipToPrevious`     |
| Drag-to-scrub (not tap-only)                                      | Current scrubber is `onPress` + `locationX`                           |
| Configurable jump interval                                        | Legacy Settings → Player; nextgen has no player settings              |
| Buffering / loading indicator on play                             | Legacy shows a spinner while buffering                                |
| Live-item chrome (hide seek / jumps; live badge)                  | Livestream playback exists; full-player chrome does not special-case  |

## Secondary actions the agent expects (`expected`)

| Item                                                              | Why it is on this list                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Navigate to episode / podcast from player                         | Title / art tap or header action                                      |
| Add now-playing to a playlist                                     | Legacy header + web modal                                             |
| Subscribe / unsubscribe from the player                           | Legacy more-sheet                                                     |
| Mark as played / unplayed                                         | Legacy more-sheet; membership-gated on web/legacy                     |
| Download now-playing from the player                              | Row actions exist elsewhere; not on the player                        |
| More / overflow sheet for the secondary actions                   | Legacy `PlayerMoreActionSheet`                                        |
| Share sheet that can pick podcast / episode / clip / chapter      | Legacy share action sheet; nextgen shares one URL                     |
| Chapter artwork swapping the hero image                           | Legacy carousel viewer does this                                      |
| Current chapter title on the player                               | Legacy shows chapter as the clip/title overlay                        |
| Clip / chapter time range on the player                           | Legacy carousel viewer time line                                      |
| Episode summary / show notes on the player                        | Legacy carousel slide                                                 |
| Persistent playback rate (not session-only)                       | Web + legacy remember speed                                           |
| Sleep timer: remaining countdown while running                    | Nextgen has no remaining display                                      |
| Sleep timer: custom duration (not only 15/30/60)                  | Legacy is a time picker on its own screen                             |
| Sleep timer: end-of-episode / fade-out modes                      | Nextgen comment says these are intentionally absent                   |

## Mini player extras (`expected`)

| Item                                                              | Why it is on this list                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Mini skip / jump controls                                         | Today: play/pause only                                                |
| Mini skip-next                                                    |                                                                       |
| Mini close / stop (clear now-playing)                             |                                                                       |
| Mini swipe-to-dismiss                                             | Common podcast-app pattern; not in legacy                             |

## Music / video variants (`decide`)

| Item                                                              | Notes                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Repeat (off / queue / track)                                      | Legacy music + web modal                                              |
| Shuffle                                                           | Web modal                                                             |
| Alternate enclosure picker                                        | Web modal                                                             |
| Playback-mode / video-vs-audio switch                             | Web `PlaybackModeButton`                                              |
| Music previous/next as track skip (not chapter skip)              | Legacy branches on medium                                             |

## Settings that affect the player (`decide`)

Not the player screen itself. Flag so we do not forget them if chrome depends on them.

| Item                                                              | Notes                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Jump-back / jump-forward interval prefs                           | Legacy Settings → Player                                              |
| Maximum playback speed                                            | Legacy Settings → Player                                              |
| Hide playback-speed button                                        | Legacy Settings → Player                                              |
| Remote / lock-screen skip uses jump interval                      | Legacy `setRemoteSkipButtonsTimeJumpOverride`                         |
| Preset podcast start time (`StartPodcastFromTimeScreen`)          | Per-podcast skip-intro; no nextgen equivalent                         |

## Explicitly out of this area (`out`)

| Item                                                              | Where it lives                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Make Clip / clip authoring                                        | Split; own later area                                                 |
| Player-integrated transcript (sync highlight, scrubber coupling)  | Detail 598                                                            |
| V4V boost / Alby / streaming sats                                 | Phase 3                                                               |
| Cross-app comments / live chat in the player                      | Detail 894; legacy carousel had comments + chat slides                |
| Pixel drag-and-drop queue polish                                  | Detail 599                                                            |
| Tablet left-rail / missing mini on tablet layouts                 | Detail 896                                                            |

## Quality bars (apply to whatever we add)

| Item                                                              | Notes                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Screen-reader names, roles, and state on every new control        | Media player is the weakest a11y surface today                        |
| i18n for every new string                                         | Shared / consumer keys first                                          |
| Shared primitives (`Button`, `HeaderBar`, `MoreMenu`, rows)       | Do not rebuild chrome on the player                                   |
| Idle / nothing-playing / offline / live empty paths               | Do not only build the happy audio-podcast path                        |
| E2E: expand mini → full, play/pause, seek, skip, speed, sleep     | Extend `play-mini-player` / add a focused player flow                 |

## Decided in this pass

From the player-screen screenshot batch. Detail docs own the work; decisions are numbered in
[00-SUMMARY.md](00-SUMMARY.md).

| Item                                              | Status | Owner                                            |
| ------------------------------------------------- | ------ | ------------------------------------------------ |
| Scrollable player screen with peeking chips        | `add`  | [747](/docs/proposals/mobile/_master-plan_/phase-2/details/747-player-screen-layout-and-scroll.md) |
| Fixed-height rows + flexible viewer               | `add`  | 747                                              |
| Measured, capped square artwork                    | `add`  | 747                                              |
| Sticky chips + condensed now-playing bar          | `add`  | 747                                              |
| Chapter artwork swapping the hero image           | `add`  | 747                                              |
| Current chapter / clip title on the player        | `add`  | 747                                              |
| Tablet two-column layout                          | `out`  | 747 — retired in favor of one column             |
| Jump back / forward                               | `add`  | [748](/docs/proposals/mobile/_master-plan_/phase-2/details/748-player-transport-parity.md) |
| Skip to previous (chapter-aware)                  | `add`  | 748                                              |
| Live chrome hides seek / jumps / previous         | `add`  | 748                                              |
| Configurable jump interval                        | `decide` | Later — no pref, no storage, in this area      |
| Top action row (dismiss / playlist / share / queue / V4V) | `add` | [749](/docs/proposals/mobile/_master-plan_/phase-2/details/749-player-action-rows-and-more-sheet.md) |
| Create-clip placeholder (answers on press)        | `add`  | 749 — amends the Make Clip lock-out              |
| Utility row (sleep / speed / More)                | `add`  | 749                                              |
| Sleep timer, speed, Up next become sheets         | `add`  | 749                                              |
| Subscribe / unsubscribe from the player           | `add`  | 749                                              |
| Mark as played / unplayed from the player         | `add`  | 749                                              |
| More / overflow sheet                             | `add`  | 749                                              |
| Device volume slider                              | `out`  | [751](/docs/proposals/mobile/_master-plan_/phase-2/details/751-defer-player-volume-slider.md) |
| Navigate to episode / podcast from the player     | `out`  | 749 — parity only; reachable elsewhere           |
| Download from the player                          | `out`  | 749 — same                                       |
| Section chips (summary / clips / chapters / official clips / transcript) | `add` | [750](/docs/proposals/mobile/_master-plan_/phase-2/details/750-player-section-chips-and-panes.md) |
| Episode summary on the player                     | `add`  | 750                                              |
| Plain transcript pane on the player               | `add`  | 750 — 598 keeps the coupling deferred            |
| Chip selection shared with episode detail         | `add`  | 750                                              |
| Legacy swipe carousel + page dots                 | `out`  | 750 — vertical scroll + chips instead            |

## Operator additions

Add rows here as the operator names them.

| Item | Status | Notes |
| ---- | ------ | ----- |
|      |        |       |
