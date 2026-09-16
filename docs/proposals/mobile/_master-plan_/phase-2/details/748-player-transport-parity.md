# 748-player-transport-parity

**Master step:** P2.1.4
**Model (author + implement):** Opus 5
**Status:** planned

## Scope

Give the player the five-control transport row: **previous, jump back, play/pause, jump forward,
next**. Nextgen has play/pause and skip-to-next only, so previous and both jumps are new engine work
in `PlaybackProvider`, not just new buttons.

### Engine additions

| Capability       | Behavior                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `jumpBy(delta)`  | Seek relative, clamped to `[0, duration]`; no-op when duration is unknown                                         |
| `skipToPrevious` | Chapter-aware: restart the current chapter, step to the previous chapter, or fall back to the previous queue item |

Chapter awareness follows the same rule legacy used and web already encodes: when the position is
past a small grace window into the current chapter, previous restarts that chapter; inside the grace
window it moves to the previous chapter; with no chapters it restarts the track, and only from the
very start does it reach for the previous queue item.

That decision is a pure function — `resolvePreviousAction({ chapters, positionSeconds, hasPreviousQueueItem })`
returning a discriminated result — so it is unit tested without the engine. Chapter lookup reuses
`selectItemChapterForTime` from `@podverse/playback-core` rather than a second mobile implementation
([`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)).

### Jump interval

**10 back / 30 forward on mobile and web**, matching legacy's defaults and the screenshot.
`MEDIA_JUMP_BACK_SECONDS` in `@podverse/helpers` moves from 15 to 10 and mobile imports it, so web's
four jump buttons — which already read the constant — change with mobile instead of drifting from it
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)).

Player settings that make the interval configurable stay on the P2.1.4 inventory as a later decision:
no preference, no storage key, no settings row.

The jump glyphs carry their interval in the accessible name through the existing
`media_player.jump_back` / `media_player.jump_forward` keys, which already interpolate `{seconds}`.

### Live and bounded playback

Livestreams hide seek, both jumps, and previous — there is nothing to seek to. Clip and soundbite
playback keeps its bounds: jumping must not escape the clip window, so clamp against the active
target's range rather than the whole enclosure.

## Acceptance criteria

- Five controls render in the order previous, −10, play/pause, +30, next, with the play/pause circle
  visually dominant as in the screenshot.
- Play/pause keeps its loading and error/retry behavior — this row uses the existing
  `PlayerTransportButton`, not a new play control.
- Jumps clamp at both ends and stay inside clip bounds for bounded targets.
- Previous restarts the chapter, steps back a chapter, or reaches the previous queue item per the
  resolver; next keeps today's `skipToNext` behavior.
- Livestream playback hides seek, jumps, and previous.
- `resolvePreviousAction` and the jump clamping have unit tests, including chapter boundaries, the
  grace window, no-chapter items, and clip bounds.
- Every control has an accessible name and its disabled state exposed.

## Web parity references

- [`selectItemChapterForTime.ts`](packages/playback-core/src/selectItemChapterForTime.ts) — shared
  chapter resolution
- Web desktop transport (`apps/web/src/components/MediaPlayer/`) — jump intervals and previous
  semantics

## Verification

`npm run mobile:e2e:test -- player-screen` plus the mobile unit tier. Because the interval constant is
shared, web's unit tier and its media-player specs run in the same pass.
