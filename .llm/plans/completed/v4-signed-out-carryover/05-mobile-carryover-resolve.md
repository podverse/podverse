# 05 — Mobile: resolve staged v4 rows into subscriptions and Add by RSS feeds

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Gate — check before anything else

Same gate as `04-mobile-carryover-read.md`, plus: `apps/mobile/src/data/repositories/v4CarryoverRepository.ts`
must exist (04 finished). Otherwise change nothing and end with
`RUNNER-STATUS: BLOCKED — storage spike not recorded as passing in doc 08 § Open questions`.

## What this does

A queued sync job turns staged rows into local state, following doc 08
§ Signed-out carryover rules. It reuses the directory match from `add-by-rss-directory-match` by
saving unmatched shows as signed-out Add by RSS feeds and asking the next Add by RSS refresh to
run its directory match right away.

## Rows

R1, R2, R3, R4

## Runs after

02 (lookup route and client), 04 (staging), and `add-by-rss-directory-match` 03 (signed-out
promotion in the refresh job).

## Files

- `apps/mobile/src/migration/v4/planV4Carryover.ts` (new, pure)
- `apps/mobile/src/migration/v4/planV4Carryover.test.ts` (new)
- `apps/mobile/src/migration/v4/runV4Carryover.ts` (new)
- `apps/mobile/src/data/repositories/addByRssRepository.ts` (one new method)
- `apps/mobile/src/data/repositories/subscriptionsMerge.ts` (one new mapper)
- `apps/mobile/src/sync/syncJobKinds.ts` and its test
- `apps/mobile/src/sync/syncJobs.ts` (`buildSyncJobs`, the new job, and an export that clears the
  directory-match pacing timestamp plan 03 of the previous set added)
- `apps/mobile/src/sync/syncJobPlan.ts` (only if job inclusion is decided there)
- `apps/mobile/src/screens/more/errorLogPresentation.ts`
- `packages/i18n-catalog/mobile/originals/{en-US,es,fr,el-GR}.json` (then `npm run i18n:compile`)
- `tools/web/seed-e2e.mjs` (legacy map fixture rows)
- `apps/mobile/e2e/v4-carryover-anonymous.yaml` (new) and its registration in
  `scripts/mobile/e2e-test.sh`, `apps/mobile/e2e/HOW-TO-RUN.md`,
  `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`
- `release-notes/scratchpad.md`

## 1. Pure plan

`planV4Carryover(entries: V4StagedEntry[], answers: Map<string, DTOLegacyPodcastLookupAnswer>)`
returns, per entry, one action:

| Entry | Answer | Action | New status |
| --- | --- | --- | --- |
| `podcast` | `channel` | subscribe to the channel | `subscribed` |
| `podcast` | `feed_url` | save Add by RSS with the answer's URL and `cachedTitle` | `add_by_rss` |
| `podcast` | `blocked` | nothing; count it | `blocked` |
| `podcast` | `not_here`, cached URL | save Add by RSS with `cachedFeedUrl` | `add_by_rss` |
| `podcast` | `not_here`, no cached URL | nothing | `waiting` |
| `podcast` | no answer (request failed) | nothing | unchanged |
| `add_by_rss` | n/a | save Add by RSS with `legacyId` and `cachedTitle` | `add_by_rss` |

`blocked` wins over a cached URL (doc 08 rule 4). Two entries that resolve to the same channel or
the same canonical URL produce one action.

## 2. Job

New job kind `v4-carryover` in `SYNC_JOB_KINDS`, label key `sync.job.v4_carryover`
(English: `Moving Your Podcasts`). `buildSyncJobs` includes it when all are true: signed out,
`v4CarryoverRepository.isCopyAllowed()`, and at least one row is `pending`, or `waiting` with
this app session not yet having retried waiting rows (module-level flag).

`runV4Carryover(context)`:

1. Load `pending` rows (plus `waiting` once per session).
2. `podcast` rows: chunk by `LEGACY_PODCAST_LOOKUP_MAX_IDS`, `requestWithoutMobileAuth` →
   `reqLegacyPodcastLookup({ podcast_ids, install_id: await getOrCreateInstallationId() })`
   (`apps/mobile/src/push/installationId.ts`).
3. `planV4Carryover`, then apply:
   - subscribe: `subscriptionsRepository.subscribeLocal(subscribedChannelFromLookup(channel))`.
     Add `subscribedChannelFromLookup` to `subscriptionsMerge.ts`, building the same row
     `mapDirectoryChannelToSubscribed` builds (same `source`, `kind` from medium) from
     `id_text`, `title`, `medium_id`, `image_url`.
   - Add by RSS: new `addByRssRepository.addSignedOutFeedStub({ feedUrl, title })`. It writes the
     followed row `ensureLocalFeedFromFollow` (L1884) writes, with `signed_out_owned = 1`,
     `followed_at = now`, no mapped feed, and skips a URL already stored. Confirm
     `listDeviceRefreshFeedUrls` returns a never-parsed stub; if it does not, make it.
4. Write statuses per row; `bumpAttempts` for rows left unchanged.
5. If any Add by RSS stub was written: clear the directory-match pacing timestamp, then
   `requestAddByRssRefresh()`. The refresh job promotes stubs that match the directory and
   device-parses the rest.
6. One device log entry: `syncEventLogRepository.append({ errorCode: 'v4_carryover_done',
   jobKind: 'v4-carryover', outcome: 'reconciled', message: null, details: { subscribed,
   addByRss, blocked, waiting } })`. Add `error_log.v4_carryover_done` (English: `Podcasts Moved
   from the Previous App`) and map it in `errorLogPresentation.ts`, showing the counts.
7. `homeFeedRefresh.notify()`.

Network and server errors: handle them the way the listed-feed resolve job does
(`runListedFeedResolveWork` in `addByRssRepository.ts`): rows stay `pending` and the job runs
again on a later sync. Never show an error in the UI.

Signed in when the job would run: skip; the rows stay `pending` (settled decision 5).

## 3. E2E seed and flow

In `tools/web/seed-e2e.mjs`, insert `legacy_id_map` rows for the fixture ids exported by
`apps/mobile/src/migration/v4/e2eFixture.ts`:

- mapped to the seeded directory channel used by other mobile flows (`status 'mapped'`,
  `v5_id_text` its id_text);
- `unresolved` with `v4_feed_url` `http://localhost:2111/feeds/feed-podcast-1.rss` (not a
  directory channel in the seed);
- `dropped` (blocked).

`v4-carryover-anonymous.yaml`: `launchApp` with `clearState`, `openLink` to the fixture deep
link from 04, then assert on My Library that the directory show and the Add by RSS feed title
appear and no row exists for the blocked id. Use the waits in **mobile-maestro-timeouts**.

## Tests

`planV4Carryover.test.ts`: every row of the table, blocked beating a cached URL, duplicates
collapsing, failed lookup leaving rows unchanged.

## Release scratchpad

```markdown
## Mobile carries signed-out v4 subscriptions over

- Surfaces: mobile
- Change: after updating from v4, a signed-out phone resolves its old subscriptions in the
  background ("Moving Your Podcasts"). Shows Podverse has become regular subscriptions. Shows it
  has not become Add by RSS feeds on the phone and move to the directory once Podverse has them.
  Shows v4 flagged as spam or takedown are left out. Results are counted in the error log.
- Who notices: signed-out v4 users after the update
- Operator steps: run `v4WriteLegacyPodcastMap` before this build ships
```
