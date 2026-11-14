**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Stage pick

Return the v4 account ids for one rehearsal stage. Pilot is about 100 accounts
chosen by rule when the call runs. Sample is 1,000 accounts in a stable random
order. Full is every account. The function reads v4 with `SELECT` only. It does
not write `pick.json`, the phase-status table, or a worker registration.

Doc 16 "Stages" is the spec. Counts in the docs and in `_WAKE-UP.md` are
examples from an older snapshot. Do not copy those counts into code, comments,
or tests. The only v4 id that may appear in this change is `eFv5NFx`.

R8 is the three stage sizes: a small rule-picked set, then a larger random set,
then every account. This plan does not run the stages and does not run the
phases inside a stage. Area H does that, and it calls this function once at the
start of each stage.

## Rows

R8, R27, R42, R43, R45

## Runs after

none

## Files

- `apps/workers/src/commands/orm/v4Rehearsal/pickStageAccountsLib.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/pickStageAccountsLib.test.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/pickStageAccounts.ts`

Do not create `apps/workers/src/commands/orm/v4Rehearsal/index.ts`. Do not edit
the worker registry, `apps/workers/src/commands/index.ts`,
`categoriesForCommand.ts`, `apps/workers/package.json`, `apps/workers/ENV.md`,
doc 16, or the library-copy files. Do not add a linear migration.

## Tests

Unit tests only, in `pickStageAccountsLib.test.ts`. Vitest already includes
`apps/workers/src/**/*.test.ts`. Import from `./pickStageAccountsLib.js`. Do
not import `pickStageAccounts.ts` (that module opens `pg`). No live database,
no API integration, no Playwright, no Maestro.

Cases, each one behavior:

1. Pilot keeps an earlier rule when the same id is also in a later list, fills
   with `random` until 100, and does not repeat an id.
2. When rule matches already number 100 or more, the result keeps every one of
   them and adds no `random` row.
3. When a rule's first ids were already used, the slot takes the next unused id
   in that list, until the slot is full or the list ends. Cover
   `largest_playlist_size` after `largest_playlists` has taken the same id, and
   the paid slot (the far expiry first, then soonest, cap 5, no duplicate).
4. `email_case_twin` keeps every unused id in its list even when that pushes
   the result past 100.
5. Sample returns at most 1000 rows, rule `random`, in the given order. Fewer
   ids returns all of them. Full returns every id, rule `all`, in the given
   order, with no cap. A missing rehearsal id adds no `rehearsal` row and does
   not throw.
6. A non-string or empty id throws `Could not read v4 accounts.` The thrown
   message does not contain the bad value.

Use short fixture ids such as `a1`. The rehearsal fixture uses the exported
`REHEARSAL_V4_ID`. One assertion checks the exported thresholds: pilot 100,
sample 1000, Add by RSS 100, directory follows 500, playlist resources 10000.

## Release scratchpad

none

## What the caller gets

```typescript
export async function pickStageAccounts(input: {
  connectionString: string;
  stage: StageName;
  seed: string;
  now: Date;
}): Promise<StageAccountPick[]>
```

`StageName` is `'pilot' | 'sample' | 'full'`.

`StageAccountPick` is `{ v4Id: string; rule: StagePickRule }`.

`StagePickRule` is exactly one of:

`rehearsal`, `largest_add_by_rss`, `largest_subscriptions`, `largest_clips`,
`largest_history`, `largest_playlists`, `largest_playlist_size`,
`just_over_add_by_rss`, `just_over_directory_follows`,
`just_over_playlist_size`, `email_case_twin`, `paid`, `trial`, `expired`,
`unverified`, `follows_account`, `default_playlist`, `no_activity`, `random`,
`all`.

Area E stores this array as `pick.json` (v4 id and rule only). Area H passes
the connection string, the stage, the run id as `seed`, and one `Date` as
`now`. H uses `result.length` as the stage total. It must not assume 100 or
1000 when the snapshot has fewer accounts, or when pilot rule matches run past
100.

Same `seed`, same `now`, and the same snapshot return the same ids. Membership
rows depend on `now`. H keeps the array it got (E writes it). A later call with
a newer `now` can change who is `paid`, `trial`, or `expired`.

## Constants

Export these from `pickStageAccountsLib.ts`. The SQL file imports them and
binds them as parameters. Do not paste the numbers a second time.

