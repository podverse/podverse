---
name: mobile-playback
description: Map web playback policy to NativePlaybackBridge and podverse-media-engine — playback-core, queue/auto-queue parity, seamless video reparenting, background Now Playing. Do not use react-native-track-player.
---

# Mobile playback and queue parity

Use when implementing or changing **mobile playback**, **queue advance**, **auto-queue**, or the
**native bridge** under `apps/mobile/`.

## When to use

- Play/pause/seek/skip/load from RN screens
- Queue now-playing updates, ended/skip orchestration, auto-queue advance
- Mini player ↔ full player **video** transitions
- Background audio, lock-screen controls, writing the **native car cache**
- Wiring `@podverse/playback-core` after PG-1 extraction

## Stack map (web → mobile)

| Web layer     | Location                                                 | Mobile equivalent                                                       |
| ------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Policy (pure) | `apps/web/src/lib/playback/` → `@podverse/playback-core` | **Same** `@podverse/playback-core` functions                            |
| Bridge        | `useMediaElementBridge`, `mediaElementBridgeSurface.ts`  | **`NativePlaybackBridge`** TS module → `podverse-media-engine`          |
| Controls      | `useMediaPlayerControls()`                               | RN controls store/hook exposing `seek`, `loadAndStart`, `pauseAt`, etc. |
| Orchestration | `NonLiveMediaOrchestrator`, ended handlers               | RN orchestrator hook on engine **ended** events                         |
| Queue load    | `useQueueResourcesLoadActive`, queue wrappers            | Same `req*` from `@podverse/helpers-requests`                           |
| Auto-queue    | `AutoQueue.tsx`, `useAutoQueueLoadResources`             | Same API calls; device prefs instead of cookies (`aqc.rd` / `aqc.rp`)   |

Read web hooks first for behavior; reuse wrappers and policy — replace only transport and UI.

## Media engine (Track 2)

**Do not use `react-native-track-player`.** Podverse uses **`apps/mobile/modules/podverse-media-engine/`**:

- **One shared native player** per session (AVPlayer iOS / ExoPlayer Android)
- Background survival via native audio session + Android foreground **MediaSessionService**
- Lock screen / headset: `MPNowPlayingInfoCenter` + `MPRemoteCommandCenter` (iOS), MediaSession (Android)
- Bridge methods (Track 2): `load`, `play`, `pause`, `seek`, `setRate`, `getPosition`, `getDuration`, `destroy`

`NativePlaybackBridge` is the **only** place RN should imperatively drive the engine — parallels ESLint
guards on web's bridge (see **media-player-architecture**).

## Playback policy flow

```text
Play action → RN resource-update hook
  → resolvePlaybackLoadDecision (@podverse/playback-core)
  → NativePlaybackBridge.loadAndStart (or seek/pauseAt per decision)
  → podverse-media-engine
```

Handle every `PlaybackTarget.kind` (`item-podcast`, `item-video`, `item-music` + `intent`, `clip`,
`soundbite`, `chapter`, `add-by-rss`). Defer `livestream` (native HLS, separate effort).

Reference: [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md §5–10](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md).

## Queue + auto-queue on ended/skip

1. Move now-playing to history (same POST wrappers as web).
2. If manual upcoming has items → load next manual item.
3. Else increment auto-queue row → load prefetched resource (playlist or channel sources unchanged).
4. Run `playback-core` decision → bridge `loadAndStart`.
5. **Write native cache snapshot** (feeds CarPlay/Android Auto — **mobile-carplay-android-auto** rule).

**Step 1 comes before the queue read, and the order is load-bearing.** The next thing to play is the
queue's own first row (`combineQueueNowPlayingAndUpcoming` → `activeResource`), so a queue read taken
before the finished resource leaves it returns that same resource — it is still now-playing, or it
still sits upcoming when playback started from a detail screen rather than from the queue. Advancing
then restarts the track that just ended, and because the title never changes, a flow asserting "the
track is showing" passes while the product loops. Web orders these the same way
(`NonLiveMediaOrchestrator` `onEnded`).

