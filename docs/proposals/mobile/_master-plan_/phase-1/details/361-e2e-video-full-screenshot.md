# 361-e2e-video-full-screenshot

**Master step:** 11.16
**Model (author + implement):** Opus 4.8
**Status:** done

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video
(2.14+). Do not block audio mini/full player COPY-PASTA.

**Ship bar:** functional video surface / E2E smoke only — no player layout redesign or transcript
chrome (Track 21.11 / Track 23).

## Scope

- E2E: expand to full player screenshot mid-playback (same position / continuous playback).

## Architecture notes

- Depends on 11.6, 11.8; may share `apps/mobile/e2e/video-transition.yaml` with 11.15 / 11.17.

## Edge cases / cross-track deps

- Video transition spike 2.33; Maestro cannot prove live frames — structural asserts + screenshots.

## Acceptance criteria

- Screenshot mid-playback after expand; `playback-active-e2e` still visible (no reload)
- `full-player-video-surface` visible

## Web parity references

- Seamless mini↔full video proposals; single native surface

## Verification

```bash
npm run mobile:e2e:test -- video-transition
```

## Depends on

- 11.6, 11.8
