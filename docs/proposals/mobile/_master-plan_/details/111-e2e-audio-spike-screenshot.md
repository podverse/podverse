# 111-e2e-audio-spike-screenshot

**Master step:** 2.32
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add a Maestro (or documented semi-auto) flow that plays sample audio and captures evidence of
  lock-screen / now-playing controls (screenshot where automatable; otherwise operator checklist
  + screenshot path).
- Background audio was already verified for GO; this step **captures durable E2E/report evidence**
  in the Maestro report slots.

## Architecture notes

- Prefer extending existing `play-mini-player` or a dedicated `engine-audio-spike.yaml` under
  `apps/mobile/e2e/`.
- Lock-screen screenshots may be partial on simulator — document limitations; device preferred.

## Edge cases

- Simulator without lock-screen UI: assert playing state + mini player screenshot instead; note in
  flow comments.

## Acceptance criteria

- Flow runs under `npm run mobile:e2e:test -- <area>`.
- Report HTML includes at least one playback screenshot.
- Does not require video surface APIs.

## Web parity references

- [091-spike-background-audio](./091-spike-background-audio.md)
- [332-e2e-play-mini-player](./332-e2e-play-mini-player.md)
- **mobile-e2e-screenshots** skill

## Verification

```bash
# Mobile Maestro (Metro + iOS/Android already up per HOW-TO-RUN)
npm run mobile:e2e:test -- play-mini-player
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## Depends on

- Audio spike GO; Track 5 Maestro harness