**Read the queue for the medium of what was playing**, not whichever queue is active
(`getQueueForMedium(queues, target.channel.medium_id)`). Starting a track leaves the previous
medium's queue active until the new claim lands, so the active queue answers for the wrong medium —
skipping into a podcast from music, or finding nothing and stopping. Add-by-RSS has no channel and no
queue behind it and falls back to the active queue.

Web reference hooks: `useQueueResourceMoveNowPlayingToHistory`, `useMediaPlayerControllerQueueHeadLoading`,
`combineQueueNowPlayingAndUpcoming` (moving to playback-core).

## Same-item multi-device adoption

This reads like a bug to anyone meeting it cold. It is not. Do not "fix" it into a prompt.

- **Same item** both sides, remote newer, nothing playing locally → the position is adopted
  **silently**, no prompt. Settled in
  [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)
  (`Status: done`), with "no prompt" as an acceptance criterion.
- **Different item** → the handoff prompt, because only that case has an answer the app cannot
  derive.
- Both branches come from `resolveHandoffDecision` in `@podverse/helpers`, which web consumes too.
  Changing either changes both surfaces and contradicts a `done` detail. That needs an operator
  decision and an amendment first.

A deliberate local scrub writes a newer meaningful event, so `shouldAdoptRemotePosition` declines
and the playhead is not yanked forward.

## Last-playback snapshot (cold-start restore)

Mobile keeps a **universal** device-local now-playing snapshot in AsyncStorage
(`pv_mobile_last_playback` via `apps/mobile/src/lib/playback/lastPlaybackStorage.ts`). It sits
**outside** the account queue / history system:

| Event                                                        | Snapshot behavior                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Play / progress (throttled) / pause / background             | Write for every auth status; near-end positions clear instead of storing `0` |
| Item completes (`advance('complete')`) or now-playing clears | Clear                                                                        |
| Sign-in (`anonymous` → `authenticated`)                      | Clear — the account's server queue is authoritative                          |
| Sign-out                                                     | Leave alone — local playback keeps rewriting it                              |
| Cold start (`status !== 'unknown'`)                          | Restore once per process, **paused**, mini player visible — load, never play |

Restore is cache-first (`getLocalChannelForItem` before network) and logs failures in `__DEV__`.
`autoPlayOverride: false` uses native `load` (not `loadAndStart`). iOS `setRate` must **not** assign
`AVPlayer.rate` while paused — a non-zero rate starts audio. Store the rate and apply it on `play`.
Web deliberately differs: signed-in users hydrate from the server queue; only anonymous users use
`pv_web_anonymous_last_playback`. Do not merge those models.

## Seamless video (mini ↔ full player)

One **persistent native video surface** for the playback session. Mini and full player screens register
**target layout rects** (x, y, width, height, corner radius); the engine **reparents** the same native
view — **no player remount** on expand/collapse.

- iOS: `AVPlayerLayer` in engine-managed overlay
- Android: Media3 `PlayerView` / `SurfaceView` on the single ExoPlayer instance
- RN renders transparent placeholders; native module positions the surface above them
- Audio-only: same engine, no visible surface

The old pattern of recreating the player on full-screen open is **forbidden** (master plan Track 2
seamless video architecture).

## Native car cache writes

Whenever queue, auto-queue, or downloads metadata changes, JS must update the native cache so car
surfaces work app-closed. Schema: Track **12.1**; implementation steps **10.22**, **12.4**, **2.35**.

## Player transport button (mini + full only)

The mini player and full player share one transport control (`PlayerTransportButton` +
`transportState` from `usePlayback()`):

| Engine / load                 | Glyph      | Press                                              |
| ----------------------------- | ---------- | -------------------------------------------------- |
| Playing                       | Pause icon | Pause                                              |
| Paused / ready / idle / ended | Play icon  | Resume                                             |
| Source not playable yet       | Spinner    | None                                               |
| Error                         | Error icon | Retry (`retryPlayback` reloads the current source) |

