# 318-auto-queue-playlist-sources

**Master step:** 10.9
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Auto-queue loader hook with playlist sequential/random sources (web parity).

## Architecture notes

Port web auto-queue playlist source loading; use shared helpers/DTOs where they exist.

## Edge cases / cross-track deps

- Empty playlist / private playlist access errors
- Random without replacement vs with — match web

## Acceptance criteria

- Sequential and random playlist modes load next rows correctly
- Exhausted playlist stops advance without crash
- Seeds from playlist play (10.20) work with this loader

## Web parity references

- Web AutoQueue playlist source paths / playlist resource wrappers

## Verification

```bash
npm run mobile:e2e:test -- library
```

## Depends on

- 10.8