| Name | Value | Use |
| --- | --- | --- |
| `REHEARSAL_V4_ID` | `eFv5NFx` | The only hardcoded v4 id |
| `PILOT_TARGET` | 100 | Random fill stops here |
| `SAMPLE_TARGET` | 1000 | Sample cap |
| `ADD_BY_RSS_CAP_DEFAULT` | 100 | Just-over threshold. Doc 07 default |
| `DIRECTORY_FOLLOW_CAP_DEFAULT` | 500 | Just-over threshold. Doc 07 default |
| `PLAYLIST_RESOURCE_CAP` | 10000 | Just-over threshold. `enforce_playlist_resource_limit` |
| `LARGEST_QUERY_LIMIT` | 8 | Rows each largest query returns |
| `SQL_MATCH_LIMIT` | 64 | Rows each other slotted query returns |
| `JUST_OVER_LIMIT` | 3 | Slot size |
| `TWIN_GROUP_LIMIT` | 5 | Email groups, not accounts |
| `UNVERIFIED_WITH_LISTS_LIMIT` | 3 | Slot size |
| `UNVERIFIED_WITHOUT_LISTS_LIMIT` | 2 | Slot size |
| `MEMBERSHIP_LIMIT` | 5 | Slot size for paid, trial, and expired |
| `FOLLOWS_ACCOUNT_LIMIT` | 5 | Slot size |
| `DEFAULT_PLAYLIST_LIMIT` | 5 | Slot size |
| `NO_ACTIVITY_LIMIT` | 5 | Slot size |

`CARRIED_TRIAL_WINDOW_DAYS` stays in
`apps/workers/src/commands/orm/v4Identity/seedAccountIdentityLib.ts`. The SQL
file imports it from `../v4Identity/seedAccountIdentityLib.js` and binds it.
Do not copy the number 90.

## Assembler

`assembleStagePick` in the lib file is pure. No `pg`, no clock, no env.

```typescript
export type PilotMatchLists = {
  rehearsal: readonly string[];
  largest_add_by_rss: readonly string[];
  largest_subscriptions: readonly string[];
  largest_clips: readonly string[];
  largest_history: readonly string[];
  largest_playlists: readonly string[];
  largest_playlist_size: readonly string[];
  just_over_add_by_rss: readonly string[];
  just_over_directory_follows: readonly string[];
  just_over_playlist_size: readonly string[];
  email_case_twin: readonly string[];
  paid_far: readonly string[];
  paid_soon: readonly string[];
  trial: readonly string[];
  expired: readonly string[];
  unverified_with_lists: readonly string[];
  unverified_without_lists: readonly string[];
  follows_account: readonly string[];
  default_playlist: readonly string[];
  no_activity: readonly string[];
};

export type AssembleStagePickInput =
  | { stage: 'pilot'; matches: PilotMatchLists; randomIds: readonly string[] }
  | { stage: 'sample'; randomIds: readonly string[] }
  | { stage: 'full'; fullIds: readonly string[] };

export function assembleStagePick(input: AssembleStagePickInput): StageAccountPick[]
```

Walk pilot rules in this order. An id keeps the first rule that takes it.
Later lists skip an id already taken, then take the next id, until that slot
is full or the list ends. SQL returns extra rows (`LARGEST_QUERY_LIMIT` or
`SQL_MATCH_LIMIT`) so a collision does not empty the slot.

1. `rehearsal` — at most one, and only when the id equals `REHEARSAL_V4_ID`.
   Any other id in that list is ignored. An empty list adds nothing.
2. `largest_add_by_rss` — 1
3. `largest_subscriptions` — 1
4. `largest_clips` — 1
5. `largest_history` — 1
6. `largest_playlists` — 1
7. `largest_playlist_size` — 1
8. `just_over_add_by_rss` — 3
9. `just_over_directory_follows` — 3
10. `just_over_playlist_size` — 3
11. `email_case_twin` — every unused id in the list. No slot cap.
12. `paid` — build one list: unused ids from `paid_far`, then unused ids from
    `paid_soon`, stop at 5. One rule name, `paid`.
13. `trial` — 5
14. `expired` — 5
15. `unverified` — unused ids from `unverified_with_lists` up to 3, then unused
    ids from `unverified_without_lists` up to 2. One rule name, `unverified`.
16. `follows_account` — 5
17. `default_playlist` — 5
18. `no_activity` — 5
19. If the result is still shorter than `PILOT_TARGET`, append unused ids from
    `randomIds` with rule `random` until the length is `PILOT_TARGET` or the
    list ends. If the result is already at or past the target, add none.

Sample ignores match lists. Walk `randomIds`, drop a repeated id, stop at
`SAMPLE_TARGET`, rule `random`. Full ignores match lists and `randomIds`. Walk
`fullIds`, drop a repeated id, rule `all`, no cap. Order is the input order.

