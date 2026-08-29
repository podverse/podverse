# 319-auto-queue-channel-sources

**Master step:** 10.10
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Auto-queue channel mode sources: pub-date, season, shuffle (web parity).

## Architecture notes

Channel auto-queue uses channel item list endpoints; keep repository-mediated fetches.

## Edge cases / cross-track deps

- Missing season metadata
- Channel with zero remaining items

## Acceptance criteria

- Each channel mode advances with correct ordering semantics
- Season boundaries handled like web
- Shuffle prefs interact with 10.11 storage

## Web parity references

- Web AutoQueue channel modes
- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
```

## Depends on

- 10.8
