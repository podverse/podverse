# 04 — Downloads pause/resume and outbox gating

**Cursor model:** Codex 5.3
**Reasoning:** high

Detail doc:
[779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)
· Decisions: [00-SUMMARY.md](00-SUMMARY.md) · Depends on: [01](01-connectivity-machine-and-store.md),
[02](02-sensors-and-sync-wiring.md)

May run in parallel with [03](03-offline-status-and-banner.md) **if** two agents are splitting the
files. One agent doing both should run them in sequence.

## Scope

Stop the two background loops that currently burn through failures when the network is gone, and
resume them when it returns. Both read `isEffectivelyOffline()` from `net/connectivity`; neither
becomes a stricter gate than that.

## Files

### `apps/mobile/src/downloads/downloadManager.ts`

**In-flight transfers.** The module-level subscription at the bottom pauses everything when the pref
flips on:

```677:682:apps/mobile/src/downloads/downloadManager.ts
// When Offline Mode turns on, pause every in-flight transfer so nothing keeps using the network.
void subscribeOfflineMode((enabled) => {
  if (enabled) {
    void downloadManager.pauseAll();
  }
});
```

Extend this to react to **effective** offline: pause in-flight transfers when the app becomes
effectively offline for any reason, and **auto-resume** when it returns to online *and* the pref is
off. Do not resume while the pref is on — the user asked for no network.

Resume only transfers this mechanism paused. A download the **user** paused must stay paused, or
connectivity returning silently restarts work they deliberately stopped. If the download records
cannot currently distinguish an auto-pause from a user pause, add that distinction — a field on the
in-memory store record is enough, and it does not need to survive a restart (after a cold start
nothing is in flight anyway).

**Enqueue stays pref-only.** Leave this exactly as it is:

```395:398:apps/mobile/src/downloads/downloadManager.ts
    if (isOfflineModeEnabled()) {
      return { ok: false, reason: 'offline_mode' };
    }
```

Under auto-offline a new download **queues** and starts when we are back. Rejecting it would mean a
user who taps Download in a tunnel gets nothing and has to remember to tap again, and it would give
the app one less reason to retry the network.

**Progress discipline.** Whatever you add must not run per byte-callback — no SQLite write, no
native-cache projection, no filesystem walk on a progress tick
([`mobile-progress-ux-and-notification-channels`](/.cursor/rules/mobile-progress-ux-and-notification-channels.mdc)).
Pause and resume are set-membership changes, so use the coarse notification channel, and wrap a bulk
pause or resume in `downloadStore.batch` so forty rows do not each wake every subscriber.

### `apps/mobile/src/data/repositories/playbackOutboxRepository.ts`

`drain` loops on the pref only, in two places:

```1021:1021:apps/mobile/src/data/repositories/playbackOutboxRepository.ts
    while (!isOfflineModeEnabled()) {
```

```1043:1045:apps/mobile/src/data/repositories/playbackOutboxRepository.ts
      for (const [queueIdText, rows] of byQueue.entries()) {
        if (isOfflineModeEnabled()) {
          break;
        }
```

Under auto-offline that loop grinds through batches of a 500-event outbox, failing each one. Gate
both on `isEffectivelyOffline()` instead.

Returning early must leave the outbox **intact** — undelivered events stay queued for the next
replay. Confirm the partial-batch path already behaves that way and does not delete rows it failed
to deliver. Replay resumes through the existing `playback-replay` sync job, which must still run
before `queue-hydrate`
([`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc)).

Do not change the 500-event cap, the oldest-first eviction, the position-collapse, or the sticky
completion semantics ([`mobile-offline-mode`](/.cursor/rules/mobile-offline-mode.mdc) § Playback is
recorded while parked).

### `apps/mobile/src/lib/playback/resolvePlaybackUrl.ts`

**Unchanged** — deliberately. Confirm it still gates on `isOfflineModeEnabled()` only:

```42:42:apps/mobile/src/lib/playback/resolvePlaybackUrl.ts
  if (isOfflineModeEnabled()) {
```

Remote streaming stays allowed under auto-offline. A media host can be reachable when our API is
not, and a stream attempt is itself useful evidence. Only the manual toggle restricts playback to a
completed local `file://`.

If you find yourself wanting to add `isEffectivelyOffline()` here, re-read
[00-SUMMARY.md](00-SUMMARY.md) § Locked decisions first.

## Ownership

Files this step owns: `downloadManager.ts` and `playbackOutboxRepository.ts` (and the download store
record shape, if you add the auto-pause distinction).

Do not touch: the banner, `prefs/offlineMode.ts`, the i18n catalog, `SyncProvider.tsx`,
`syncErrorClassification.ts`, or anything under `net/`.

## Do not

- Do not reject `downloadManager.enqueue` on auto-offline.
- Do not resume a download the user paused.
- Do not gate `resolvePlaybackUrl` on effective offline.
- Do not delete outbox rows that failed to deliver.
- Do not add work to a progress tick.

## Verification

Operator commands only; do not run them.

```bash
npm run build:packages
npm --prefix apps/mobile run test
```