On every id the stage actually reads, a value that is not a string, or a
string whose trim is empty, throws `Error('Could not read v4 accounts.')`.
Do not put the value in the message. Do not skip it. Do not trim a valid id
before returning it.

Export `PILOT_RULE_ORDER` as the nineteen rule names in the walk above,
including `random` last. `all` is not in that list.

## Reader

`pickStageAccounts.ts` follows the `pg` `Client` style in
`seedAccountIdentity.ts` (`new Client({ connectionString })`, `connect`,
`query`, `end` in `finally`). Named export `pickStageAccounts`. No command
handler, no help text, no logger.

Before any read:

- Trim `connectionString`. Empty throws `Missing V4_DATABASE_URL.`
- `stage` must be `pilot`, `sample`, or `full`. Anything else throws
  `Unknown stage.`
- Trim `seed`. Empty throws `Missing stage seed.` Full requires it too, and
  then ignores it for ordering.
- `now` must be a `Date` whose `getTime()` is not `NaN`. Otherwise throw
  `Missing stage clock.`

Connect, then run these two statements on that client:

```sql
SET TIME ZONE 'UTC'
```

```sql
SET default_transaction_read_only = on
```

Queries are sequential on that one client. No `Promise.all`.

Wrap a connection or query failure as
`new Error('Could not read v4 accounts.', { cause: error })`. If the error
message is already one of the five messages above, rethrow it. Never append
`error.message`, a connection string, an email, or a row.

A query that returns ids uses `client.query<{ id: string }>(sql, values)`.
Read `row.id`. The assembler checks the type. Select lists return `id` only.
The email-group query may read `email` inside SQL. Node must not receive it.

Pilot runs every rule query, then one random-order query of every id.
Sample runs only the random-order query with `LIMIT`. Full runs only the
id-order query. Do not call `isValidNanoIdV2IdText`. Do not check `DB_HOST`.
A v4 id the identity command would reject still belongs in the list.

### Counts

Non-blank distinct values. `btrim` of null is null and fails the `<> ''`
check, so null elements drop out. This matches the copy, which drops a blank
string and inserts one row per distinct feed or follow.

Add by RSS, on `users` `u`:

```sql
(
  SELECT COUNT(DISTINCT btrim(url))::int
  FROM unnest(COALESCE(u."addByRSSPodcastFeedUrls", ARRAY[]::varchar[])) AS url
  WHERE btrim(url) <> ''
)
```

Subscriptions, same shape on `u."subscribedPodcastIds"`.

Directory follows, the sum of three of those counts: `subscribedPodcastIds`,
`subscribedPlaylistIds`, and `subscribedUserIds`. That is the doc 07 total
(subscribed channels, followed playlists, followed accounts).

Clips are non-official `mediaRefs`: `"isOfficialChapter" IS NOT TRUE AND
"isOfficialSoundBite" IS NOT TRUE`, grouped by `"ownerId"`. Official chapters
and soundbites are not clips. The copy skips them.

Playlist size is the sum of `playlists_episodes_episodes` rows and
`playlists_media_refs_media_refs` rows for that playlist. Those are the
resources the copy inserts. The v5 trigger `enforce_playlist_resource_limit`
rejects the insert that would pass 10000, so just-over is `member_count >
PLAYLIST_RESOURCE_CAP`. Exactly 10000 is not just-over.

Queue, history, and now playing have no just-over rule. Doc 07 says those
groups do not refuse a copied row. Do not add a query for the queue trigger.

"Has lists", for unverified and for no-activity, is the identity usage
predicate, not the distinct non-blank count. An account the seed treats as
used must not land in `no_activity`.

```sql
cardinality(COALESCE(u."subscribedPodcastIds", ARRAY[]::varchar[])) > 0
OR cardinality(COALESCE(u."subscribedPlaylistIds", ARRAY[]::varchar[])) > 0
OR cardinality(COALESCE(u."subscribedUserIds", ARRAY[]::varchar[])) > 0
OR cardinality(COALESCE(u."addByRSSPodcastFeedUrls", ARRAY[]::varchar[])) > 0
```

No-activity is the negation of that predicate, plus no row in
`"userHistoryItems"`, `"userQueueItems"`, `"userNowPlayingItems"`, `playlists`,
or non-official `"mediaRefs"` for that `"ownerId"`.

### Queries

Bind limits and thresholds from the constants. `$now` is the `Date` argument.
Column names match `copyAccountLibrary.ts` and `seedAccountIdentity.ts`.

