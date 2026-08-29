# 342-mini-player-video-placeholder

**Master step:** 11.3
**Model (author + implement):** Opus 4.8
**Status:** done

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video
(2.14+). Do not block audio mini/full player COPY-PASTA.

**Ship bar:** functional video surface wiring only — no player layout redesign or transcript chrome
(Track 21.11 / Track 23).

## Scope

- Mini player video mode: transparent placeholder + `targetId=mini` surface registration.
- Requires Track 2 video surface APIs (2.18+).

## Architecture notes

Native VideoSurfaceHost owns the surface; RN only registers layout rects. See engine spike
docs and steps 2.16–2.21.

## Edge cases / cross-track deps

- Keyboard / rotation layout updates (2.24)
- Deferred until PG-5

## Acceptance criteria

- Audio-only items hide surface; video items show placeholder rect
- `attachVideoSurface` / layout updates wired for mini target
- No second RN Video component mounted

## Web parity references

- Master steps 2.18–2.21, 2.23
- Web floating video player behavioral parity

## Verification

```bash
# after PG-5
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- PG-5 / 2.14+; 11.1
