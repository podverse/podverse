# 05 — Anonymous snapshot, login reconcile, playlist seed, stats, native-cache writes

Implement master steps **10.18–10.22**.

## Detail docs

- [327-anonymous-playback-snapshot](/docs/proposals/mobile/_master-plan_/details/327-anonymous-playback-snapshot.md)
- [328-anonymous-login-reconcile](/docs/proposals/mobile/_master-plan_/details/328-anonymous-login-reconcile.md)
- [329-playlist-play-seed-autoqueue](/docs/proposals/mobile/_master-plan_/details/329-playlist-play-seed-autoqueue.md)
- [330-stats-tracking](/docs/proposals/mobile/_master-plan_/details/330-stats-tracking.md)
- [331-native-cache-queue-write](/docs/proposals/mobile/_master-plan_/details/331-native-cache-queue-write.md)

## Tasks

1. Port `anonymousPlaybackStorage` semantics to RN device prefs; write on anonymous play/queue.
2. On login, reconcile snapshot to server queue (web `AnonymousPlaybackRestoreController` order
   relative to hydrate); clear snapshot on success.
3. Playlist row play seeds auto-queue config (feeds 10.9).
4. Wire `reqStats*` for play intents; non-blocking on failure.
5. Audit all queue/auto-queue mutation paths call `projectQueueSnapshotToNativeCache` exactly once
   per successful commit (stub storage OK).
6. Mark **10.18–10.22** / **327–331** `done`.

## Acceptance

- Anonymous restart restores now-playing
- Login merge/replace matches web rules without blind wipe
- `rg projectQueueSnapshotToNativeCache apps/mobile/src` shows call sites on mutation paths

Do not run tests during agent work.