Rehearsal:

```sql
SELECT id
FROM users
WHERE id = $1
```

`$1` is `REHEARSAL_V4_ID`.

Largest Add by RSS. Largest subscriptions is the same shape on
`subscribedPodcastIds`. `LIMIT` is `LARGEST_QUERY_LIMIT`. The assembler keeps
one unused id. A max of 0 adds nobody because of `n > 0`.

```sql
SELECT u.id
FROM users u
CROSS JOIN LATERAL (
  SELECT COUNT(DISTINCT btrim(url))::int AS n
  FROM unnest(COALESCE(u."addByRSSPodcastFeedUrls", ARRAY[]::varchar[])) AS url
  WHERE btrim(url) <> ''
) counts
WHERE counts.n > 0
ORDER BY counts.n DESC, u.id ASC
LIMIT $1
```

Largest clips:

```sql
SELECT "ownerId" AS id
FROM "mediaRefs"
WHERE "ownerId" IS NOT NULL
  AND "isOfficialChapter" IS NOT TRUE
  AND "isOfficialSoundBite" IS NOT TRUE
GROUP BY "ownerId"
ORDER BY COUNT(*) DESC, "ownerId" ASC
LIMIT $1
```

Largest history, same shape on `"userHistoryItems"."ownerId"`. Largest
playlists, same shape on `playlists."ownerId"`.

Largest playlist size, and the just-over playlist query, share this inner
select:

```sql
SELECT p."ownerId" AS owner_id,
       p.id AS playlist_id,
       COALESCE(ep.n, 0) + COALESCE(mr.n, 0) AS member_count
FROM playlists p
LEFT JOIN (
  SELECT "playlistsId", COUNT(*)::int AS n
  FROM playlists_episodes_episodes
  GROUP BY "playlistsId"
) ep ON ep."playlistsId" = p.id
LEFT JOIN (
  SELECT "playlistsId", COUNT(*)::int AS n
  FROM playlists_media_refs_media_refs
  GROUP BY "playlistsId"
) mr ON mr."playlistsId" = p.id
```

Largest playlist size wraps it: `WHERE member_count > 0 ORDER BY member_count
DESC, playlist_id ASC LIMIT LARGEST_QUERY_LIMIT`, and the selected column is
`owner_id AS id`.

Just-over playlist size keeps each owner once, at that owner's smallest
playlist that is over the cap, then orders those owners by that size:

```sql
SELECT picked.owner_id AS id
FROM (
  SELECT sized.owner_id,
         sized.playlist_id,
         sized.member_count,
         ROW_NUMBER() OVER (
           PARTITION BY sized.owner_id
           ORDER BY sized.member_count ASC, sized.playlist_id ASC
         ) AS owner_rank
  FROM ( /* the inner select above */ ) sized
  WHERE sized.member_count > $1
) picked
WHERE picked.owner_rank = 1
ORDER BY picked.member_count ASC, picked.playlist_id ASC
LIMIT $2
```

`$1` is `PLAYLIST_RESOURCE_CAP`. `$2` is `SQL_MATCH_LIMIT`. The assembler keeps
`JUST_OVER_LIMIT` unused owners. Closest to the cap comes first.

Just-over Add by RSS uses the Add by RSS count above, `WHERE counts.n > $1
ORDER BY counts.n ASC, u.id ASC LIMIT $2`. `$1` is `ADD_BY_RSS_CAP_DEFAULT`.
`$2` is `SQL_MATCH_LIMIT`. Just-over directory follows is the same with the
sum of the three follow counts and `DIRECTORY_FOLLOW_CAP_DEFAULT`. Strictly
greater than the default: an account at the default gets no override, so it
is not "just over".

Email-case twins. A group is two or more users with the same
`lower(btrim(email))`. Take the `TWIN_GROUP_LIMIT` groups with the smallest
key, and every id in those groups. The selected list is ids only.

```sql
WITH keyed AS (
  SELECT id,
         lower(btrim(email)) AS email_key
  FROM users
  WHERE email IS NOT NULL
    AND btrim(email) <> ''
),
groups AS (
  SELECT email_key
  FROM keyed
  GROUP BY email_key
  HAVING COUNT(*) >= 2
  ORDER BY email_key ASC
  LIMIT $1
)
SELECT keyed.id
FROM keyed
JOIN groups ON groups.email_key = keyed.email_key
ORDER BY keyed.email_key ASC, keyed.id ASC
```

