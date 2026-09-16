# 598-defer-player-transcript-chrome

**Master step:** P2.3.5
**Model (author + implement):** Auto
**Status:** partially opened — see Scope

## Scope

- **Defer** transcript **coupling**: follow-along highlighting, scrubber synchronization, and
  tap-a-line-to-seek, on both the full player and the mini player.
- **Opened:** the player carries a **Transcript chip** that renders the same plain transcript pane
  episode detail renders — [750](750-player-section-chips-and-panes.md). A transcript being readable
  from the player is not the same as a transcript driving playback.
- Episode detail remains the other place transcripts show, from the same shared pane.

## Acceptance criteria

- Documented as deferred in Phase 2 Track P2.3
- Agents do not add transcript-to-playback coupling during player or feature work unless the operator
  opens the rest of this deferral

## Web parity references

- Web `ItemTranscript` — episode page; player integration is a product design choice

## Verification

N/A (deferral stub).
