# 03 — Fast startup and the serial sync queue

**Cursor model:** Opus 5
**Reasoning:** extra high
**Detail:** [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)
**Master step:** P2.4.8
**Depends on:** 02

Read [00-SUMMARY.md](00-SUMMARY.md) and
[`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc) before starting.

## Goal

The app reaches an interactive screen without waiting on any network request, and every background
network operation runs one at a time through a queue that can report its own progress.

## Work

1. Build the serial sync queue under `apps/mobile/src/sync/`. One job in flight; FIFO with a small
   priority notion so a user-triggered refresh precedes an opportunistic background pass. A job
   declares `kind`, an i18n `label`, `run`, and a `dedupeKey`.
2. Expose queue state — running job label, completed count, total count, idle/active — through a
   provider that prompt 04 renders. **The total may grow while a run is in progress**, because a job
   may enqueue follow-up work as it discovers it. Model that honestly rather than pretending the
   denominator is fixed.
3. Make failure isolation explicit: a failing job is skipped, recorded, and the run continues. One
   bad channel must not abort a library sync. Expose a listener seam for failures so prompt 05 can
   attach a persistent sink without changing the queue.
4. Take the network off the startup path. `hydrateFromSecureStorage`
   (`apps/mobile/src/auth/AuthProvider.tsx:112-195`) resolves auth from SecureStore plus the cached
   account snapshot — both local — and enqueues the refresh instead of awaiting it. The splash may
   wait only for SQLite init and i18n.
5. Move these into jobs: `accountRepository.refresh` (split so `/auth/me` and subscription hydration
   are separate jobs, and the up-to-25-page loop in `subscriptionsRepository.ts:85-137` is one job
   per page or batch), followed-playlist hydration, the native library-browse projection, the queue
   launch hydrate in `QueuesProvider.tsx:93-114`, and push device registration in
   `syncAccountPrefs.ts:59-64`.
6. Wire triggers: app foreground, connectivity restore, sign-in, and pull-to-refresh. A trigger
   enqueues; it never runs work inline.
7. Unit tests for serialization, dedupe collapsing, dynamic total growth, failure isolation, and
   trigger-to-enqueue behavior.

## Constraints

- **Do not queue interactive work.** Tapping Subscribe, opening a screen, search, and playback
  resolution stay immediate. If a human is watching a spinner they triggered, it is not a sync job.
- Leave the 60s notifications badge poll, listen-stats POSTs, and the queue cache's stale background
  refresh outside the queue for now, and say so in your summary rather than silently skipping them.
- Keep `refreshAccessTokenSingleFlight` (`authRequestWithRefresh.ts:14-64`) orthogonal — it is a
  prerequisite of individual requests in both lanes, not a job.
- Reuse `readThrough` / `writeBehind` / `syncMetadata` (`src/sync/`) rather than duplicating them.
- Do not run tests during implementation.

## Watch for

The 8s abort budget (`AuthProvider.tsx:29`) exists because the boot refresh could hang. Once nothing
network-bound gates the splash, say whether that budget still has a job to do or is now dead weight.

## Done when

A cold start with the network disabled reaches an interactive, cache-populated screen with no
network wait, and enabling the network drains a visible-in-state queue one job at a time.