`$1` is `TWIN_GROUP_LIMIT`. A group of three or more still contributes every
member. The assembler does not cut this list to fit 100.

Paid, far. One account whose paid expiry is more than five calendar years
after `now`, when one exists. The soonest such expiry wins.

```sql
SELECT id
FROM users
WHERE "membershipExpiration" > $1::timestamptz + interval '5 years'
ORDER BY "membershipExpiration" ASC, id ASC
LIMIT 1
```

Paid, soon:

```sql
SELECT id
FROM users
WHERE "membershipExpiration" > $1::timestamptz
ORDER BY "membershipExpiration" ASC, id ASC
LIMIT $2
```

`$2` is `SQL_MATCH_LIMIT`. `>` matches `decideV4Membership`: an expiry equal
to `now` is not paid.

Trial. Future, inside the carried window, and no future paid expiry. The
window is `$2 * interval '1 day'`, which is `CARRIED_TRIAL_WINDOW_DAYS` times
24 hours, the same span as that function.

```sql
SELECT id
FROM users
WHERE "freeTrialExpiration" > $1::timestamptz
  AND "freeTrialExpiration" <= $1::timestamptz + ($2::int * interval '1 day')
  AND ("membershipExpiration" IS NULL OR "membershipExpiration" <= $1::timestamptz)
ORDER BY "freeTrialExpiration" ASC, id ASC
LIMIT $3
```

`$3` is `SQL_MATCH_LIMIT`. A trial date past the window is not this rule.

Expired. A past or current `membershipExpiration`. Most recent first.

```sql
SELECT id
FROM users
WHERE "membershipExpiration" IS NOT NULL
  AND "membershipExpiration" <= $1::timestamptz
ORDER BY "membershipExpiration" DESC, id ASC
LIMIT $2
```

A past trial with a null `membershipExpiration` is not expired.

Unverified with lists, then without. `"emailVerified" IS NOT TRUE` covers
false and null. `$1` is `SQL_MATCH_LIMIT` on both. The assembler applies the
slot sizes 3 and 2.

```sql
SELECT u.id
FROM users u
WHERE u."emailVerified" IS NOT TRUE
  AND ( /* has lists, the cardinality predicate */ )
ORDER BY u."updatedAt" DESC NULLS LAST, u.id ASC
LIMIT $1
```

Without lists uses `NOT ( /* that same predicate */ )`.

Follows of other accounts. Distinct non-blank `subscribedUserIds`, largest
first:

```sql
SELECT u.id
FROM users u
CROSS JOIN LATERAL (
  SELECT COUNT(DISTINCT btrim(followed))::int AS n
  FROM unnest(COALESCE(u."subscribedUserIds", ARRAY[]::varchar[])) AS followed
  WHERE btrim(followed) <> ''
) counts
WHERE counts.n > 0
ORDER BY counts.n DESC, u.id ASC
LIMIT $1
```

Default playlists:

```sql
SELECT u.id
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM playlists p
  WHERE p."ownerId" = u.id
    AND p."isDefault" IS TRUE
)
ORDER BY u.id ASC
LIMIT $1
```

No activity: the predicate in the Counts section, `ORDER BY u.id ASC`,
`LIMIT SQL_MATCH_LIMIT`.

Random order, pilot (no `LIMIT`) and sample (`LIMIT SAMPLE_TARGET`):

```sql
SELECT id
FROM users
ORDER BY md5(id || $1), id
```

`$1` is the trimmed seed. `md5` of `id || seed` is stable for that snapshot.
Do not use `random()`.

Full:

```sql
SELECT id
FROM users
ORDER BY id ASC
```

## Comments

A short comment at the top of each new file states what is true of the code:
the reader returns v4 ids and a rule name, it only runs `SELECT`, and it does
not write a file or a status row. Do not mention a plan, a step number, or a
doc path. Do not describe an older command.

## Reuse

- v4 connection and id-only `SELECT` style: `seedAccountIdentity.ts` and the
  `USER_SQL` / playlist / `mediaRefs` selects in `copyAccountLibrary.ts`.
- Carried-trial window: `CARRIED_TRIAL_WINDOW_DAYS` and `decideV4Membership`
  in `seedAccountIdentityLib.ts`. Paid is `membershipExpiration > now`.
- Has-lists: the `USAGE_SQL` cardinality expression in `seedAccountIdentity.ts`.
- Cap thresholds: the table in doc 07 "Account caps v4 did not have". This
  function does not write a tier. Area B writes `max_add_by_rss_feeds` and
  logs the directory-follow tier. The three thresholds above are those
  defaults.
