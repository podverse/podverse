# 313-queue-now-playing-upcoming

**Master step:** 10.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Load now-playing + upcoming via queue resource `req*` wrappers inside the repository/sync layer.
- Expose results to the queue store / load-active hook consumers.

## File paths

- `apps/mobile/src/data/repositories/queueRepository.ts`

## Acceptance criteria

- Now-playing and upcoming match web queue resource shapes
- Offline reads last SQLite rows; online sync refreshes
- Empty queue yields null now-playing + empty upcoming without throwing

## Web parity references

- Web: queue resource hooks / `useQueues` upcoming
- Mobile: `queueRepository.getNowPlaying`, `getUpcoming`

## Verification

```bash
npm run mobile:e2e:test -- library
```

## Depends on

- 10.1–10.2
