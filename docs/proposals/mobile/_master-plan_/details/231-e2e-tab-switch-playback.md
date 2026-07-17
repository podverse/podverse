# 231-e2e-tab-switch-playback

**Master step:** 7.18
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro flow `apps/mobile/e2e/tab-switch-playback.yaml` (name may vary).
- Switch tabs while stub or real now-playing is active; screenshot mini player still present /
  playback state preserved.
- If Track 10/2 playback not ready: assert tab switch + mini-player `testID` still mounted with a
  forced stub flag — document limitation in flow comments.

## Acceptance criteria

- Flow runs on E2E iOS + Android devices
- Screenshots in HTML report show mini slot across at least two tabs

## Follow-up (Track 10 / 10.23)

When mini-player reflects real bridge now-playing state, upgrade this flow from stub to assert
playback continuity across tabs. Depends on [332-e2e-play-mini-player](./332-e2e-play-mini-player.md)
and test-assets harness (5.21–5.23 / 335–337).

## Prerequisites

- Tab navigator (7.1+) implemented
- Prefer after auth shell wired; can run anonymous

## Verification

```bash
npm run mobile:e2e:test -- tab-switch-playback
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