The glyph and its accent color match list rows and detail chrome; `appearance` decides the frame.
The full player uses `ring` — the same bordered play circle as those rows. The mini player uses
`bare`, because the bar is already its own surface and a ring inside a 56px strip crowds the artwork
and titles it sits beside; a bare glyph there takes the larger icon size bare row controls use.
Neither ever wears a filled/primary face that would read as a different kind of button.

**The spinner means "this source cannot start yet", never "buffering".** It shows between a load
starting and the engine reporting the source playable, and `playbackTransport.ts` gates it on that:
once the source is playable, later `loading` / `stalled` events keep the play/pause mark, because
there is already enough media to play and a spinner flickering over the control the listener is
aiming at is worse than silence about the network. A load resolving also clears the spinner on its
own, so a missing engine state event cannot leave it spinning forever.

The mini player's elapsed/remaining glance is the **top edge** of the bar — a flush 2px
`ProgressTrack`, not a separate bar and not a second `borderTop`. The full player's scrubber stays
a dedicated seek control.

**Do not** put loading spinners or error/retry glyphs on list-row or detail-screen play buttons
(`MediaRowActions`, episode play chrome). Those surfaces stay play/pause. The mini player and full
player already own buffering and failure, and repeating that on every row is redundant rendering.

## Full player fixed region + panes

`FullPlayerScreen` is a `SectionList` scroll shell with a fixed-height player region, sticky chips
(no hairlines, chips vertically centered in that band),
and a condensed now-playing bar that appears once the region scrolls away.
`FULL_PLAYER_REGION_BOTTOM_PADDING` separates the utility row from those chips. First paint peeks
the measured chip strip plus the bottom safe-area inset (covered by a bottom fill, not header
padding) — Summary copy and list rows require a scroll. The artwork is the band that gives way, so
short viewports and large OS text sizes shrink the square instead of moving the chips.

- Use `resolveFullPlayerLayout` / `resolveCondensedState` in
  `apps/mobile/src/screens/player/fullPlayerLayout.ts` for all region math.
- Keep transport controls on shared constants from `@podverse/helpers`
  (`MEDIA_JUMP_BACK_SECONDS` = 10, `MEDIA_JUMP_FORWARD_SECONDS` = 30).
- Previous/next match web: tap is chapter-aware for whole-item playback (`skipToPrevious` /
  `skipToNext`); when chapters exist, a 500ms hold skips the episode (`skipToPreviousTrack` /
  `skipToNextTrack`). Clip and soundbite targets never use chapter prev/next.
- Jump back/forward use circular rotate glyphs (`FontAwesome6` `rotate-left` /
  `rotate-right`), matching web's `FaRotateLeft` / `FaRotateRight`.
- Pane loading and chip visibility come from `useEpisodeSectionPanes` so episode detail and full
  player stay in lockstep on Summary, Clips, Chapters, Official clips, and Transcript. A chip tap
  swaps the pane only; it does not scroll.
- Sleep timer, playback speed, up next, and More actions open sheets (`MoreMenu` surfaces), not
  inline expansion.

The contract for this area is enforced by
[`mobile-player-fixed-region`](/.cursor/rules/mobile-player-fixed-region.mdc): only the viewer band
flexes; everything else keeps a fixed reserved height.

### Playhead progress store

Native `progress` events write samples into `playbackProgressStore`. While playing, the store
interpolates those samples at **1 Hz** so clocks and fill keep moving when the engine is quiet
(typical after a seek). Leaf chrome reads via `usePlaybackProgress` / `usePlaybackPositionClock` /
`usePlaybackProgressRatio` (`useSyncExternalStore`). **Do not** put position/duration in
`PlaybackProvider` React state, and **do not** call `usePlayback()` from the full-player shell,
mini-player shell, or other screens that only need session actions — use `usePlaybackSession()` so a
ticking playhead cannot re-render a `SectionList` once a second.

