# `@podverse/playback-core`

Shared **pure** playback and queue policy extracted from the web media player. Both `apps/web` and
`apps/mobile` import this package; platform-specific bridges (DOM `HTMLMediaElement`, native
AVPlayer/ExoPlayer) stay in each app.

## What lives here

- `resolvePlaybackLoadDecision` and related types
- `PlaybackTarget`, `PlaybackLoadRequest`, `playbackTargetFromStandardLoad`
- Resume/seek helpers (`resumeSeekFromAbridged`, `clampNearEndSeconds`, `parsePlaybackSeconds`)
- Enclosure-switch policy helpers
- `combineQueueNowPlayingAndUpcoming`
- Auto-queue policy helpers (source choice, forward/backward walks, row mapping, playable-row
  checks, dedupe, and config transitions)
- Add by RSS list walk: build a feed list context from ordered item ids, order episodes by
  publish date, step to the newer or older neighbor, and read the next ids ahead. Storage
  lookups and livestream ordering stay with each surface.
- `restoredLivestream`: whether a restored or adopted now-playing livestream stays loaded
- `livePlayback`: live clock, rewind window, resume after a pause, and go to live

Each surface supplies its own `AutoQueueSourceFetchers` transport implementation.

## Livestreams

### Restoring a now-playing livestream

- On app or page load, and when adopting now-playing from another device, a livestream's fate
  comes from `resolveRestoredLivestream` with a status read fresh from the server on that load.
  The stored copy on the device, and any placeholder built from player metadata, is never the
  status.
- Ended, or the item no longer exists: treat it like a finished item. Move it to history, then
  load the next queue item paused, or leave the player empty when the queue is empty.
- Live, scheduled, no longer a live item, or no answer from the server: keep it. A stream that
  is really live is never hidden, so no start-time or end-time guess is made. With no answer,
  the device loads the copy it stored (the snapshot or the queue row).
- A 404 retires the item whether or not the device knew it was a livestream.
- Only the device whose session is active writes History for an ended queue head. Another device
  loads nothing for it and shows no handoff prompt for it; the owning device retires it.
- Signed-in queue reads already omit items whose feed dropped them.

### Time and controls

- A livestream has no duration. The right-hand slot is the Live control, labeled with the
  `media.livestream.live` catalog key on both surfaces. A duration from an earlier item never
  carries into a livestream, and no item carries a duration from the item before it.
- The left-hand time is empty at the live edge, and `−0:42` style (`formatBehindLiveLabel`)
  when behind it. Within `LIVE_EDGE_TOLERANCE_SECONDS` counts as live.
- Pressing Live goes to the live moment (`resolveGoToLive`) and plays: a seek to the live edge
  when the stream holds a window, a reconnect of the stream when it does not.
- Pressing play after a pause (`resolveLiveResume`) resumes where it paused when the stream
  still holds that moment, and goes to live otherwise. A progressive stream always reconnects.
- The scrubber and skip buttons appear only when the window is rewindable
  (`isRewindableLiveWindow`, at least `LIVE_MIN_REWIND_WINDOW_SECONDS`). Every seek goes through
  `clampLiveSeekSeconds` or `liveSeekSecondsAtFraction`.

### Where the window comes from

The window is the player's seekable range for HLS and DASH delivery only. Progressive delivery
(Icecast, Shoutcast, any plain audio or video URL) always passes `null`, whatever the element or
native player reports, because a browser can report a buffered range as seekable for a
progressive stream.

`liveEdgeSeconds` is where the platform's own go-to-live seek lands, not the raw end of the
seekable range, so that being at live reads as live.

- Web with `hls.js`: `hls.liveSyncPosition`.
- Web with native HLS: the end of the last `seekable` range minus the distance from that end
  measured when playback last joined live.
- Mobile: the values the native media engine reports.

Position and window are sampled together, on one timeline.

### Rewinding a livestream

- Rewind is a property of the stream, not the feed. HLS (an `EVENT` playlist, or a sliding
  window of segments) and DASH (a time-shift buffer) keep past segments addressable, and the
  browser and native players report that as the seekable range. The common interface is a
  scrubber over that range plus a Live control that jumps to the live edge.
- HLS is not the only way; DASH does the same. Progressive Icecast and Shoutcast streams hold no
  history, so they are live-only, and Podverse keeps no buffer of its own for them.
- The podcast namespace has no tag for a rewind window and none is needed: the window is read
  from the player at runtime. A platform plays DASH only where its player supports it.

### Web and mobile

Same on both: everything above. Differences, each intended:

- Window source: web reads the media element and `hls.js`; mobile reads the native media engine.
- Where the resume rule runs: web calls `resolveLiveResume`; mobile applies the same rule inside
  the native engine's `play()`, with the same `LIVE_WINDOW_START_MARGIN_SECONDS` margin.
- Cross-device: a device showing a livestream playing on another device shows the Live label
  only. Remote commands for a live item stay `PLAYBACK_COMMANDS_ALLOWED_FOR_LIVE` (play, pause,
  next, previous, play item, take over); there is no remote rewind or remote go-to-live. This is
  the same on web and mobile.

## What does not live here

- DOM or React Native APIs
- `@podverse/ui`, `@podverse/orm`, or app contexts
- Native media engine bridge code

## Dependencies

- `@podverse/helpers` only (DTOs, `MediumEnum`, enclosure helpers)

## Commands (from monorepo root)

```bash
npm run build -w @podverse/playback-core
npm run test -w @podverse/playback-core
npm run lint -w @podverse/playback-core
```

## References

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [media-player-architecture](/.cursor/skills/media-player-architecture/SKILL.md)
- Web decision matrix: `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`
