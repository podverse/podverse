# 351-full-player-video-surface

**Master step:** 11.6
**Model (author + implement):** Opus 4.8
**Status:** draft

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video (2.14+). Do not block audio mini/full player COPY-PASTA.

**Ship bar:** functional video surface / E2E smoke only — no player layout redesign or transcript chrome (Track 21.11 / Track 23).

## Scope

- Full player video mode: `targetId=full` surface + `animateVideoSurface` from mini.

## Architecture notes

Depends on bridge `animateVideoSurface` (2.19) and RN full target registration (2.22).

## Edge cases / cross-track deps

- Deferred with PG-5

## Acceptance criteria

- Expand animates surface mini→full without playback restart
- Full target rect updates on layout

## Web parity references

- Steps 2.19, 2.22; web seamless video transition proposals

## Verification

```bash
# after PG-5
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- PG-5; 11.3; 11.5
