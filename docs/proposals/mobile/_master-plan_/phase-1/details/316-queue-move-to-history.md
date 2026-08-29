# 316-queue-move-to-history

**Master step:** 10.7
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Move now-playing to history on ended/skip, matching web queue lifecycle.
- Wire from orchestrator events (10.12) once available; can land repo+store API first.

## Architecture notes

History is a queue resource list on web. Mobile history already reads via repository —
ensure write path updates SQLite + store consistently.

## Edge cases / cross-track deps

- Skip while offline: queue local op, sync later
- Concurrent ended + manual skip

## Acceptance criteria

- Ended/skip removes from now-playing, appends history, advances upcoming when applicable
- History screen reflects move after sync/local write
- Projection hook fires after mutation

## Web parity references

- Web queue history transitions / `NonLiveMediaOrchestrator` end path
- Mobile: `LibraryHistoryScreen`, `queueRepository.getHistoryPage`

## Verification

```bash
npm run mobile:e2e:test -- library
```

## Depends on

- 10.1, 10.12 (orchestrator consumer)
