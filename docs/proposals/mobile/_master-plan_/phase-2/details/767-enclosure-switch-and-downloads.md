# 767-enclosure-switch-and-downloads

**Master step:** P2.1.4
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Wire enclosure switches through `@podverse/playback-core` resume policy, and make downloads respect
an explicit user selection when one exists.

Depends on: [765](765-enclosure-selection-session-state.md), [766](766-enclosure-source-picker.md).

### Enclosure switch resume

Web stages `buildEnclosureSwitchPlaybackDecisionIfChanged` then seeks after the new source loads
(`reason: 'enclosure-switch-resume'`). Mobile must:

1. On picker confirm, call `buildEnclosureSwitchPlaybackDecisionIfChanged` (or
   `resolveEnclosureSwitchPlaybackDecision`) with current position and old/new params.
2. Update session selection.
3. Reload native engine with the new URI.
4. Seek to the resume seconds from the decision (do not restart at 0 when policy says resume).

Policy lives in `packages/playback-core` — do not reimplement seek math in the provider.

### Downloads

[`isItemDownloadable`](apps/mobile/src/downloads/downloadEligibility.ts) always prefers audio. When
the user has selected an enclosure for the item in the current session **or** passes an explicit
selection into the download entry point, prefer that source's progressive URI. Default path without
selection keeps today's preferred-media-type / audio-first behavior aligned with 765.

HLS sources remain non-downloadable.

### Tests

- Unit: switch decision → seek target; download eligibility with explicit selection.
- Maestro: open picker, switch format, assert playback continues (seeded multi-enclosure fixture from
  test-assets if available).

## Acceptance criteria

- Switching enclosure resumes near the previous playhead per playback-core.
- Download of a selected video alternate (when progressive) is allowed when the user chose it.
- No integrity verification (web also stores but does not verify — out of scope).

## Web parity references

- [`stageEnclosureSwitchFromSelection.ts`](packages/playback-core/src/) /
  [`resolveEnclosureSwitchPlaybackDecision.ts`](packages/playback-core/src/)
- [`NonLiveMediaOrchestrator.tsx`](apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx)
  enclosure switch path
- [`MEDIA-PLAYER-DECISION-MATRIX.md`](apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)

## Verification

```bash
# Root / Mobile
npm run test -w @podverse/playback-core -- enclosure
npm --prefix apps/mobile run test -- downloadEligibility
npm run mobile:e2e:test -- alternate-enclosure
```
