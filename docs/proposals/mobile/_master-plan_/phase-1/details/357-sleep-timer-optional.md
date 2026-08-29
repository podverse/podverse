# 357-sleep-timer-optional

**Master step:** 11.12
**Model (author + implement):** Auto
**Status:** done

## Scope

- Sleep timer optional feature stub (mobile-only nice-to-have).
- Stub UI entry + no-op or simple timeout pause is enough for PG-7b.

## Acceptance criteria

- Entry point visible on full player (can be behind “coming soon” if incomplete)
- Does not regress playback when unused
- Documented as optional / incomplete OK

## Verification

```bash
# manual smoke on full player
```

## Implementation notes

- `apps/mobile/src/screens/player/FullPlayerSleepTimer.tsx` — toggled from the full player's
  `full-player-sleep-timer` entry. Minimal, session-only: picking 15/30/60 min schedules a single
  `pause()`; "Off" cancels. Does nothing until a duration is chosen, so idle playback is not
  regressed. Fade-out / end-of-episode parity can follow (intentional stub).
- testIDs: `full-player-sleep-timer-control`, `full-player-sleep-option-off`,
  `full-player-sleep-option-15/30/60`.
