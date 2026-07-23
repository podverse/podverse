# 03 — Auto-queue store, playlist/channel sources, prefs

Implement master steps **10.8–10.11**.

## Detail docs

- [317-auto-queue-store](/docs/proposals/mobile/_master-plan_/details/317-auto-queue-store.md)
- [318-auto-queue-playlist-sources](/docs/proposals/mobile/_master-plan_/details/318-auto-queue-playlist-sources.md)
- [319-auto-queue-channel-sources](/docs/proposals/mobile/_master-plan_/details/319-auto-queue-channel-sources.md)
- [320-auto-queue-prefs-storage](/docs/proposals/mobile/_master-plan_/details/320-auto-queue-prefs-storage.md)

## Tasks

1. Add `AutoQueueProvider` / hooks mirroring `apps/web/src/contexts/AutoQueue.tsx` (config,
   resources map, active row; reuse or port `checkIsActiveRowHighestKey` /
   `autoQueueIncrementActiveRow`).
2. Loader for playlist sequential/random sources.
3. Loader for channel pub-date / season / shuffle sources (repo-mediated fetches).
4. Persist shuffle/repeat prefs with web cookie key parity `aqc.rd` / `aqc.rp` in device prefs
   (not SQLite).
5. Mark **10.8–10.11** / **317–320** `done`.

## Acceptance

- Manual upcoming remains separate from auto-queue
- Playlist and channel modes advance without crash on empty/exhausted sources
- Prefs survive restart

Do not run tests during agent work.
