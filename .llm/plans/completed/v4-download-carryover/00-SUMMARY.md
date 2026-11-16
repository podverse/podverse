# Summary — v4 download carryover

Request: [00-REQUEST.md](00-REQUEST.md). Runs in this checkout on `feature/v4-migration-followups`.
Models and order: [COPY-PASTA.md](COPY-PASTA.md) and [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

The job: after the in-place update from v4, find every media file v4 downloaded, match it to a
directory episode when the v5 database knows it, otherwise to an Add by RSS feed (and its episode,
or a kept local episode), and delete only the files that cannot migrate. Migrated files stay
listed and deletable. Unmigratable files are deleted with no screen and counted in the error log.

## Requirement ledger

Quotes are the request's words. Operator answers are quoted from § Operator answers. Area letters
are defined under § Areas. Plan numbers come from each plan's `## Rows`.

- **R1** (area D) "does the v4 to v5 migration account for what should happen to downloaded media files?" — Plan: 42
- **R2** (area D) "will they gracefully rollover to v5?" — Plan: 42
- **R3** (areas A, D) "we want them ideally to align with feeds that match them in v5 api db" — Plan: 10, 41, 42
- **R4** (area D) "but also if for whatever reason they can, they should migrate to the add by rss experience" (glossary: "can" means "cannot") — Plan: 41, 42
- **R5** (areas C, D) "and either way they should at least not become totally hidden from the user so they can not clear them from their storage" (operator: applies to a file that did migrate — directory episode, Add by RSS episode, or kept local episode; a file that cannot migrate is deleted, not listed) — Plan: 30, 31, 32, 42
- **R6** (area D) "is this properly accounted for?" — Plan: 42
- **R7** (area E) "also, apparently our v4 to v5 ios storage migration tests passed, and android is still running right now" (both spikes passed; neither reads `DOWNLOADED_PODCASTS` or media files) — Plan: 51
- **R8** (area D) "do you think it is possible to bring them into v5?" (request answers yes) — Plan: 42
- **R9** (area E) "if yes, create /abcplan but intend to do it on this same branch" (operator: this checkout, no worktree) — Plan: 51
- **R10** (area D) "the goal will be to make them best effort migrate to v5" — Plan: 20, 21, 42
- **R11** (area D) "if whatever reason old v4 media cannot migrate we at least want to delete them locally so they don't occupy storage in a lost state" — Plan: 20, 21, 41, 42
- **R12** (area E) "if you think verification is necessary through testing then you can do that and probably should use the Podcasting 2.0 rss feed for test purposes" — Plan: 50, 51
- **R13** (area E) "(can use the remote feed, add it to local db if not already present, do whatever is necessary)" — Plan: 50
- **R14** (area E) "if you think this should be split up into separate plan runs then do that" (request settles: one set, because matching and deleting share one job) — Plan: 51
- **R15** (area E) "ask any questions you need to" (settled by § Operator answers) — Plan: 51
- **R16** (area D) "if you conclude that it is flat out not possible to migrate v4 to v5 downloaded media then say that" (request answers: it is possible) — Plan: 42
- **R17** (area D) Unmigratable file: "Delete the file with no screen." — Plan: 20, 41, 42
- **R18** (area D) Unmigratable file: "Record a count in the device error log." — Plan: 40, 42
- **R19** (area D) "A file still waiting on a lookup or a parse stays on disk until that attempt finishes." — Plan: 21, 41, 42
- **R20** (area D) "Offline is not a failed match." — Plan: 41, 42
- **R21** (area C) Episode missing from the parsed feed: "Keep it on that Add by RSS feed as a local episode, so it still plays and the listener can delete it." — Plan: 30, 31, 32
- **R22** (areas C, D) "The host being down, or the episode having left the feed, is not a reason to delete the file." — Plan: 30, 32, 41, 42
- **R23** (areas C, D) Review D11: a download that leaves its feed stays on that show's episode list and in Downloads until the listener deletes the file. Every download, not only v4. The show stays a directory subscription. Deleting the file removes the local row. — Plan: 31, 32, 41
- **R24** (area C) Review D6: "Delete the files when the feed is removed." — Plan: 30
- **R25** (area D) Review D14: signed in, use the account follow when the membership can accept it, within that account's cap. If the server refuses, keep the file playable in Downloads and do not create a hidden signed-out feed. — Plan: 42
- **R26** (area F) Review D5: Android chosen-folder setting with an on/off control. Off sends new downloads to the private folder. Files already there stay, play, and delete. iOS has no control. — Plan: 60
- **R27** (area E) Review D25: "Check the planted files are gone, and check the log counts." — Plan: 51
- **R28** (area B) Review D4: a thrown read is retried, is not an empty list, and must not delete files. — Plan: 21, 41

Rows R1, R2, R6, R8, and R16 are questions. Area D's plan answers them in a short `## Answers`
section: today the carryover never reads downloads; with this set, files migrate best effort.

Rows R9, R14, and R15 are set-level. Area E's plan records them in a `## Set notes` section so
Close can map them; they need no code.

## Areas

Each area step researches its own rows and writes plans only inside its number block.

### Area A — Legacy episode lookup (API)

- **Rows:** R3 (server side).
- **Plan block:** 10–19.
- **Starts from:** `apps/api/src/routes/legacy.ts`, `apps/api/src/controllers/legacy.ts`,
  `packages/orm/src/services/legacy/legacyPodcastLookup.ts`,
  `packages/helpers-requests/src/api/legacy/legacyPodcastLookup.ts`,
  `packages/orm/src/entities/legacyIdMap.ts`, `apps/api/openapi.yml`,
  `apps/api/src/test/legacy-podcast-lookup.integration.test.ts`.
- **Scope:** a signed-out lookup the phone calls with what v4 stored per download (v4 episode
  id, v4 podcast id, guid, media URL) and that answers the v5 item `id_text` and channel when the
  database knows it. `legacy_id_map` allows `episode` rows, but the library copy
  (`apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`) writes them only for
  episodes in an account's library, so most signed-out downloads need a guid-then-media-URL match
  inside the mapped channel. Same rate-limit and install-id shape as the podcast lookup.
- **Depends on:** none.
- **Shared files:** `packages/helpers/src/dtos/index.ts` (DTO barrel; area A only in this set).
  `tools/web/seed-e2e.mjs` is area E's; area A's integration test seeds its own rows.

### Area B — Read v4 download state and locate files (mobile)

- **Rows:** none alone; supplies R10, R11, R17, and R19 with the staged rows and file helpers
  area D acts on. Its plans list the rows they serve.
- **Plan block:** 20–29.
- **Starts from:** `apps/mobile/src/migration/v4/readV4LocalState.ts`,
  `apps/mobile/src/migration/v4/parseV4LocalState.ts`,
  `apps/mobile/src/data/repositories/v4CarryoverRepository.ts`, the SQLite schema and migrations
  under `apps/mobile/src/data/db/`, `apps/mobile/src/downloads/downloadStorage.ts`. Legacy
  sources: `../podverse-rn/src/lib/downloadedPodcast.ts` (`DOWNLOADED_PODCASTS`),
  `../podverse-rn/src/lib/downloader.ts` (`DOWNLOADING_EPISODES`, `EXT_STORAGE_DLOAD_LOCATION`,
  `getDownloadedFilePath`), `../podverse-rn/src/lib/hash.ts` (`downloadCustomFileNameId`).
- **Scope:** read and parse the v4 download keys once, stage one row per file with what v4
  stored, and provide the file-system helpers: locate a v4 file on iOS and Android (including the
  listener-chosen Android folder), adopt it into `documentDirectory/downloads/` under v5 naming,
  and delete it. Includes in-progress and partial files.
- **Depends on:** none.
- **Shared files:** `v4CarryoverRepository.ts` and the mobile SQLite schema/migration list (area C
  may also add a SQLite migration; Close orders them and the later one takes the next number).

### Area C — Add by RSS local episode (mobile)

- **Rows:** R21, R22 (the Add by RSS half), R5 (the Add by RSS half).
- **Plan block:** 30–39.
- **Starts from:** `apps/mobile/src/data/repositories/addByRssRepository.ts`, the Add by RSS
  refresh and parse merge (signed-out device parse), the Add by RSS feed episode list screen,
  `apps/mobile/src/data/addByRssPromotionRemap.ts`, `apps/mobile/src/downloads/README.md`.
- **Scope:** a device-local episode on an Add by RSS feed that is backed only by a downloaded
  file: it lists on that feed's episode list, plays from the file, and the listener can delete
  it. It survives a refresh that no longer lists it, a host that is down, and promotion of the
  feed to a directory channel. Expose one repository entry point area D calls.
- **Depends on:** none.
- **Shared files:** `addByRssRepository.ts` (area D calls it), mobile SQLite schema/migration
  list (with area B), i18n catalog originals under `packages/i18n-catalog/*/originals/` (area D
  may add error-log labels).

### Area D — Carryover engine: match, adopt, or delete (mobile)

- **Rows:** R1, R2, R3 (client side), R4, R5 (directory half), R6, R8, R10, R11, R16, R17, R18,
  R19, R20, R22 (the deletion rule).
- **Plan block:** 40–49.
- **Starts from:** `apps/mobile/src/migration/v4/runV4Carryover.ts`,
  `apps/mobile/src/migration/v4/planV4Carryover.ts`,
  `apps/mobile/src/data/repositories/downloadsRepository.ts`,
  `apps/mobile/src/downloads/downloadStore.ts`, `syncEventLogRepository` and
  `SYNC_EVENT_DETAIL_KEYS`, `apps/mobile/src/data/addByRssPromotionRemap.ts` (guid then
  enclosure URL matching precedent).
- **Scope:** resolve each staged file: directory episode through area A's lookup, else Add by
  RSS feed and episode, else area C's local episode, else delete. Write `complete` download rows
  for adopted files so they show in My Library → Downloads and on the episode. Keep a file on
  disk while its lookup or parse is outstanding or the phone is offline. Blocked shows (`spam`,
  `takedown`) are dropped per doc 08, so their files are unmigratable. Record one count entry in
  the error log. Settle how the job behaves if the listener signs in before it finishes.
- **Depends on:** A (lookup route and DTO), B (staged rows, file helpers), C (local-episode entry
  point).
- **Shared files:** `runV4Carryover.ts`, `v4CarryoverRepository.ts` (with B),
  `addByRssRepository.ts` (with C), `downloadsRepository.ts`, i18n catalogs (with C).

### Area E — Verification with the Podcasting 2.0 feed

- **Rows:** R7, R9, R12, R13, R14, R15.
- **Plan block:** 50–59.
- **Starts from:** `apps/mobile/src/migration/v4/e2eFixture.ts`,
  `apps/mobile/e2e/v4-carryover-anonymous.yaml`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `tools/web/seed-e2e.mjs` (already seeds `legacy_id_map`),
  `apps/workers/src/commands/parser/rss/parsePodcasting20Feeds.ts` (Podcasting 2.0, Podcast Index
  id `920666`), `.llm/plans/completed/android-v4-storage-spike/FINDINGS.md`.
- **Scope:** an E2E path that plants v4 download keys and files, seeds or parses the Podcasting
  2.0 feed into the local database with matching legacy rows, and proves the three outcomes
  (directory episode, Add by RSS episode or local episode, deleted). Decide remote feed versus a
  local test-assets copy for repeatability. State in the plan that the passed storage spikes do
  not cover downloads, and record the set-level rows under `## Set notes`. Do not edit doc 08.
  Doc 10's sentence about not promising an unmapped local file: say in `## Decisions` whether
  this set changes it.
- **Depends on:** A, B, C, D.
- **Shared files:** `e2eFixture.ts`, `tools/web/seed-e2e.mjs`, Maestro flows under
  `apps/mobile/e2e/`.

## Waves

| Wave | Step | Area | Plan block | Depends on |
| --- | --- | --- | --- | --- |
| 1 | 02 | A — Legacy episode lookup (API) | 10–19 | none |
| 1 | 03 | B — Read v4 download state and locate files | 20–29 | none |
| 1 | 04 | C — Add by RSS local episode | 30–39 | none |
| 2 | 05 | D — Carryover engine | 40–49 | 02, 03, 04 |
| 3 | 06 | E — Verification with Podcasting 2.0 | 50–59 | 02, 03, 04, 05 |

Area D waits because it calls the route area A creates, reads the rows area B stages, and calls
the entry point area C adds. Area E waits for all four because its fixture and seed exercise
their seams.

## Decisions to review

Product choices the area steps made that the request did not settle. Each item names the choice,
the main alternative, its step, and its plan. Step 02 (area A, plans 10–19) recorded none.

### Step 03 — area B, read v4 download state and locate files

- **D1** (step 03, plan 20) Android external files folder: a native module finds the real folder. Alternative: guess the path from `documentDirectory`, which avoids a native rebuild but is fragile.
- **D2** (step 03, plans 20 and 21) Untracked files are staged as orphans only from v4's own app folders; the cache folder and the listener's shared folder are never scanned. Alternatives: no orphan staging at all, or scan the shared folder too.
- **D3** (step 03, plan 20) Late-finishing Android downloads: a helper removes v4's unfinished download-manager jobs so files do not appear after the read. Alternative: ignore files that finish late.
- **D4** (step 03, plan 21) Key-read failure: the download keys are read on their own, and a failure retries for 3 launches before staging orphans only. Alternative: mark the read done on the first failure.
- **D5** (step 03, plan 20) A shared folder v5 cannot read, or an Android 9 plain path, is reported as unreachable, and no storage permission is requested. Alternative: request storage permission.

### Step 04 — area C, Add by RSS local episode

- **D6** (step 04, plan 30) Removing a feed keeps its local episodes, hidden. They come back if the same feed URL is added again, and the file stays deletable in Library → Downloads. Alternative: delete them with the feed.
- **D7** (step 04, plan 30) A carried file that duplicates an existing download is deleted (a later parse lists the same episode and this phone already has a download for it), so only one file is kept. Alternative: keep both files.
- **D8** (step 04, plan 31) Promotion waits on this phone while it would strand a local episode. The feed stays Add by RSS until the listener deletes that episode or the directory learns it. Alternative: promote anyway and leave the file only in Library → Downloads, deletable but not playable.
- **D9** (step 04, plan 31) Promotions the account already made still run (`promoteFollowedDirectoryChannel` and convert's `not_followed` branch). An unmatched file then stays only in Library → Downloads, because holding would put the phone out of step with the account. The planner saw no workable alternative.
- **D10** (step 04, plan 32) Keeping an episode that leaves the feed applies to every Add by RSS download, not only carried files. Alternatives: limit it to carried files (needs a "came from v4" marker on download rows), or drop plan 32. Without plan 32, a carried file adopted as a feed episode that later leaves the feed is reachable only from Library → Downloads. Plans 30 and 31 do not depend on plan 32.

### Step 05 — area D, carryover engine

- **D11** (step 05, plan 41) A file whose show is in the directory but whose episode is not goes to that show's feed as Add by RSS (a local episode if the feed dropped it). Alternative: a download row on the directory channel that cannot play.
- **D12** (step 05, plan 42) Add by RSS files use a followed signed-out feed stub, which seeds auto-download. Alternative: an unfollowed stub; not workable, because unfollowed feeds are pruned.
- **D13** (step 05, plan 41) Unfinished v4 downloads are deleted. Alternative: download them again in v5.
- **D14** (step 05, plan 42) The pass runs signed in or signed out. Alternative: signed out only.
- **D15** (step 05, plan 42) The pass does not wait for the continue-migration screen. Alternative: wait for the listener's library choice.
- **D16** (step 05, plan 41) Only an episode the directory reports as not there (with no feed URL), or a copy that keeps failing, is deleted, after 5 tries; HTTP failures and offline never delete. Alternative: delete on the first failed answer.
- **D17** (step 05, plans 41 and 42) Files from Add by RSS feeds call the directory match route directly. Alternative: let promotion move them later.
- **D18** (step 05, plan 40) The job has its own sync label. Alternative: reuse the subscription carryover label.
- **D19** (step 05, plan 41) Files no v4 list names are deleted even when the list read failed. Alternative: keep them until a list read succeeds. Combined with D4: after 3 failed key reads, plan 21 stages every file in v4's own folders as an orphan, and plan 41 deletes every orphan, so a key read that fails on 3 launches deletes all of v4's downloads in its own folders.
- **D20** (step 05, plan 42) A pass resuming after a crash checks that it wrote the matching download row itself before treating that row as a duplicate; a copy left half-finished is redone. Alternative: treat any file already in `downloads/` as adopted.

### Step 06 — area E, verification with Podcasting 2.0

- **D21** (step 06, plan 50) Committed copy of the feed, not the live feed: the seed holds four real episodes copied on 2026-11-15, and test-assets serves a trimmed copy for the Add by RSS half. Alternative: parse `https://mp3s.nashownotes.com/pc20rss.xml` before each run with `devParserRSSParsePodcasting20Feeds` (needs the network and a Podcast Index key, writes the dev database instead of the E2E one, changes weekly).
- **D22** (step 06, plan 50) Episode window 276–274, with 273 as the local episode. Alternative: the newest episodes (skipped because 277's title is profane).
- **D23** (step 06, plans 50 and 51) Each lookup path gets its own file: the 275 file has no guid and an older media URL, so only the mapped episode row answers it; the 274 file is answered by guid. Alternative: one file any path could answer, which would not show which path worked.
- **D24** (step 06, plan 50) No `podcast_guid` on the seeded channel, so the Add by RSS copy is not promoted to the directory channel during the run. Alternative: copy the real guid for fidelity.
- **D25** (step 06, plan 51) Deletion is proven by the error-log counts (Files Deleted 3, Files Not Found 0); the flow does not inspect the file system. Alternative: an E2E-only marker that lists the planted files still on disk.
- **D26** (step 06, plan 51) Several paths are left to unit and integration tests: the waiting and offline answers, the `channel`, `feed_url`, and `not_here` answers, nested base64 keys, and the media-URL match. Alternative: retries across relaunches in Maestro.
- **D27** (step 06, plan 51) Doc 10 is not edited. Its sentence about not promising an unmapped local file still holds, because partial, unnamed, and blocked-show files are still deleted; this set maps more files than doc 10 assumed (carried files with no feed item become local episodes). Rewriting the backup sentence is left to the operator after the job ships, as `00-REQUEST.md` asks. Alternative: rewrite it now.

## Order

- First planning pass: steps 02–06 per § Waves.
- Review of the first planning pass: answers are in `00-REQUEST.md`. Second pass amends the
  plans those answers change and adds the Android folder setting. Confirmed choices stay.
- Close: implementation phases are in `00-EXECUTION-ORDER.md`. Prompts share a phase only when
  their files are disjoint. SQLite migrations land as plan 30, then 21, then 32, each taking the
  next version. The plans and `00-REQUEST.md` § Review are the decisions. § Decisions to review
  below is the first-pass record, including choices the operator later reversed.
