## Headset play after a pause

- Surfaces: mobile (iOS)
- Change: After a pause, if an interruption ends and nothing else is playing, the app activates
  its audio session again and republishes Now Playing without starting audio. The same reclaim
  runs when the app comes to the foreground. A play press from the lock screen, headset, CarPlay,
  or the in-app control reloads whatever was playing once at its playhead when the player item has
  failed. That is whatever was loaded: an episode, a track, a video, a chapter, a clip, a
  soundbite, or Add by RSS. A clip or soundbite keeps its range. A failed livestream starts at
  live. If the audio session will not activate, play is tried once more without reloading, so a
  healthy playhead stays put. A second failure is reported and playback stays stopped. A listener
  who had paused is still not resumed by the end of a call. Another app that is playing keeps the
  headphones.
- Who notices: listeners who pause, leave the app, and later press play on their headphones or
  the lock screen
- Operator steps: none

## Transcript tab no longer crashes on open

- Surfaces: mobile (iOS; same list code on Android)
- Change: Opening Transcript on an episode, track, or Add by RSS item sticks the filter and
  Autoscroll bar. The page header above it, including the chip row, stays a normal list header.
- Who notices: listeners who open Transcript
- Operator steps: none

## Stale mobile refresh no longer ends the new session

- Surfaces: mobile
- Change: A refresh that was already in flight when the user signed out is ignored if a newer
  session has started. A 401 from `POST /auth/mobile/refresh` is no longer logged as an unexpected
  API error, so the dev error overlay does not cover the app.
- Who notices: someone who signs out and signs back in while a token refresh is still in flight
- Operator steps: none

## Live items without a duration can play

- Surfaces: mobile
- Change: Starting playback no longer treats a missing item duration as "No Playable Media Found."
  A live item with no `item_about` can start.
- Who notices: someone who plays a livestream that has no duration
- Operator steps: none

## Player and list labels stay inside their controls

- Surfaces: mobile
- Change: Marquee titles and list rows stay in the native view hierarchy, so the title text
  remains inside the control that carries it.
- Who notices: VoiceOver on a scrolling player title or a list row
- Operator steps: none

## Video fullscreen stays open

- Surfaces: mobile
- Change: Entering video fullscreen waits until the fullscreen host has laid out before moving
  the picture there. Previously the move happened first, the surface reported that it was not
  presented, and fullscreen closed immediately.
- Who notices: anyone who taps Full Screen on a video
- Operator steps: none

## Transcript section switch no longer hits a list error

- Surfaces: mobile
- Change: Episode, track, Add by RSS, and full-player lists always keep the transcript
  viewability callback. Opening Transcript after another section no longer changes that callback
  from absent to present, which React Native rejects and which was covering the transcript with
  a render error.
- Who notices: listeners who open Transcript after Chapters or another section
- Operator steps: none

## Add by RSS full player transcript keeps the follow bar

- Surfaces: mobile
- Change: The full player's Transcript filter and Autoscroll stay on screen for an Add by RSS
  item once the cues have loaded. They were limited to directory items.
- Who notices: listeners who open Transcript on an Add by RSS item in the full player
- Operator steps: none
