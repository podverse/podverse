**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 21 — Public playlists Recent read

## Rows

R16, R8, R10

## Runs after

20

## Goal

Public playlists get a Recent read, so the playlists directory has a view when every playlist's
count for the chosen Top range is zero. Plan 20 makes that range return an empty list.
Web Browse and mobile Browse can then offer Recent for playlists the way they do for every other
list type.

## What the code does today (answers R8 and R16 for playlists)

- `apps/api/src/routes/playlist.ts` has `GET /playlist/public/top` and no other public list read.
- `reqPlaylistGetMany` in `packages/helpers-requests/src/api/playlist/playlist.ts` calls
  `/playlist/public/top` for `type: 'public'` whatever `params.sort` is.
- Web public playlists open on Top for the week. `playlistsListSsr.ts`, `page.tsx`, and
  `PlaylistsPageChipRow.tsx` pass `sort: 'top'` and `range: 'week'` when nothing is stored, so the
  `'recent'` fallback in `getPlaylistsPageFilterParams` is not reached on a first visit. The helper
  ignores any public sort and returns Top, and `getPlaylistsPageSortOptions` offers only Top for
  `public`.
- Mobile Browse (`apps/mobile/src/screens/browse/browseFeedData.ts`) sends `sort: 'top'`,
  `type: 'public'`.
- `PlaylistController.getManyPublicTop` responds with `meta: { page }` only. Web's
  `getTotalPages` (`packages/helpers/src/lib/pagination.ts`) then reports one page, and mobile's
  `browseFeedPage` types `meta` as `{ count, limit, page }`, so public playlists Top never pages
  past page 1 on either surface.
- Playlists have no `created_at` column. Owner Recent (`getManyPrivateRecent`) orders by
  `last_updated DESC`, the time a playlist was created or last had its resources or details
  changed.

## Decisions settled here

- Add `GET /playlist/public/recent`. Public `oldest` and `a_z` are not added; a public request
  with any sort other than `recent` keeps calling Top.
- Recent orders by `last_updated DESC`, then `id_text ASC` for a stable page order. No migration.
- The response `meta` for both public playlist reads is `{ page, count: null, limit }`, the shape
  clip and profile public Recent and Top already use.
- The Recent read returns exactly the playlist and account fields public Top returns. The account
  carries only `id_text` and `account_profile.display_name`.

## Approach

### Shared public list fields — new `packages/orm/src/services/playlist/publicPlaylistListSelect.ts`

```typescript
import type { Playlist } from '@orm/entities/playlist/playlist.js';
import type { FindOptionsRelations, FindOptionsSelect } from 'typeorm';

/**
 * Playlist fields a public list may return. The account is limited to its public handle and
 * display name; every other account column stays out of public list responses.
 */
export const PUBLIC_PLAYLIST_LIST_SELECT: FindOptionsSelect<Playlist> = {
  id_text: true,
  title: true,
  description: true,
  is_default_likes: true,
  item_count: true,
  last_updated: true,
  account: {
    id_text: true,
    account_profile: {
      display_name: true,
    },
  },
};

export const PUBLIC_PLAYLIST_LIST_RELATIONS: FindOptionsRelations<Playlist> = {
  account: {
    account_profile: true,
  },
  sharable_status: true,
  medium: true,
};
```

The fields match the nested `playlist` select in
`packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts` today, plus
`last_updated`. `DTOPlaylist` in `packages/helpers/src/dtos/playlist/playlist.ts` already declares
`last_updated`, so Top gains a field its type always promised. Check the import style of sibling
files under `packages/orm/src/services/playlist/` and match it (alias `@orm/...` with `.js`).

### `packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts`

