# 01 — Queue store, launch hydrate, active-by-medium, now-playing, load-active

Implement master steps **10.1–10.5**.

## Detail docs

- [310-queue-store](/docs/proposals/mobile/_master-plan_/details/310-queue-store.md)
- [311-queue-launch-hydration](/docs/proposals/mobile/_master-plan_/details/311-queue-launch-hydration.md)
- [312-active-queue-by-medium](/docs/proposals/mobile/_master-plan_/details/312-active-queue-by-medium.md)
- [313-queue-now-playing-upcoming](/docs/proposals/mobile/_master-plan_/details/313-queue-now-playing-upcoming.md)
- [314-hook-queue-load-active](/docs/proposals/mobile/_master-plan_/details/314-hook-queue-load-active.md)

## Tasks

1. Add RN `QueuesProvider` / `useQueues` mirroring `apps/web/src/contexts/Queue.tsx` boundaries;
   mount in app providers. Persist/read via `queueRepository` only.
2. Launch hydration after auth bootstrap: sync all queues + abridged index into repo then store
   (skip authenticated endpoints when anonymous).
3. Resolve `activeQueue` with `getQueueForMedium` from `@podverse/helpers`.
4. Load now-playing + upcoming through repository (`getNowPlaying` / `getUpcoming` + sync).
5. Port `useQueueResourcesLoadActive` semantics to RN (compose store + repo; idempotent).
6. Mark **10.1–10.5** / **310–314** `done`.

## Acceptance

- Provider at root; hooks stable; no `req*` from screens
- Logged-in cold start hydrates; anonymous does not hit auth queue APIs
- Active queue tracks media-type preference
- Offline shows last SQLite snapshot

Do not run tests during agent work.
