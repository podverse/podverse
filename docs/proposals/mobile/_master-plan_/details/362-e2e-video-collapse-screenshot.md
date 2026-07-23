# 362-e2e-video-collapse-screenshot

**Master step:** 11.17
**Model (author + implement):** Opus 4.8
**Status:** draft

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video (2.14+). Do not block audio mini/full player COPY-PASTA.

## Scope

- E2E: collapse to mini screenshot without black flash or reload spinner.

## Architecture notes

- 11.7

## Edge cases / cross-track deps

- Engine single-instance invariant

## Acceptance criteria

- Collapse screenshot shows continuous playback chrome
- No reload spinner assert

## Web parity references

npm run mobile:e2e:test -- play-mini-player

## Verification

```bash
- 11.7
```