- In `getManyPublic` and `getManyPrivate`, replace the inline `playlist: { ... }` select with
  `playlist: PUBLIC_PLAYLIST_LIST_SELECT` and the inline `relations.playlist` with
  `playlist: PUBLIC_PLAYLIST_LIST_RELATIONS`. Keep `...STATS_POPULARITY_SELECT_ALL` and every
  `where` (plan 20's `minCountField` stays as plan 20 wrote it).

### `packages/orm/src/services/playlist/playlist.ts`

Add beside `getManyPublic` (leave `getManyPublic` unchanged; the workers dev popularity seed uses
it for full rows):

```typescript
async getManyPublicForList(
  queueMediumType: QueryParamsQueueMedium | null,
  options: Pick<FindManyOptions<Playlist>, 'order' | 'skip' | 'take'>
): Promise<Playlist[]> {
  const medium_id = getQueueMediumIdFromType(queueMediumType);
  return this.repositoryRead.find({
    ...options,
    select: PUBLIC_PLAYLIST_LIST_SELECT,
    relations: PUBLIC_PLAYLIST_LIST_RELATIONS,
    where: {
      sharable_status_id: SharableStatusEnum.Public,
      ...(medium_id ? { medium_id: Equal(medium_id) } : {}),
    },
  });
}
```

`Equal`, `getQueueMediumIdFromType`, `SharableStatusEnum`, and the `QueryParamsQueueMedium` type
are already imported in that file.

Confirm `PlaylistService` is exported from `@podverse/orm` (it is, the API imports it) and that
`publicPlaylistListSelect.ts` does not need to be exported from the package index; only ORM
services use it.

### Controller — `apps/api/src/controllers/playlist/playlist.ts`

- Add `static async getManyPublicRecent(req, res)` directly after `getManyPublicTop`. It is public
  (no `ensureAuthenticated`, no `apiKeyAccess`), validates with `mediumPageQuerySchema` (already
  imported), and reads `medium` as `QueryParamsQueueMedium`:

```typescript
const playlists = await playlistService.getManyPublicForList(medium, {
  order: { last_updated: 'DESC', id_text: 'ASC' },
  skip: offset,
  take: limit,
});
const response: ApiListResponse<PlaylistApiJson> = {
  data: preparePlaylistsForJson(playlists),
  meta: { page, count: null, limit },
};
res.status(200).json(response);
```

  Wrap it in `try` / `handleGenericErrorResponse` like `getManyPublicTop`.
- In `getManyPublicTop`, change the response to the same typed shape:
  `meta: { page, count: null, limit }` with `ApiListResponse<PlaylistApiJson>`.

### Route — `apps/api/src/routes/playlist.ts`

Add `router.get('/public/recent', asyncHandler(PlaylistController.getManyPublicRecent));` directly
above the existing `/public/top` line. Both sit above `/:playlist_id_text`, so the literal path
wins.

### OpenAPI — `apps/api/openapi.yml` (large file: grep, then read a window)

- Add the path `/playlist/public/recent` directly above `/playlist/public/top` (around the
  `/playlist/public/top:` line), copying that entry's shape:
  - `operationId: apiGetPlaylistPublicRecent`, tag `playlist`, `summary: GET /playlist/public/recent`.
  - `description: Public playlists, most recently created or updated first.`
  - `security: []`.
  - Parameters: `medium` (query, required, string), `PageQueryRequired`, `LimitQueryOptional`. No
    `range`.
  - Responses `200` (`ApiGetPlaylistPublicRecentResponse200`), `400`, `404`, `500` as on Top.
- Add the component schema next to `ApiGetPlaylistPublicTopResponse200`:

```yaml
    ApiGetPlaylistPublicRecentResponse200:
      allOf:
        - $ref: "#/components/schemas/PlaylistListResponse"
```

- Change `ApiGetPlaylistPublicTopResponse200` to the same `allOf` `PlaylistListResponse` form, since
  its `meta` now matches the other playlist list responses. `PlaylistListResponse.meta` is
  `ListMeta`, whose `count` is nullable.

### Swagger docs test — `apps/api/src/lib/docs/registerSwaggerDocs.test.ts`

Add `'/playlist/public/recent'` to `pageRequiredPaths`, directly above `'/playlist/public/top'`.

### Request helper — `packages/helpers-requests/src/api/playlist/playlist.ts`

- Add after `reqPlaylistGetManyPublicTop`:

```typescript
export async function reqPlaylistGetManyPublicRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/public/recent',
    method: 'GET',
    config: {
      params,
    },
  });
}
```

- In `reqPlaylistGetMany`, the `type === 'public'` branch becomes:

```typescript
if (params.type === 'public') {
  if (params.sort === 'recent') {
    return reqPlaylistGetManyPublicRecent(api, {
      page: params.page,
      medium: params.medium,
    });
  }
  return reqPlaylistGetManyPublicTop(api, {
    page: params.page,
    medium: params.medium,
    range: params.range ?? 'week',
  });
}
```

- `packages/helpers-requests/src/api/_request.ts` wraps only `reqPlaylistGetMany` as an
  `ApiRequestService` method, not the per-route Top function, so it needs no edit. Web and mobile
  reach Recent through `reqPlaylistGetMany`.

### Consumers (not edited here)

Web public playlists keep opening on Top for the week. Area C adds Recent to
`getPlaylistsPageSortOptions` for `public`, and a visitor who picks it reaches the new read.
Mobile Browse sends `'top'` and is unchanged until area D adds its Recent sort.

## Files

packages/orm/src/services/playlist/publicPlaylistListSelect.ts
packages/orm/src/services/playlist/playlist.ts
packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts
apps/api/src/controllers/playlist/playlist.ts
apps/api/src/routes/playlist.ts
apps/api/openapi.yml
apps/api/src/lib/docs/registerSwaggerDocs.test.ts
packages/helpers-requests/src/api/playlist/playlist.ts
apps/api/src/test/playlist.test.ts
apps/api/src/test/playlist-public-recent.integration.test.ts

## Tests

### Mocked route cases — `apps/api/src/test/playlist.test.ts`

- Add `playlistGetManyPublicForListMock: vi.fn(async () => [])` to the hoisted mocks and
  `getManyPublicForList = playlistGetManyPublicForListMock;` to `MockPlaylistService`.
- `describe('GET /public/recent')`:
  - `returns 200 with public recent playlists and a page meta` — request
    `/public/recent?medium=av&page=1`, expect 200, `body.meta` equal to
    `{ page: 1, count: null, limit: <PAGINATION.DEFAULT_LIMIT> }` (read the default from
    `getPaginationParams`), and the mock called with `'av'` and an options object whose `order` is
    `{ last_updated: 'DESC', id_text: 'ASC' }`.
  - `returns 200 without auth` — no cookie or bearer header; expect 200.
  - `returns 400 when page is missing` — `/public/recent?medium=av`; expect 400.
- `describe('GET /public/top')`: assert `body.meta` has `count: null` and a numeric `limit`.

### Real-database case — new `apps/api/src/test/playlist-public-recent.integration.test.ts`

Copy the setup and teardown shape of `stats-popularity-readers.integration.test.ts`
(`startTestApp`, the `CategoryService` mock, `seedPublicAccount`, account cleanup through
`AccountService.delete`). Seed one public account with a display name and three playlists owned by
it, inserted with SQL (`id_text` 9–15 characters, **e2e-seed-nano-id-limits**):

- Public AV playlist, `last_updated` = now.
- Public AV playlist, `last_updated` = now minus one day.
- Private AV playlist.

Read through `new PlaylistService().getManyPublicForList(...)`. To keep other playlists in the
shared test database from changing the result, filter the returned rows to the seeded `id_text`
values before asserting, and give the seeded rows `last_updated` values far in the future
(`now() + interval '10 years'` and `+ '10 years' - interval '1 day'`) so they land on the first
page.

Cases:

- `returns public playlists newest first and leaves out private playlists` — `'av'`,
  `{ order: { last_updated: 'DESC', id_text: 'ASC' }, take: 60 }`; the seeded rows in the result
  are the two public ones, newer first.
- `returns only the account handle and display name` — on a returned seeded row, `account.id_text`
  is the seeded account's, `account.account_profile.display_name` is the seeded name, and
  `Object.keys(row.account)` contains neither `billing_customer_ref`, `created_at`, nor
  `notifications_last_read_at`.
- `leaves out playlists of another medium` — `'music'`; no seeded row is in the result.

Clean up the seeded playlists by id before deleting the account.

No unit test for `reqPlaylistGetMany`: faking `ApiRequestService` needs a type assertion, and the
branch is covered by the area C web spec and area D mobile flow that call it.

## Release scratchpad

```markdown
## Public playlists Recent read

- Surfaces: api, web, mobile (shared request helper)
- Change: new public `GET /playlist/public/recent?medium=&page=` returns public playlists, most
  recently created or updated first (`last_updated`). `reqPlaylistGetMany` with `type: 'public'`
  and `sort: 'recent'` now calls it; every other public sort still calls Top. Public
  playlist Top and Recent both return `meta: { page, count: null, limit }`, so web and mobile can
  page past the first page of public playlists. Both return `last_updated` on each playlist.
- Who notices: web visitors on public playlists and Browse; API clients
- Operator steps: none
```
