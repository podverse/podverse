# 361-e2e-video-full-screenshot

**Master step:** 11.16
**Model (author + implement):** Opus 4.8
**Status:** draft

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video (2.14+). Do not block audio mini/full player COPY-PASTA.

## Scope

- E2E: expand to full player screenshot mid-playback (same position).

## Architecture notes

- 11.6, 11.8

## Edge cases / cross-track deps

- Video transition spike 2.33

## Acceptance criteria

- Screenshot mid-playback after expand; position continuity noted

## Web parity references

npm run mobile:e2e:test -- play-mini-player

## Verification

```bash
- 11.6
```
