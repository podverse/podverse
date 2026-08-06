# 587-defer-carplay-video

**Master step:** 21.8
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **CarPlay/Android Auto video** as a **v1 deferral**. In-car playback is **audio-only** for v1
(video content plays audio in the car surface). Matches platform safety guidance.

## Rationale

- CarPlay/Android Auto restrict video playback while driving; audio-only is the compliant and
  expected in-car behavior.
- Avoids a video-in-car surface that the platforms would reject or gate to parked states.

## Revisit trigger

- A platform-supported parked-only video mode is prioritized, with the required entitlements.

## Acceptance

- Deferral captured here, linked from the deferrals appendix (589) + placeholder issue (588).
- Car surfaces (Track 12) remain audio-only in v1.
