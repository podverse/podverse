# 768-enclosure-driven-video-surface

**Master step:** P2.1.4
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Show the native video surface whenever the **selected enclosure** is video, matching web's
[`isNonLiveVideoPlaying`](apps/web/src/utils/mediaPlayer/isNonLiveVideoPlaying.ts), instead of
gating only on `activeTarget.kind === 'item-video'`.

Depends on: [765](765-enclosure-selection-session-state.md) (selection state must exist).

### Today

```typescript
nativePlaybackBridge.setVideoSurfaceVisible(activeTarget?.kind === 'item-video');
```

in [`PlaybackProvider.tsx`](apps/mobile/src/playback/PlaybackProvider.tsx). Podcast episodes with an
MP4 alternate never show video even when the URI is a video file. Video-medium channels show the
surface even if the chosen file is audio-only.

### Target

- Derive visibility from the selected labeled enclosure's `mediaType === 'video'` (helpers).
- Keep native frame gating (`currentItemHasVideoTracks`) as a second line of defense.
- Mini and full surfaces ([`MiniPlayerArtwork`](apps/mobile/src/components/player/MiniPlayerArtwork.tsx),
  [`FullPlayerArtwork`](apps/mobile/src/components/player/FullPlayerArtwork.tsx)) need no API
  change if visibility is driven correctly at the bridge.

### Regression cases

| Case                                              | Expected                         |
| ------------------------------------------------- | -------------------------------- |
| Podcast + preferred video + MP4 alternate         | Surface visible when selected    |
| Podcast + preferred audio                         | Surface hidden                   |
| Video-medium channel + mistyped audio enclosure   | Surface hidden (enclosure wins)  |
| Switch enclosure audio → video mid-session        | Surface appears after switch     |

`PlaybackTarget` kind (`item-video` vs `item-podcast`) may stay medium-derived for queue / stats;
only surface visibility becomes enclosure-driven. Document that split in the plan summary if both
remain.

### E2E

Extend or add a flow that plays a multi-enclosure item with video preferred and asserts the video
surface `testID` (existing E2E video hooks / `E2ePlayVideoButton` may need alignment).

## Acceptance criteria

- Surface visibility follows selected enclosure media type, not solely `item-video`.
- Enclosure switch audio↔video updates visibility without remounting the whole player tree.
- No new video channel screens.

## Web parity references

- [`isNonLiveVideoPlaying.ts`](apps/web/src/utils/mediaPlayer/isNonLiveVideoPlaying.ts)
- [`NonLiveMediaMount.tsx`](apps/web/src/components/MediaPlayer/MediaElement/NonLiveMediaMount.tsx)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- alternate-enclosure
npm run mobile:e2e:test -- play-video
open .artifacts/mobile-e2e-reports/latest/failures.json
```
