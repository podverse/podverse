# 360-e2e-video-mini-screenshot

**Master step:** 11.15
**Model (author + implement):** Codex 5.3
**Status:** draft

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video (2.14+).

## Scope

- E2E: video item mini player screenshot.

## Acceptance criteria

- Flow plays video fixture; mini screenshot captured on both platforms

## Web parity references

- Track 2 video + 11.3

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- PG-5, 11.3
