# 717-fast-startup-and-sync-queue

**Master step:** P2.4.8
**Model (author + implement):** Opus 5
**Status:** done
**Runs before:** [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)

## Scope

Get the app interactive as fast as feasible, and move every network-bound operation behind a single
serial background queue that reports progress. This is the foundation the sync indicator
([718](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)) and the
sync event log ([719](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md))
render, and the thing 702's content sync registers into.

Policy lives in [`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc).

## What blocks startup today

`hydrateFromSecureStorage` (`apps/mobile/src/auth/AuthProvider.tsx:112-195`) already renders a cached
account before refreshing, but it then awaits `accountRepository.refresh`, which chains:

`GET /auth/me` → SQLite write → `syncFromAccount` → followed-playlist hydration → native
library-browse projection (`accountRepository.ts:169-189`).

`syncFromAccount` pages `reqChannelGetMany` up to **25 pages**
(`subscriptionsRepository.ts:85-137`), and the splash holds for `status !== 'unknown'` under an 8s
budget (`App.tsx:131-132`, `AuthProvider.tsx:29`). A first launch after login — tokens present, no
cached snapshot yet — pays that whole chain before the app is usable.

Concurrent with it: the queue launch hydrate (`QueuesProvider.tsx:93-114`), push device
registration (`syncAccountPrefs.ts:59-64`), and anonymous playback restore
(`PlaybackProvider.tsx:717-729`) all fire independently.

## Target

Splash waits for local work only: SQLite open/migrations and i18n. Auth resolves from SecureStore
plus the cached account snapshot — both local — so the shell renders immediately at the correct
signed-in state. Every network call above becomes a queued job.

## The queue

A single serial runner. One job in flight; the rest wait in FIFO with a small priority notion so a
user-triggered refresh jumps ahead of an opportunistic background pass.

A job declares:

| Field       | Purpose                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `kind`      | Stable identifier, used for dedupe and for the log                        |
| `label`     | i18n key for the indicator — what the user is told is happening           |
| `run`       | The work; may enqueue follow-up jobs as it discovers them                 |
| `dedupeKey` | Collapses an already-queued equivalent rather than queueing a second copy |

**Dynamic totals are expected.** A subscriptions job discovers N channels and enqueues N item-fetch
jobs, so the denominator grows mid-run. Model progress as completed/total where total may increase;
do not fake a fixed denominator.

### Lanes

Only background reconciliation is queued. Interactive work — tapping Subscribe, opening a screen,
search, playback resolution — runs immediately and is never queued, or a user waits behind a library
sync. Token refresh stays orthogonal: it is a prerequisite of individual requests in both lanes.

### Triggers

App foreground, connectivity restore, sign-in, pull-to-refresh, and explicit user actions. A trigger
enqueues; it never runs work inline.

## Migration into the queue

Move these off the boot path and into jobs (see the inventory in
[Sync inventory](#sync-inventory) below for the full set that exists today):

- `accountRepository.refresh` — split so the `/auth/me` read and the subscription hydration are
  separate jobs; the paged loop becomes one job per page or per batch.
- Followed-playlist hydration and native library-browse projection.
- Queue launch hydrate (`QueuesProvider`).
- Push device registration and locale reconciliation.

Leave alone for now, and say so explicitly rather than silently: the 60s notifications badge poll,
listen-stats POSTs, and the queue cache's stale background refresh. They are small, already
fire-and-forget, and folding them in would make the indicator noisy for no user benefit. Revisit if
they show up in profiling.

## Acceptance criteria

- Cold start with a populated database reaches an interactive screen without waiting on any network
  request, measured with the network disabled and with a slow-network profile.
- Cold start with tokens and **no** cached account snapshot still renders the shell immediately;
  account details fill in behind the indicator.
- Exactly one sync job runs at a time; a second trigger while one is running does not start parallel
  work.
- An equivalent job queued twice collapses to one.
- A user tapping Subscribe during a full sync gets an immediate response, not a queued wait.
- The queue drains to empty and stays empty until the next trigger.
- Unit tests cover serialization, dedupe, dynamic total growth, failure isolation (one failing job
  does not abort the run), and trigger-to-enqueue behavior.

## Sync inventory

The operations this must account for, as they exist today:

**Boot:** SQLite init (`db/index.ts:4-25`), i18n (`i18n/index.ts:9-29`), auth hydrate chain
(`AuthProvider.tsx:112-195`), auto-queue prefs (`AutoQueueProvider.tsx:38-44`), anonymous playback
restore (`PlaybackProvider.tsx:717-729`).

**Auth change:** login token exchange, sign-up subscription merge
(`subscriptionsSignupMerge.ts:62-64`), account refresh, post-auth sync
(`syncAccountPrefs.ts:48-71`), queue launch hydrate (`QueuesProvider.tsx:93-114`), FCM rotation
(`fcmDeviceSync.ts:113-133`), logout revoke.

**Screen/user:** `subscriptionsRepository.syncFromAccount`, queue read-throughs
(`queueRepository.ts:182-309`, 5m TTL), auto-queue fills (`autoQueueRepository.ts:18-110`, always
live), add-by-RSS reconcile and add-with-poll (`useAddByRssFeeds.ts:34-53`,
`useAddByRssAddFlow.ts:59-117`), OPML import poll (`useOpmlImport.ts:78-131`, up to 100×3s), profile
bundles, notification inbox list/markSeen, per-screen detail loads.

**Background/timer:** notifications badge poll (60s), FCM token rotation, stale queue refresh,
download queue (already serial — `downloadManager.ts:157-175`).

**Existing primitives to reuse rather than duplicate:** `refreshAccessTokenSingleFlight`
(`authRequestWithRefresh.ts:14-64`), `readThrough`/`writeBehind` (`sync/syncScheduler.ts:23-110`),
`syncMetadata` watermarks (`sync/syncMetadata.ts:9-44`), `downloadManager`'s FIFO.

## As built

`apps/mobile/src/sync/` is the orchestration layer; the data-layer primitives it was expected to
reuse stay at `apps/mobile/src/data/sync/`, reached through the repositories the jobs call.

| Module                       | Role                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `syncQueue.ts`               | The runner. No React Native or Expo imports, so its semantics are unit-testable in node |
| `syncJobKinds.ts`            | The job kinds and their i18n label keys                                                 |
| `syncJobPlan.ts`             | Trigger + auth status → which root jobs to enqueue. Pure, and tested                    |
| `syncJobs.ts`                | Job bodies. Orchestration only; every request and write belongs to a repository         |
| `syncErrorClassification.ts` | Failure → stable error code plus whether it means offline                               |
| `SyncProvider.tsx`           | Wires `AppState` and NetInfo to the queue and publishes its state                       |

Root jobs are account refresh, queue hydrate, and push registration. Everything else — the
subscription pages, the commit, followed playlists, the library projection — is enqueued by the job
that discovers it, which is what makes the run total grow mid-run.

**Timeouts.** `DEFAULT_SYNC_JOB_TIMEOUT_MS` is 20s per job, with an `AbortController` passed into the
job so a timeout closes the socket. A serial queue is only as available as its head job, so this
budget protects everything queued behind a hung request.

**Offline.** A failure classified as offline parks the run in place rather than walking every
remaining job into the same wall; NetInfo resuming, or any `user`-priority enqueue, restarts it.

**Session death.** A 401 that survives the token-refresh attempt ends the session from inside the
account-refresh job, which raises the forced-logout notice
([716](/docs/proposals/mobile/_master-plan_/phase-2/details/716-forced-logout-notice.md)). No other
failure signs anyone out, so an offline device stays signed in.

**Left outside the queue, deliberately:** the 60s notifications badge poll, listen-stats POSTs, and
the queue cache's stale background refresh, as scoped above.

**Native dependency:** `@react-native-community/netinfo` supplies the connectivity-restore trigger,
so this step requires `npm run mobile:prebuild` and a dev client rebuild.

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
