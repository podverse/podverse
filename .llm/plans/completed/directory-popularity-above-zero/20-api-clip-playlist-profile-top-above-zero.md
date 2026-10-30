**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 20 — Public clip, playlist, and profile Top return only counts above zero

## Rows

R6, R8, R9, R10, R13, R14

## Runs after

none

## Goal

The public directory Top reads for clips, playlists, and profiles return only rows whose count for
the chosen range is above zero. A range where every row is zero returns an empty `data` array.
None of these reads pads with Recent rows, today or after this change.

Subscribed Top, owner and followed playlist Top, and the per-channel and per-item clip Top lists
keep their current behavior.

## What the code does today (answers R8 for this area)

- `stats_popularity_clip`, `stats_popularity_playlist`, and `stats_popularity_account` keep a row
  after its counts decay. `recentZeroSql` and `fullZeroSql` in
  `packages/orm/src/services/stats/statsPopularityRefresh.ts` set `day_count`, `week_count`, and
  `month_count` to 0 rather than deleting the row. So a clip played two weeks ago has a row with
  `day_count = 0`, `week_count = 0`, `month_count > 0`.
- The public Top controllers order by the range column and then the entity id, with no minimum:
  - `ClipController.getManyPublicTop` and `ClipController.getManyByCategoryPublicTop` in
    `apps/api/src/controllers/clip.ts` call `StatsPopularityClipService.getManyPublic` and
    `getManyAndCountPublic`.
  - `PlaylistController.getManyPublicTop` in `apps/api/src/controllers/playlist/playlist.ts`
    calls `StatsPopularityPlaylistService.getManyPublic`.
  - `AccountController.getManyPublicTop` in `apps/api/src/controllers/account/account.ts` calls
    `StatsPopularityAccountService.getMany(config, 'global')`.
- Result: Top with range Day lists every clip, playlist, or profile that ever had a counted open,
  ranked by zero and then by id. That is the gap R6 and R9 name.
- None of these three reads uses `fillTopPage`, so there is no Recent fallback or pad to remove.
- The E2E seed writes no `stats_popularity_clip`, `stats_popularity_playlist`, or
  `stats_popularity_account` rows, so web E2E Top lists for these types are already empty and this
  change does not move them.

## Approach

Follow the `minCountField` pattern in
`packages/orm/src/services/stats/popularity/statsPopularityChannel.ts`: the service adds
`{ [minCountField]: MoreThan(0) }` to the `where` it builds. The controller passes the range
column it already computes with `getStatsOrder(range)`.

Make `minCountField` a **required** parameter on the public directory reads. Each of them has
exactly one caller, its directory Top controller, so a required field keeps any later caller from
bringing zero rows back by forgetting the option.

### `packages/orm/src/services/stats/popularity/statsPopularityClip.ts`

- Import `MoreThan` from `typeorm` and `StatsPopularityCountField` (type-only) from
  `@podverse/helpers`.
- Add a private `mergeWhere(baseWhere: object, configWhere: object | undefined)` that returns
  `{ ...baseWhere, ...(configWhere || {}) }`, matching the channel service.
- Add a private `buildPublicWhere(mediumType, category_id, minCountField)` returning:

```typescript
{
  [minCountField]: MoreThan(0),
  clip: {
    sharable_status_id: SharableStatusEnum.Public,
    item: {
      ...getActiveFeedWhere({ channel_ids: null, mediumType, category_id }),
    },
  },
}
```

- `getManyPublic(config, mediumType, category_id, minCountField: StatsPopularityCountField)` and
  `getManyAndCountPublic(config, mediumType, category_id, minCountField: StatsPopularityCountField)`
  call `find` / `findAndCount` with
  `{ ...config, where: this.mergeWhere(this.buildPublicWhere(...), config.where) }`.
  Today they spread `config` after `where`, so a `config.where` would replace the public filter.
  The new order keeps the public filter and lets a caller add top-level keys (the integration test
  scopes by `clip_id`).
- Leave `getManyByChannelsAndCountPublic` and `getManyByItemAndCountPublic` unchanged. The first
  serves subscribed clip Top (R14) and per-channel clip Top; the second serves per-item clip Top.

### `packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts`

- Import `MoreThan` from `typeorm` and `StatsPopularityCountField` (type-only) from
  `@podverse/helpers`.
- `getManyPublic(config, queueMediumType, minCountField: StatsPopularityCountField)`: the `where`
  becomes

