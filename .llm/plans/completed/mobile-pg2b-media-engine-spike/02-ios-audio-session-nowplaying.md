# Plan 02 — iOS AVPlayer, session, Now Playing

**Steps:** 2.4, 2.5, 2.6
**Model:** Opus 4.8

## Detail references

- [083-ios-avplayer-audio](/docs/proposals/mobile/_master-plan_/details/083-ios-avplayer-audio.md)
- [084-ios-audio-session-lifecycle](/docs/proposals/mobile/_master-plan_/details/084-ios-audio-session-lifecycle.md)
- [085-ios-now-playing-remote-commands](/docs/proposals/mobile/_master-plan_/details/085-ios-now-playing-remote-commands.md)
- [00-CAR-FOUNDATION.md](./00-CAR-FOUNDATION.md)

## Tasks

1. Implement single process-wide `AVPlayer` audio load/play/pause/seek/rate/position/duration/destroy.
2. Document native shared accessor for future CarPlay binding (12.9) without requiring JS.
3. Configure `AVAudioSession` `.playback` + interruption handling.
4. Wire `MPNowPlayingInfoCenter` + **one** shared `MPRemoteCommandCenter` to the same player
   (CarPlay remotes will reuse this — 12.10).
5. Keep video surface and CarPlay scene out of scope.

## On completion

Mark steps **2.4, 2.5, 2.6** as `done`. Operator verifies with
`npm run mobile:ios -- --device "iPhone 17 Pro"`.
