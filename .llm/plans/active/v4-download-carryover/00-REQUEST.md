# Request — v4 download carryover

Recorded 2026-11-15. No worktree. Runs in this checkout on `feature/v4-migration-followups`.
One set. Matching and deleting share one job; a second slug would delete files a later match
could have kept.

## Request

> does the v4 to v5 migration account for what should happen to downloaded media files? will they gracefully rollover to v5? we want them ideally to align with feeds that match them in v5 api db, but also if for whatever reason they can, they should migrate to the add by rss experience, and either way they should at least not become totally hidden from the user so they can not clear them from their storage. is this properly accounted for?
>
> also, apparently our v4 to v5 ios storage migration tests passed, and android is still running right now

> do you think it is possible to bring them into v5? if yes, create /abcplan but intend to do it on this same branch. the goal will be to make them best effort migrate to v5. if whatever reason old v4 media cannot migrate we at least want to delete them locally so they don't occupy storage in a lost state. if you think verification is necessary through testing then you can do that and probably should use the Podcasting 2.0 rss feed for test purposes (can use the remote feed, add it to local db if not already present, do whatever is necessary). if you think this should be split up into separate plan runs then do that. ask any questions you need to. if you conclude that it is flat out not possible to migrate v4 to v5 downloaded media then say that.

It is possible. An in-place update keeps the app sandbox. v4 already stored the file and the
episode id, guid, media URL, titles, and feed URL. This set specifies that best-effort carryover.
The invoking chat does not implement it.

## Operator answers

- **Unmigratable file:** Delete the file with no screen. Record a count in the device error log.
  A file still waiting on a lookup or a parse stays on disk until that attempt finishes. Offline
  is not a failed match.
- **Episode missing from the parsed feed:** Keep it on that Add by RSS feed as a local episode,
  so it still plays and the listener can delete it. The host being down, or the episode having
  left the feed, is not a reason to delete the file.
- **Same branch:** this checkout, `feature/v4-migration-followups`. Do not open a worktree.

The earlier sentence "either way they should at least not become totally hidden" applies to a
file that did migrate (directory episode, Add by RSS episode, or the local episode above). A
file that cannot migrate is deleted, not listed.

## Glossary

- "if for whatever reason they can" means "if for whatever reason they cannot".
- Add by RSS is the phone's own feed follow, not a directory channel.
- v4 is the production app (`podverse-rn`). v5 is this monorepo's `apps/mobile`.
- Podcasting 2.0 RSS feed is the worker list entry titled Podcasting 2.0, Podcast Index id
  `920666`, in `apps/workers/src/commands/parser/rss/parsePodcasting20Feeds.ts`.

## Orientation

Checked in this checkout. Planners start here.

- Signed-out carryover reads four AsyncStorage keys and never downloads.
  `apps/mobile/src/migration/v4/readV4LocalState.ts` (`V4_LOCAL_STATE_KEYS`).
  `apps/mobile/src/migration/v4/planV4Carryover.ts` subscribes or saves an Add by RSS feed.
- v4 finished files are `{episode.id}{ext}` in the background-downloader documents directory.
  Add by RSS uses the same pattern; that id is `downloadCustomFileNameId` in
  `../podverse-rn/src/lib/hash.ts` (trimmed base64 of the media path, query stripped).
  Metadata is AsyncStorage `DOWNLOADED_PODCASTS` (`../podverse-rn/src/lib/downloadedPodcast.ts`),
  including guid, media URL, titles, and feed URL. In-progress ids are `DOWNLOADING_EPISODES`.
  Android may store files in a listener-chosen folder, key `EXT_STORAGE_DLOAD_LOCATION`
  (`../podverse-rn/src/lib/downloader.ts`, `getDownloadedFilePath`).
- v5 indexes files only under `documentDirectory/downloads/`, and stores the file name, not an
  absolute path, because the iOS container UUID changes on update.
  `apps/mobile/src/downloads/downloadStorage.ts` (`resolveStoredDownloadFilePath`).
  A v4 path joined through that helper lands in the wrong folder.
- My Library → Downloads lists download rows and can remove them. That screen does not play.
  `apps/mobile/src/downloads/README.md`. A kept local episode has to appear on the Add by RSS
  feed's episode list to be playable.
- When an Add by RSS feed later matches a directory channel, download rows are rewritten onto
  the directory episode, guid then enclosure URL.
  `apps/mobile/src/data/addByRssPromotionRemap.ts`.
- Proposal: `docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md`. Downloads
  are best-effort and explicitly out of the storage spike. A blocked show (`spam` or `takedown`)
  is dropped and never becomes an Add by RSS feed. Do not edit doc 08 from this set. The
  operator copies spike results there separately.
- The iOS and Android storage/field spikes both passed. They only prove
  `SUBSCRIBED_PODCAST_IDS` and `ADD_BY_RSS_PODCAST_FEED_URLS` (and outline counts).
  They do not read `DOWNLOADED_PODCASTS` or media files. Counts are in
  [08 open questions](/docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md#open-questions)
  and [`.llm/plans/completed/android-v4-storage-spike/FINDINGS.md`](/.llm/plans/completed/android-v4-storage-spike/FINDINGS.md).
- User-facing copy in `docs/proposals/v4-to-v5-migration/10-user-communication.md` says not to
  promise a local file the app cannot map. Leave that sentence until this job exists.
- Verification may use the remote Podcasting 2.0 feed and may add it to the local database
  when it is not already there. Planning does not run tests. The plan's Tests section names
  what the operator runs.
