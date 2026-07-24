# 352-collapse-to-mini-animation

**Master step:** 11.7
**Model (author + implement):** Opus 4.8
**Status:** draft

**Implementation deferral (PG-7b audio-first):** Detail now; implement after PG-5 / Track 2 video (2.14+). Do not block audio mini/full player COPY-PASTA.

**Ship bar:** functional video surface / E2E smoke only — no player layout redesign or transcript chrome (Track 21.11 / Track 23).

## Scope

- Collapse full player animates surface back to mini target.

## Architecture notes

Inverse of 11.6; audio-only collapse is instant navigation (already 11.4).

## Edge cases / cross-track deps

- Deferred video; audio uses 11.4 only

## Acceptance criteria

- Collapse does not reload media
- Animation completes without black flash (E2E 11.17)

## Web parity references

- 2.19 animate API

## Verification

```bash
# after PG-5
```

## Depends on

- 11.6
