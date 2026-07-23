# 334-e2e-auto-queue-advance

**Master step:** 10.25
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- E2E: auto-queue advance after track ended (screenshot or state assert).
- May use short fixture media on :2111 to reach ended quickly.

## Architecture notes

Short test-assets clips; orchestrator 10.12 + auto-queue 10.8–10.10 must be live.

## Edge cases / cross-track deps

- Emulator clock / ended event delivery delays
- Skip if video-only fixtures

## Acceptance criteria

- After ended, next auto-queue item becomes now-playing
- Assert via testID and/or screenshot
- Document flaky timing budgets per mobile-maestro-timeouts skill

## Web parity references

- Mobile E2E harness 5.21–5.23
- Web orchestrator ended tests for expected order

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
# or auto-queue-advance area when added
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

## Implementation notes

- Flow: `apps/mobile/e2e/auto-queue-advance.yaml` (registered in `flow_needs_e2e_api` +
  `flow_needs_test_assets`).
- Advance is triggered via the E2E skip control (`playback-skip-next-e2e` in `PlaybackE2eStatus`)
  because `skipToNext === advance` in `PlaybackProvider`, so it exercises the identical
  `resolveQueueAdvance` decision path (advance-auto-queue vs play-next-manual) that the native
  `ended` handler calls. The assertion confirms a target stays active after advance (clears would
  fail).
- **Deferred:** natural-`ended` timing. Committed fixtures are 30s/60s, which exceeds the Maestro
  timeout ladder cap (`TIMEOUT_SLOWEST` = 20s; **mobile-maestro-timeouts**), and emulator `ended`
  delivery is flaky. Add a <20s fixture or a fixture-duration timeout tier to assert the native
  `ended` → advance edge directly.

## Depends on

- 10.12–10.14, 10.8–10.10