```typescript
where: {
  ...(config.where && !Array.isArray(config.where) ? config.where : {}),
  [minCountField]: MoreThan(0),
  playlist: {
    sharable_status_id: SharableStatusEnum.Public,
    ...(medium_id ? { medium_id: Equal(medium_id) } : {}),
  },
},
```

  Keep `...config` first and the `select` and `relations` as they are. The `Array.isArray` guard
  narrows `FindOptionsWhere | FindOptionsWhere[]` without a type assertion.
- Leave `getManyPrivate` and `getManyPrivateByPlaylists` unchanged (owner Top and followed Top).

### `packages/orm/src/services/stats/popularity/statsPopularityAccount.ts`

- Import `MoreThan` from `typeorm` and `StatsPopularityCountField` (type-only) from
  `@podverse/helpers`.
- `getMany(config, profileType, minCountField: StatsPopularityCountField)`: add
  `[minCountField]: MoreThan(0)` to `profileWhere` before `mergeWhere`.
- Leave `getManyByAccountsAndCount` unchanged (subscribed profile Top, R14).

### Controllers

- `apps/api/src/controllers/clip.ts`
  - `getManyPublicTop`: pass `order` as the fourth argument to
    `statsPopularityClipService.getManyPublic(config, medium, category_id, order)`.
  - `getManyByCategoryPublicTop`: pass `order` as the fourth argument to
    `getManyAndCountPublic`. `meta.count` then counts only rows above zero, which is the count
    the list can page through.
  - `getManyByChannelPublicTop`, `getManyByItemPublicTop`, `getManySubscribedPublicTop`: no change.
- `apps/api/src/controllers/playlist/playlist.ts`
  - `getManyPublicTop`: pass `order` as the third argument to
    `statsPopularityPlaylistService.getManyPublic(config, medium, order)`.
  - `getManyPrivateTop`, `getManyFollowedPrivateTop`: no change.
- `apps/api/src/controllers/account/account.ts`
  - `getManyPublicTop`: pass `orderField` as the third argument to
    `statsPopularityAccountService.getMany(topConfig, 'global', orderField)`.
  - `getManySubscribedTop`: no change.

No response shape changes in this plan. Plan 21 changes the public playlist Top `meta`.

### OpenAPI (`apps/api/openapi.yml`, large file: grep the path, then read a window)

Replace the `description` of these operations with one sentence each. Do not change `security`,
parameters, or responses.

- `/clip/public/top` (`apiGetClipPublicTop`): `Public clips ranked by the chosen range's count. Clips with a count of zero for the range are left out, so a range with no activity returns an empty list.`
- `/clip/public/category/top` (`apiGetClipPublicCategoryTop`): same sentence, with "Public clips
  in the category".
- `/playlist/public/top` (`apiGetPlaylistPublicTop`): `Public playlists ranked by the chosen range's count. Playlists with a count of zero for the range are left out, so a range with no activity returns an empty list.`
- `/account/top` (`apiGetAccountTop`): `Public profiles ranked by the chosen range's count. Profiles with a count of zero for the range are left out, so a range with no activity returns an empty list.`

`/account/top` is documented with `bearerAuth` / `cookieAuth` security, but the route has no auth
check. Leave that as it is; it is outside this plan.

## Files

packages/orm/src/services/stats/popularity/statsPopularityClip.ts
packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts
packages/orm/src/services/stats/popularity/statsPopularityAccount.ts
apps/api/src/controllers/clip.ts
apps/api/src/controllers/playlist/playlist.ts
apps/api/src/controllers/account/account.ts
apps/api/openapi.yml
apps/api/src/test/stats-popularity-readers.integration.test.ts
apps/api/src/test/clip.test.ts
apps/api/src/test/playlist.test.ts
apps/api/src/test/account-follows-notifications.test.ts

## Tests

### Real-database reader cases — `apps/api/src/test/stats-popularity-readers.integration.test.ts`

Extend the existing suite; reuse its seeded item (`itemId` on `itemChannelId`, which is public and
has a `channel_about` row) and its two public profiles (`profileHighId`, `profileLowId`, whose
day, week, and month counts are 0 and all-time counts are 11 and 2).

Seed in `beforeAll`:

- Two public clips on `itemId`, owned by `profileHighId`, inserted with SQL the way
  `stats-listen-write.integration.test.ts` does (`INSERT INTO clip (id_text, account_id, item_id,
  start_time, end_time, created_at, sharable_status_id) ... RETURNING id`). `id_text` values must
  be 9–15 characters (**e2e-seed-nano-id-limits**), for example `` `rdclpa${runId % 1e8}` ``.
  - Clip "ranked": `stats_popularity_clip` row `(day 3, week 3, month 3, all_time 3)`.
  - Clip "zero day": row `(day 0, week 0, month 4, all_time 4)`.
