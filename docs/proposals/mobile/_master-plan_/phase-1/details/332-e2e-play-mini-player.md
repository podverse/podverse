# 332-e2e-play-mini-player

**Master step:** 10.23
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro flow: navigate to a seeded podcast episode (reuse web seed channel `e2ePodChnl001` /
  item enclosure on **2111**), play via real Track 10 orchestrator (not stub), and assert the mini
  player shows now-playing state.
- Reuse the mobile E2E test-assets harness (5.21–5.23) and shared seed — no mobile-only media.
- Prefer a dedicated `play-mini-player.yaml` (or extend `podcast-episode.yaml`) once 10.13–10.14 and
  Track 11.1 mini-player UI replace the placeholder slot.

## File paths

- E2E flows: `apps/mobile/e2e/`
- Runner docs: `apps/mobile/e2e/HOW-TO-RUN.md`
- Mini player slot: `apps/mobile/src/navigation/index.tsx` (`testID="mini-player"`)
- Play path: Track 10.13–10.14 hooks + `nativePlaybackBridge`

## Acceptance criteria

- Play triggers native bridge load of a `localhost:2111` / Android-rewritten enclosure
- Mini player (or E2E playback-active testID) visible after play
- Screenshots on iOS + Android E2E slots
- Runner requires `flow_needs_test_assets` for this flow
- Named E2E devices only (`iPhone 17 Pro E2E` / `Pixel_6_Pro_API_33_e2e`)

## Web parity references

- Web play → media player chrome (behavioral parity only)
- Mobile parity: replace `useHomeRowPlaybackStub` before this E2E is green

## Prerequisites

- 5.21–5.23 test-assets harness done
- Track 10 playback orchestrator wired (10.13–10.14)
- Prefer after 11.1 mini player UI; until then document stub limitation like prior player E2E stubs

## Follow-up

- Upgrade [231-e2e-tab-switch-playback](./231-e2e-tab-switch-playback.md) from stub to real
  now-playing once mini-player reflects bridge state across tab switches.

## Verification

```bash
# Mobile Maestro (Metro + iOS/Android E2E devices + test-assets already up)
npm run mobile:e2e:test -- play-mini-player
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## Depends on

- 5.21–5.23 / 335–337, Track 10 play path (10.13–10.14), preferably 11.1 mini UI
