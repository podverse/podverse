# 332-e2e-play-mini-player

**Master step:** 10.23
**Model (author + implement):** Codex 5.3
**Status:** _TBD_

## Scope

- Maestro flow: navigate to a seeded podcast episode (reuse web seed channel `e2ePodChnl001` /
  item enclosure on **2111**), play, and assert the mini player shows now-playing state.
- Reuse the mobile E2E test-assets harness (5.21–5.23) and shared seed — no mobile-only media.
- Prefer extending `podcast-episode.yaml` or a dedicated `play-mini-player.yaml` once Track 10
  queue/orchestrator + real mini-player UI (Track 11) replace the placeholder slot.

## Acceptance criteria

- Play triggers native bridge load of a `localhost:2111` / Android-rewritten enclosure
- Mini player (or E2E playback-active testID) visible after play
- Screenshots on iOS + Android E2E slots
- Runner requires `flow_needs_test_assets` for this flow

## Prerequisites

- 5.21–5.23 test-assets harness done
- Track 10 playback orchestrator wired enough that Home/Episode play is not a stub
- Prefer after 11.1 mini player UI; until then document stub limitation like 7.18

## Follow-up

- Upgrade [231-e2e-tab-switch-playback](./231-e2e-tab-switch-playback.md) from stub to real
  now-playing once mini-player reflects bridge state across tab switches.

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
# or: npm run mobile:e2e:test -- play-mini-player
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

## Depends on

- 5.21–5.23 / 335–337, Track 10 play path (10.13–10.14)