- Two public playlists owned by `profileHighId` (`INSERT INTO playlist (id_text, account_id,
  sharable_status_id, medium_id, title, last_updated) ... RETURNING id`, `medium_id` for AV via
  `getQueueMediumIdFromType('av')` from `@podverse/helpers`).
  - Playlist "ranked": `stats_popularity_playlist` row `(day 0, week 2, month 2, all_time 2)`.
  - Playlist "zero week": row `(day 0, week 0, month 0, all_time 5)`.

Clean up in `afterAll`, before the existing `feed` delete: delete the `stats_popularity_clip` rows
by `clip_id`, the clips by id, the `stats_popularity_playlist` rows by `playlist_id`, and the
playlists by id.

Cases (each scopes to one seeded row through a top-level `where` key, so other rows in the shared
test database cannot change the result):

- `StatsPopularityClipService.getManyPublic` with `{ where: { clip_id: rankedClipId } }`, `null`,
  `null`, `'day_count'` returns the ranked clip. The same call for the zero-day clip returns `[]`.
  The zero-day clip with `'month_count'` returns one row.
- `getManyAndCountPublic` for the zero-day clip with `'day_count'` returns `[[], 0]`.
- `StatsPopularityPlaylistService.getManyPublic` with `{ where: { playlist_id: rankedPlaylistId } }`,
  `'all'`, `'week_count'` returns the ranked playlist. The zero-week playlist with `'week_count'`
  returns `[]`; with `'all_time_count'` it returns one row.
- `StatsPopularityAccountService.getMany` with `{ where: { account_id: profileHighId } }`,
  `'global'`, `'week_count'` returns `[]`; with `'all_time_count'` it returns one row whose
  `account_id` is `profileHighId`.
- Subscribed profile Top keeps zero rows (R14): `getManyByAccountsAndCount([profileHighId,
  profileLowId], { order: { week_count: 'DESC', account_id: 'ASC' } }, 'subscribed')` returns a
  count of 2 even though both week counts are 0. The profiles must have a sharable status allowed
  for `'subscribed'`; the existing seed sets Public, which is.

Test names state the behavior in a sentence, for example
`'leaves out a public clip whose count for the range is zero'`.

### Mocked route cases

- `apps/api/src/test/clip.test.ts`, `describe('GET /public/top')`: add a case that requests
  `range=week` and asserts `statsPopularityClipGetManyPublicMock` was last called with
  `'week_count'` as its fourth argument. Add `describe('GET /public/category/top')` with a case
  that requests `category=arts&range=month` and asserts
  `statsPopularityClipGetManyAndCountPublicMock` received `'month_count'` as its fourth argument.
  Add a case on `GET /public/subscribed/top` asserting
  `statsPopularityClipGetManyByChannelsAndCountPublicMock` received exactly two arguments, so no
  minimum reaches the subscribed read.
- `apps/api/src/test/playlist.test.ts`, `describe('GET /public/top')`: assert
  `statsPlGetManyPublicMock` was last called with `'day_count'` as its third argument.
- `apps/api/src/test/account-follows-notifications.test.ts`, `describe('GET /top')`: assert
  `statsPopularityGetManyMock` was last called with `'global'` and `'all_time_count'` for
  `range=all-time` (the range keys are `day`, `week`, `month`, `all-time`, from
  `STATS_POPULARITY_COUNT_FIELDS` in `packages/helpers/src/lib/statsPopularityRange.ts`).

## Release scratchpad

```markdown
## Public Top lists for clips, playlists, and profiles leave out zero counts

- Surfaces: api
- Change: `GET /clip/public/top`, `GET /clip/public/category/top`, `GET /playlist/public/top`,
  and `GET /account/top` return only rows whose count for the chosen range (day, week, month, or
  all time) is above zero. A range with no counted activity returns an empty list instead of every
  clip, playlist, or profile that once had activity, ranked by zero. `meta.count` on the category
  clip list counts only those rows. Subscribed Top, owner and followed playlist Top, and the clip
  Top lists on podcast and episode pages are unchanged.
- Who notices: web and mobile Browse users choosing Top for clips, playlists, or profiles; API
  clients reading those routes
- Operator steps: none
```