The native event sink is **owner-scoped** (`setEventSink` / `clearEventSink(owner)`). Fast Refresh
must not let an old module's `OnDestroy` clear a newer module's sink. On mount, foreground, and when
the engine publishes `ready` / `playing`, `PlaybackProvider` reconciles from `getPosition` /
`getDuration`. iOS and Android also emit one `progress` sample when the item becomes ready so
duration lands before the periodic tick. Play paths seed duration from `item.item_about.duration`
(`resolveMediaFileDurationHintSeconds`) when the caller did not supply a hint; native
`durationSeconds > 0` still wins.

### Chapter-aware scrubber

`FullPlayerScrubber` is the only full-player progress leaf: drag/tap seek on the **line** (no thumb;
the hit target is 44pt around a 6pt track), chapter boundary ticks (`getChapterBoundaryRatios` from
`@podverse/playback-core/chapterProgressMarkers`), active chapter/clip/soundbite highlight, long-press
chapter tooltip (~500ms / 2s dismiss), and hour-aware clocks (`formatHHMMSS`, same helper as web).
Chapter artwork uses `shouldUseChapterArtwork` on
`FullPlayerArtwork` / `MiniPlayerArtwork`. Chapters for chrome come from `useNowPlayingChapters`
(process-wide cache) plus `useActiveNowPlayingChapter` in leaves only.

### Full player chrome conventions

The player region reads as one centered column, and the transport it presents is the app's largest
touch target because it is the one a listener reaches for without looking.

- **Centered text.** Segment, episode title, and channel title are centered. Episode + channel share
  one title block (`FULL_PLAYER_TITLE_BLOCK_HEIGHT`) with a tight internal gap — not two bands
  separated by `FULL_PLAYER_REGION_GAP`. The title is a `MarqueeText align="center"`, so it centers
  when it fits and scrolls from the leading edge only when it overflows.
- **Band order follows web.** Title block, artwork, segment band, progress, transport, utility — the
  same order as web's player modal (`titleSection`, art, `subtitleSection`). The segment band names
  the chapter, clip, or official clip **below** the artwork and always holds
  `FULL_PLAYER_SEGMENT_BAND_HEIGHT`, the way web always renders `subtitleSection` with
  `--media-modal-subtitle-reserve`. A chapter starting mid-episode must fade its name into space that
  already exists; never mount or unmount the row.
- **Equal-width slots.** The transport row's five controls and the utility row's three each sit in
  `flex: 1` slots with `flexDirection: 'row'` + `justifyContent: 'center'`. Main-axis centering is
  required because `Button` sets `alignSelf: 'flex-start'`, which would otherwise pin every control
  to the leading edge of its slot. Do not use `justifyContent: 'space-between'` here — unequal
  control widths shift the center control off-axis.
- **Split seam values.** Upper bands (title → artwork → segment → progress) use
  `FULL_PLAYER_REGION_GAP` (`FULL_PLAYER_REGION_GAP_COUNT` = 3). Progress → transport and
  transport → utility use the tighter `FULL_PLAYER_CONTROL_STACK_GAP` (8pt,
  `FULL_PLAYER_CONTROL_STACK_GAP_COUNT` = 2), matching web's modal progress-to-controls spacing.
  Math and styles share those constants so reserved and rendered space cannot drift.
- **Duration seed before native metadata.** `resolveMediaFileDurationHintSeconds` seeds the progress
  store from `item.item_about.duration` on every play path so clocks and seek work before AVPlayer /
  ExoPlayer report a finite duration. Native `durationSeconds > 0` overwrites the hint. The left
  clock always shows the playhead (`usePlaybackPositionClock`); seek stays gated on duration `> 0`.
- **Control sizes come from constants.** `FULL_PLAYER_TRANSPORT_ICON_SIZE`,
  `FULL_PLAYER_UTILITY_ICON_SIZE`, and `Button` size `xl`
  (`PLAYER_TRANSPORT_CIRCLE_SIZE`) — not per-callsite numbers.
