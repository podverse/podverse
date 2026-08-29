# 362-e2e-video-collapse-screenshot

**Master step:** 11.17
**Model (author + implement):** Opus 4.8
**Status:** done

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video
(2.14+). Do not block audio mini/full player COPY-PASTA.

**Ship bar:** functional video surface / E2E smoke only — no player layout redesign or transcript
chrome (Track 21.11 / Track 23).

## Scope

- E2E: collapse to mini screenshot without black flash or reload spinner.

## Architecture notes

- Depends on 11.7; may share `apps/mobile/e2e/video-transition.yaml`.

## Edge cases / cross-track deps

- Engine single-instance invariant; Maestro cannot prove “no black flash” visually — assert
  `playback-active-e2e` + mini surface `testID`s; operator on-device check for flash.

## Acceptance criteria

- Collapse screenshot flow: full player dismissed; mini + playback still active
- No reload spinner assert where harness allows

## Web parity references

- Single native surface reparent

## Verification

```bash
npm run mobile:e2e:test -- video-transition
```

## Depends on

- 11.7
