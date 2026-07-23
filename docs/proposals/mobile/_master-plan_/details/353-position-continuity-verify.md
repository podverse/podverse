# 353-position-continuity-verify

**Master step:** 11.8
**Model (author + implement):** Opus 4.8
**Status:** draft

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video (2.14+). Do not block audio mini/full player COPY-PASTA.

## Scope

- Verify playback position continuous across mini↔full transitions (no restart).
- Document manual + E2E checks; primarily validates video path but also audio expand.

## Architecture notes

Audio path covered in 11.4; this step gates video continuity after PG-5.

## Edge cases / cross-track deps

- Deferred video asserts; keep audio regression in 11.4 E2E

## Acceptance criteria

- Position delta across transition within tolerance
- Automated assert where harness allows; else checklist

## Web parity references

- Engine spike GO notes on single player instance

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 11.4; video after 11.6–11.7
