# 310-queue-store

**Master step:** 10.1
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement mobile queue store mirroring web `QueuesProvider` boundaries.
- Own: queues list, active queue, upcoming resources; expose RN context/hooks.
- Read/write through `queueRepository` (Track 9b.4) — screens must not call `req*` directly.
- Replace play stubs later; this step lands the store + provider shell.

## Architecture notes

Mirror `apps/web/src/contexts/Queue.tsx` (`QueuesProvider`, `useQueues`). Keep provider thin:
repository owns persistence/sync; store owns in-memory UI state. Active queue selection
delegates to 10.3 (`getQueueForMedium`). Launch hydration is 10.2.

## Edge cases / cross-track deps

- Anonymous vs logged-in: empty queues vs server queues (see 10.18–10.19)
- Offline: show last SQLite snapshot; mark stale until sync
- Cross-track: 9b.4 repo methods (`getPrimaryQueue`, `getNowPlaying`, `getUpcoming`, `getHistoryPage`);
  Track 12 reads projected cache, not this store

## Acceptance criteria

- `QueuesProvider`-equivalent mounts at app root (with auth-aware hydrate)
- Hooks expose queues / activeQueue / upcoming with stable setters
- Mutations go through repository; native-cache projection hooks remain wired
- Unit-testable pure selectors where practical (no native in Vitest)

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- Web: `apps/web/src/contexts/Queue.tsx`
- Mobile: `apps/mobile/src/data/repositories/queueRepository.ts`

## Verification

```bash
# operator: unit when added under apps/mobile
npm run test -w @podverse/playback-core
npm run mobile:e2e:test -- library
```

## Depends on

- 9b.4 / 493-data-layer-queue-repo
