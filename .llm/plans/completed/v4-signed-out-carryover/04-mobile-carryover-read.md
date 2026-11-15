# 04 — Mobile: read v4 signed-out state once into a staging table

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Gate — check before anything else

Open `docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md` § Open questions.
The first bullet ("Spike result, per platform") must record that `SUBSCRIBED_PODCAST_IDS` or
`ADD_BY_RSS_PODCAST_FEED_URLS` came back on an in-place install for **at least one** platform.
If it still says "Not run", or both platforms failed, change nothing and end with:

`RUNNER-STATUS: BLOCKED — storage spike not recorded as passing in doc 08 § Open questions`

If only one platform passed, build for both and note in your final message that the other
platform will read nothing (the reader already treats a missing key as empty).

## What this does

On the first launch of this build, after first paint, read the v4 AsyncStorage keys once and
save them as staged rows. Nothing is resolved here (05 does that). The read never blocks first
paint and never runs twice.

## Rows

R3

## Runs after

01–03 (phase order). No shared files.

## Files

- `apps/mobile/src/migration/v4/readV4LocalState.ts` (new)
- `apps/mobile/src/migration/v4/parseV4LocalState.ts` (new, pure)
- `apps/mobile/src/migration/v4/parseV4LocalState.test.ts` (new)
- `apps/mobile/src/migration/v4/e2eFixture.ts` (new)
- `apps/mobile/src/data/db/schema.ts`
- `apps/mobile/src/data/db/migrations.ts` and its test
- `apps/mobile/src/data/repositories/v4CarryoverRepository.ts` (new)
- `apps/mobile/src/data/repositories/index.ts`
- the startup place that runs one-time work after first paint (find where the first sync run is
  requested after the root navigator mounts: `rg -n "requestSync|startSync" apps/mobile/src/app*
  apps/mobile/src/App* apps/mobile/src/bootstrap*`; add one call beside it)
- `release-notes/scratchpad.md`

## 1. Pure parse

`parseV4LocalState(raw: { subscribedPodcastIds: string | null; subscribedPodcasts: string | null;
addByRssFeedUrls: string | null; addByRssPodcasts: string | null }): V4StagedEntry[]`

- Each input is the AsyncStorage string or null. Parse with a safe JSON parse; anything that is
  not the expected shape reads as empty. Never throw.
- `SUBSCRIBED_PODCAST_IDS`: array of non-empty strings → one `podcast` entry each.
- `SUBSCRIBED_PODCASTS`: array of objects; for an `id` already in the list, attach
  `cachedTitle` (`title` string) and `cachedFeedUrl` (`feedUrls[0].url` string, http/https only).
  Objects whose id is not in the id list are ignored.
- `ADD_BY_RSS_PODCAST_FEED_URLS`: array of strings → one `add_by_rss` entry each, keyed by
  `canonicalAddByRSSFeedUrl`; drop nulls and duplicates.
- `ADD_BY_RSS_PODCASTS`: attach `cachedTitle` by `addByRSSPodcastFeedUrl` (canonicalized).
- Never read `ADD_BY_RSS_PODCASTS_CREDENTIALS`, the bearer token, or the Keychain. A URL with
  userinfo is kept with the userinfo removed (`splitFeedUrlUserinfo`); the password is not kept.

```ts
export type V4StagedEntry = {
  legacyKind: 'podcast' | 'add_by_rss';
  legacyId: string;          // v4 podcast id, or canonical feed URL
  cachedFeedUrl: string | null;
  cachedTitle: string | null;
};
```

## 2. Storage

New table `v4_carryover_entry` (forward-only migration, next version):

| Column | Type | Notes |
| --- | --- | --- |
| `legacy_kind` | text not null | `podcast` or `add_by_rss` |
| `legacy_id` | text not null | primary key with `legacy_kind` |
| `cached_feed_url` | text | |
| `cached_title` | text | |
| `status` | text not null | `pending`, `subscribed`, `add_by_rss`, `blocked`, `waiting` |
| `attempts` | integer not null default 0 | |
| `updated_at` | integer not null | |

`kv_meta` keys, written through the existing kv helper:

- `v4_carryover.read_at` — set once the read finishes (even when it found nothing). This is the
  `localMigrationCompleted` flag from doc 08.
- `v4_carryover.copy_allowed` — `'1'` when 05 may resolve. This prompt sets it right after the
  read, because no Continue Migration screen exists yet. Prompt 06 changes when it is set.

`v4CarryoverRepository`: `hasRead()`, `saveRead(entries)` (insert-or-ignore, then set `read_at`
in one transaction), `isCopyAllowed()`, `setCopyAllowed()`, `listByStatus(statuses)`,
`setStatus(legacyKind, legacyId, status)`, `bumpAttempts(...)`, `counts()`.

## 3. Reader

`readV4LocalState.ts` `runV4CarryoverReadOnce()`:

1. Return when `hasRead()`.
2. `AsyncStorage.multiGet` the four keys (`@react-native-async-storage/async-storage`, already a
   dependency).
3. `parseV4LocalState`, `saveRead`, then `setCopyAllowed()`.
4. Log counts with `logger.info` (entries by kind, with cached URL, with cached title). No ids,
   URLs, or titles.
5. Catch everything: on error, log and set `read_at` anyway, so a broken store does not retry on
   every launch.

Call it once from the after-first-paint startup spot, without `await` in the render path.

## 4. E2E fixture

E2E Metro serves every Maestro flow, so a build-time flag would plant v4 data in all of them.
Use an E2E-only deep link instead.

`e2eFixture.ts` `runV4E2eFixture()`: guarded by `__DEV__ && getMobileConfig().isE2e` (the same
guard as `apps/mobile/src/auth/e2eSessionReset.ts`). It writes fixture values for the four keys
with `AsyncStorage.multiSet`, clears `v4_carryover.read_at` and the staged rows, then calls
`runV4CarryoverReadOnce()`. Fixture contents: one v4 podcast id the API seed maps to a channel,
one that maps to `feed_url`, one `blocked`, one unknown id with a cached URL, and one Add by RSS
URL. Export the ids and URLs as constants from `e2eFixture.ts`; plan 05 adds the matching API
seed rows with the same values.

Handle the path `e2e/v4-fixture` on the app's own URL scheme (read the scheme from
`apps/mobile/app.config.ts`). Add the handler where the app listens for incoming links
(`rg -n "Linking\.(addEventListener|getInitialURL)" apps/mobile/src`), behind the same guard, and
do not add it to the navigation `linking` config.

## Tests

`parseV4LocalState.test.ts`: malformed JSON, wrong shapes, ids with and without cached objects,
non-http cached URL dropped, duplicate and trailing-slash Add by RSS URLs, userinfo removed,
credentials key never read (the function has no input for it). Migration test for the new
version.

## Release scratchpad

```markdown
## Mobile reads v4 signed-out subscriptions once

- Surfaces: mobile
- Change: on the first launch after updating from v4, the app reads the v4 subscription ids, the
  cached podcast list, and Add by RSS addresses from the old storage once, after the first screen
  shows, and keeps them on the phone for the carryover. It never reads saved passwords or the old
  sign-in token.
- Who notices: no one yet; the next change uses these rows
- Operator steps: none
```