- **Jump controls are circular rotate glyphs.** Jump back and forward use
  `FontAwesome6` `rotate-left` / `rotate-right` (same shapes as web `FaRotateLeft` /
  `FaRotateRight`), with the interval in the accessibility label; they do not print `-10` /
  `+30` as their face.
- **Previous/next are chapter-aware.** Tap steps chapters when the episode has them; a hold (500ms)
  skips the episode. Without chapters, previous restarts past 3s or else skips to the prior queue
  item, and next skips the queue.
- **Rate is plain text.** Playback speed is a `ghost` label with no fill or border, so it does not
  read as a second primary action beside the play circle.
- **Chips share the screen background.** The sticky header is opaque in the screen's own background
  color, never a tinted band, and a selected chip is the label for the pane below it — panes do not
  repeat it as a heading.
- **Flush slide-up.** Root slide-up screens (`FullPlayer`, `V4vInfo`) import
  `ROOT_SLIDE_UP_SCREEN_OPTIONS` from `apps/mobile/src/navigation/slideUpScreen.ts` (`card` +
  `slide_from_bottom` + vertical **edge** gesture). Duration is `ROOT_SLIDE_UP_ANIMATION_MS` —
  the same number the mini↔full video surface reparent uses. Do not use `presentation: 'modal'`
  (iOS page sheet) and do not invent a second duration. Set `fullScreenGestureEnabled: false` so
  pull-to-dismiss starts only from the top edge — a full-screen swipe fights the player's scroll.
- **No list bounce.** The full player's `SectionList` keeps `bounces` / `alwaysBounceVertical` off
  and `overScrollMode="never"`. There is no pull-to-refresh on that screen, so rubber-banding at
  the top must not steal the dismiss gesture or pull pane content away from the chips.

## Bottom chrome stack (phone and tablet)

The persistent bars below the app and above the tab bar are siblings in one column, outermost first:

1. `GlobalActivityBar` (sync progress, downloads)
2. `OfflineModeBanner`
3. `NowPlayingSegmentBar` (current clip / official clip / chapter)
4. `MiniPlayer`

Sync stays at the **top** of that stack on purpose: it appears and disappears on its own schedule, so
from there its arrival pushes only itself, and the mini player controls a listener is reaching for do
not move under their thumb. Keep the same order in the tablet bottom strip.

`NowPlayingSegmentBar` names itself from `activeTarget` for clip / official-clip / chapter playback,
and for whole-episode playback follows the chapter list against the playhead with
**`selectItemChapterForTime`** from `@podverse/playback-core` — the same selection web's player and
embed use, so the chapter named on mobile matches every other surface. Do not re-implement chapter
selection per surface.

The mini player's episode title is a `MarqueeText`: it scrolls itself only when the title does not
fit, and truncates instead under Reduce Motion.

## Do / don't

- **Do** call `@podverse/playback-core` for seek/resume/auto-play/`pauseAt` decisions.
- **Do** route UI actions through the mobile controls hook → bridge (not direct engine calls from screens).
- **Do** mirror web `req*` sequences for queue/playlist/auto-queue.
- **Don't** edit `useMediaElementBridge` for mobile behavior.
- **Don't** duplicate policy logic in RN or native Swift/Kotlin.
- **Don't** use Playwright or `make e2e_*` for mobile playback verification — Maestro/Detox (**mobile-e2e-screenshots**).
- **Don't** show loading or error on list/detail play controls — only mini player and full player.

## Related

- **media-player-architecture** — web non-live stack and decision matrix pointer
- **mobile-carplay-android-auto** — car native-only + cache contract
- [MEDIA-PLAYER-DECISION-MATRIX.md](/apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md) — behavioral reference
- Master plan **Track 2** (engine), **Track 10** (queue), **Track 11** (mini/full player UI)
