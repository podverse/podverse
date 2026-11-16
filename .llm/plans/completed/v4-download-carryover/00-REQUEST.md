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

### Review of the first planning pass

Recorded 2026-11-15. These settle D1–D27. Quotes are the operator's choices. A choice that
matches the planner is confirmed. A choice that differs is the one the second pass must apply.
Do not reopen a confirmed choice.

- **D1 confirmed.** "A small native module asks Android for the real folder."
- **D2 confirmed.** Unnamed files are scanned only in v4's own app folders. Do not scan the
  cache or the listener-chosen folder for unnamed files. Files the list does name are still
  handled from the list.
- **D3 confirmed.** "Cancel v4's unfinished download jobs so they cannot finish later and leave
  a new file."
- **D4 reversed.** "Retry on later launches. A thrown read is not an empty list, and it must
  not lead to deleting those files." Do not treat three thrown reads as an empty list, and do
  not stage those files as orphans because the read threw.
- **D5 reversed, with a setting.** "Keep that setting" and "we need it in the ui so users can
  enable or disable it if they want too (only on android if ios cannot support it)." Off sends
  new downloads to the app's private folder. "Files already in the chosen folder stay there,
  and still play and delete." On uses the v4 folder when one is already saved. iOS has no
  control.
- **D6 reversed.** "Delete the files when the feed is removed."
- **D7 confirmed.** "Delete the carried file and keep the existing download."
- **D8 reversed.** "Promote the show to the directory, and keep that file playable on the
  show's episode list until the listener deletes it."
- **D9 reversed.** "Run the account's promotion, and keep that file playable on the directory
  show's episode list until the listener deletes it."
- **D10 confirmed, and widened by D11.** "On that feed's episode list and in Downloads until
  the listener deletes the file. Play is the local file only."
- **D11 reversed.** The show stays a directory subscription. A downloaded episode that leaves
  the feed stays on that show's episode list and in Downloads until the listener deletes the
  file. This is every download, not only a v4 file, and it is not a real Add by RSS follow.
  "if the user deletes the media file, that content reference should be removed from locally
  because we can't assume it can even download again so we need to align it with server data."
  Play uses the local file. Deleting the file removes that local row. What remains is whatever
  the server still lists.
- **D12 confirmed.** "A followed feed, including that auto-download default." This is the
  signed-out phone feed. The signed-in path is D14.
- **D13 confirmed.** "Delete it. Do not start a new download."
- **D14 reversed.** The pass runs signed in or signed out. "Use the account follow when the
  membership can accept it, within that account's cap. If the server refuses, keep the file
  playable in Downloads and do not create a hidden signed-out feed. Signed out, the phone
  keeps the feed itself."
- **D15 confirmed.** "No. Match or delete the files without waiting."
- **D16 confirmed.** "Only after the directory says it is not there with no feed URL, or the
  same copy fails 5 times. Network errors and offline do not delete it."
- **D17 confirmed.** "Ask the directory match during this pass, and attach the file to the
  directory episode when it matches."
- **D18 confirmed.** "Its own label, so the bar can say this pass is the downloads."
- **D19 confirmed only after a successful read.** "Delete it. It cannot be attached to an
  episode." A thrown read is D4 and does not delete.
- **D20 confirmed.** "Redo a half-finished copy. Treat a row as already done only when this
  pass wrote it."
- **D21 confirmed.** "Use the committed copy of four episodes for the test."
- **D22 confirmed.** "Use 276 through 274, with 273 as the local-only episode."
- **D23 confirmed.** "Two files, so a pass shows which path matched."
- **D24 confirmed.** "Leave the podcast guid off the seeded channel so the Add by RSS copy
  stays Add by RSS for the test."
- **D25 reversed.** "Check the planted files are gone, and check the log counts."
- **D26 confirmed.** "Cover those paths in unit and integration tests. Maestro keeps the main
  path."
- **D27 confirmed.** "Leave the note. Rewrite it after the job ships."
- **Models.** "Yes. Remaining planning and the implementation run use Cursor Grok 4.7."
  Destructive download plans and the Android folder setting stay at extra high reasoning.
