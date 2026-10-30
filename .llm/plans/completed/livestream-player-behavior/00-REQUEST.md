# Livestream player behavior — request

## Request

Earlier today, I was listening to a live stream on the Podverse website, and then I stopped
listening to it. I came back to the website, and the live stream was still loaded in the player.
However, I suspect that the ended signal should have been sent already. And if that is the case for
a live stream where the ended signal has been sent, we would not want it to automatically load in
the player on both mobile or web. Because that ended signal indicates that the live stream should
no longer be live.

Furthermore, while the live stream was loaded, when I landed on the page, I then went and tried to
play a regular item, an episode from a podcast, and I would tap the play button and nothing would
happen. I'm not sure what would cause this. The issue happened on web. I'm unsure if the same issue
would happen on mobile.

Also, I noticed that when I earlier in the day pressed play on the live stream, it seemed like the
player retained the duration of the last duration that was loaded in the player. But a live stream
should not have a duration; it could have a current playback time if you find it feasible to keep
track of a current playback time. But a duration should never stick around from a previous item,
whether it be a live stream or non-live stream. That duration, in the case of live, should just be
the words "live." And if you were to press that duration that says "live," it should take you to
the current live moment within the live stream.

And furthermore, I am wondering how apps typically handle rewinding to an earlier point within a
live stream. Is there a standard convention for this? Is it something that only HLS can provide? In
the context of Podverse, all of our content comes from RSS feeds. And as far as I know, most of them
today do not support the ability to rewind during a live stream. But we would like to be able to
support that if content follows a known convention that is widely adopted. For handling that
scenario.

Note how mobile should handle live similarly as web in many respects.

## Operator answers

- **On app or page load, when the saved now-playing item is a livestream that has ended, what
  should the player do?** Treat it like a finished item: move it to history, then load the next
  queue item paused, or leave the player empty if the queue is empty.
- **Some feeds never switch a stream to ended. Should restore trust only the fresh status from the
  server, or also guess?** Trust only the fresh server status, so a stream that is really live is
  never hidden. No end-time or start-time heuristic.
- **What should the left-hand time show for a livestream?** Nothing at the live point; how far
  behind live (for example `−0:42`) when rewound.
- **How much rewind should this set build?** Rewind only when the stream reports a seekable window
  (HLS or DASH); progressive streams stay live-only. No app-side buffer for progressive streams.
- **After pausing a livestream, what should pressing play do?** Resume where it was paused if the
  stream still holds that moment; otherwise jump to live.

### Review of the first planning pass

The operator answered the planner decisions listed under "## Decisions to review" in
`00-SUMMARY.md` (D1–D47). D numbers refer to that list.

- **D44, resume margin:** "Both web and mobile resume in place only when the paused position is at
  least the window start plus the 6 second margin from D5. Change mobile plan 30 native play() to
  match plan 11 resolveLiveResume."
- **D45, 404 on restore:** "Retire on any 404, on both. Change mobile plan 60 (D36) to match plans
  10 and 40."
- **D46, handoff prompt for an ended queue head:** "Suppress the handoff prompt for an ended
  livestream queue head on both. Change web plan 41 to read item status before prompting, as
  mobile does in D37."
- **D47, failed status read on restore:** "When the status read fails (offline, 5xx), load the
  stored copy on both. Change web plans 40 and 41 (D21) to load the stored snapshot or queue row,
  matching mobile plan 60 load-stored."
- **D38, engine-held source at cold start:** "Keep plan 61 as written. Leave an engine-held source
  alone at cold start and never destroy() it."
- **D37, History writes from a device that is not active:** "Accept, and apply the same history
  rule to web plan 41: a device that is not the active session does not write History for an
  ended queue head; the owning device retires it."
- **Everything else:** "All other decisions (D1-D36, D39-D43) are accepted as planned, with D20,
  D21, D23 and D36 superseded by the conflict answers above."

## Context given to the operator

The operator accepted this answer to the rewind question; plans follow it.

- Rewind on a live stream is a property of the stream, not the feed. HLS (an `EVENT` playlist, or a
  sliding window of segments) and DASH (time-shift buffer) keep past segments addressable; the
  browser and native players report that window as the seekable range. The common UI is a scrubber
  over that range and a Live control that jumps to the live edge.
- Progressive Icecast or Shoutcast streams hold no history.
- The podcast namespace has no tag for a rewind window, and none is needed: the window is detected
  from the media element or native player at runtime.
- On a progressive stream, "go to live" means reconnecting the stream.
- The ended signal reaches Podverse as a podping with reason `liveEnd`, which re-parses the feed;
  the stored status becomes ended only when the feed's `podcast:liveItem` says `status="ended"`.
- Restore must use the item's current status from the server, not the copy persisted on the device.
- Never carrying a duration from the previous item applies to every item change, live or not.

## Glossary

- **live stream**, **livestream**: a `podcast:liveItem` (`live_item` in the DTOs). Livestreams are a
  flag on top of the feed's medium, not a medium (see `.cursor/rules/abcmemory-vocabulary.mdc`
  § livestreams).
- **ended signal**: the live item's status becoming ended (`LiveItemStatusEnum.Ended`), usually
  after a `liveEnd` podping.
- **duration**: the right-hand time in the player (total length).

## Orientation

- `packages/helpers/src/lib/liveItemVisibility.ts` — live item status helpers and the one-day
  ended and pending list cutoffs.
- `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md` § 6 — livestream baseline.
  Its "Reload while live is playing" row says `resolveKindAndIdText` in
  `anonymousPlaybackStorage.ts` stores `kind: 'item'` for a livestream and does not skip
  `live_item`. § 6b lists the livestream E2E specs and seed items (including the HLS event
  playlist item `e2eLiveHlsA01` in `tools/web/seed-e2e.mjs`).
- `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx` — mounts
  `NonLiveMediaMount`, `MediaPlayerControllerLiveStreamAudio`, and
  `MediaPlayerLiveStreamVideoWrapper` together; the first suspect for the play button doing
  nothing after a restored livestream.
- `apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx` and
  `MediaPlayerControllerLiveStreamAV.tsx` — non-live and live element control on web.
- `packages/playback-core/src/` — shared playback decisions; `resolvePlaybackLoadDecision.ts`,
  `playbackTarget.ts`, and `listenSession.ts` mention live items.
- `apps/mobile/src/lib/playback/engineSourceAdoption.ts` — mobile engine source adoption; reads
  live item status.
- `apps/web/src/lib/crossDevicePlayback/` — cross-device playback; a remote livestream shows a Live
  label and sends no `seek`. A restored or adopted now-playing item from another device is in
  scope for the ended-livestream rule.
- `packages/mq/src/functions/mq/rss/runLiveItemListener.ts` — podping `live` / `liveEnd` handling.
