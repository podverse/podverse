# Add-by-RSS playback stutter fix

**Status:** Completed.

## Overview

Fix severe audio (and potentially video) stutter when pressing play on Add-by-RSS items by stopping the Add-by-RSS media effect from re-running on every timeupdate and repeatedly calling play/seek.

## Root cause

The stutter is caused by **duplicate / competing playback logic** in [MediaPlayerControllerAV](apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx).

The Add-by-RSS effect (lines 188–220) had **`mpCurrentTime` in its dependency array**, so it re-ran on every timeupdate; each run called play/seek and caused stutter.

## Fix implemented

1. **MediaPlayer context** — Added `addByRSSSeekToTime: number | null` and `setAddByRSSSeekToTime`; exposed in provider.
2. **usePlayAddByRSS** — When restored position is known (sync or async), calls `setAddByRSSSeekToTime(resolvedPosition)` so the controller can perform a one-shot seek.
3. **MediaPlayerControllerAV** — Add-by-RSS effect: removed `mpCurrentTime` from deps; added `addByRSSSeekToTime` and `setAddByRSSSeekToTime` as props and in deps. Seek only when `addByRSSSeekToTime !== null` (then clear after applying), so the effect does not re-run on every timeupdate and does not reset to 0 when user presses play.
4. **Audio/Video controllers** — Pass `addByRSSSeekToTime` and `setAddByRSSSeekToTime` from context into MediaPlayerControllerAV.

Follow-up fix (play reset bug): only set `media.currentTime` when `addByRSSSeekToTime !== null`, so pressing play after a restored position does not reset to 0.

## Files changed

- [apps/web/src/contexts/MediaPlayer.tsx](apps/web/src/contexts/MediaPlayer.tsx)
- [apps/web/src/hooks/usePlayAddByRSS.tsx](apps/web/src/hooks/usePlayAddByRSS.tsx)
- [apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx](apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx)
- [apps/web/src/components/MediaPlayer/Controller/Audio/MediaPlayerControllerAudio.tsx](apps/web/src/components/MediaPlayer/Controller/Audio/MediaPlayerControllerAudio.tsx)
- [apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerControllerVideo.tsx](apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerControllerVideo.tsx)
