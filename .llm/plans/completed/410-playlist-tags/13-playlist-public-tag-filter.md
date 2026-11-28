**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Public playlist list tag filter

`GET /playlist/public/recent` and `GET /playlist/public/top` take an optional exact tag. The filter runs in the query that pages, so a later page is a page of matches. With no tag, both lists stay as they are, including playlists that have no tags.

## Rows

R21, R22, R23

## Runs after

10, 11, 12

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- One query parameter, `tag`. Not `tags`. One exact folded name. A playlist matches when that name is any of its tags.
- Omitted `tag`, or a value that folds to empty, does not filter. Untagged public playlists stay in the list.
- A folded name that no public playlist uses returns 200 with an empty page. It is not 404.
- The filter is exact. Prefix search stays on `GET /playlist/tag`. `tag=adam` does not match `adam curry`.
- Public top still drops playlists whose count for the requested range is zero. A tagged playlist with a zero count for that range stays off the top list.
- Private and followed playlist routes do not grow a `tag` parameter. My Playlists and Subscribed are out of this filter.
- Do not add `tag` to `QueryParamsGlobalRecent` or `QueryParamsGlobalTop`. Those types are shared with channels and episodes. Add it only on the playlist public parameter types and on `QueryParamsPlaylists`.

## Query validation

In `apps/api/src/lib/validation/querySchemas.ts`, add playlist-specific schemas. Do not add `tag` to `mediumPageQuerySchema` or `mediumPageRangeQuerySchema`.

```typescript
export const playlistPublicRecentQuerySchema = {
  ...mediumPageQuerySchema,
  tag: Joi.string().allow('').max(PLAYLIST_TAG_NAME_MAX_LENGTH).optional(),
};

export const playlistPublicTopQuerySchema = {
  ...mediumPageRangeQuerySchema,
  tag: Joi.string().allow('').max(PLAYLIST_TAG_NAME_MAX_LENGTH).optional(),
};
```

`getManyPublicRecent` validates `playlistPublicRecentQuerySchema`. `getManyPublicTop` validates `playlistPublicTopQuerySchema`. A value longer than 50 characters is 400. `?tag=` is allowed and means no filter.

Pass the raw string through only when `normalizePlaylistTagName` returns `ok`. Otherwise pass `null` into the service and keep today's query.

## Page before the slice

`PlaylistService.getManyPublicForList` (`packages/orm/src/services/playlist/playlist.ts`) gains an optional third argument `tagName: string | null`.

- `null`: keep the current `repositoryRead.find` call, including `PUBLIC_PLAYLIST_LIST_SELECT`, `PUBLIC_PLAYLIST_LIST_RELATIONS`, the public status, the medium, `skip`, and `take`. Do not join assignments on this path. A one-to-many join here would make `skip`/`take` count joined rows.
- A folded name: select matching playlist ids with the tag join, `sharable_status_id = Public`, the same medium predicate, and the same `order`, `skip`, and `take` (`pageLookaheadTake` is already the `take` the controller passes). Then load those ids with the existing select and relations, and put them back in the id order. Then run `omitUnlistedPlaylistListFields` as today.
- The join is `playlist` to `playlist_tag_assignment` to `playlist_tag`, `playlist_tag.name` equal to the folded string. Equality, not `LIKE`.

`StatsPopularityPlaylistService.getManyPublic` (`packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts`) gains an optional fourth argument `tagName: string | null`. The unit test in `playlist.test.ts` reads call index `[2]` as the count field (`day_count`). Keep that third argument. Put the tag fourth.

- `null`: keep the current `find`.
- A folded name: the same predicates as today (`minCountField` greater than 0, public playlist, medium), plus the tag equality join, with `skip` and `take` on that query. Then apply `omitUnlistedPlaylistListFields` as today.
- Do not load a larger set and filter in memory.

The controller still runs `resolvePageLookahead` on the rows the service returns. Do not lookahead twice.

`applyPlaylistTags` from plan 11 still runs on the page. A matched playlist's `tags` array is all of its tags, not only the filter tag.

## Request helper

`packages/helpers-requests/src/api/queryParams.ts`: add optional `tag?: string | null` on `QueryParamsPlaylists` only.

`packages/helpers-requests/src/api/playlist/playlist.ts`:

- Add `QueryParamsPlaylistPublicRecent` as `QueryParamsGlobalRecent` plus optional `tag`.
- Add `QueryParamsPlaylistPublicTop` as `QueryParamsGlobalTop` plus optional `tag`.
- Change `reqPlaylistGetManyPublicRecent` and `reqPlaylistGetManyPublicTop` to those types.
- In `reqPlaylistGetMany`, pass `tag` only in the `type === 'public'` branches (recent and top). When `params.tag` is `null`, `undefined`, or blank, omit the property. Do not send `tag=null`. Private and followed branches ignore `tag`.

`ApiRequestService.reqPlaylistGetMany` already forwards `QueryParamsPlaylists`. No new method.

Web and mobile call `reqPlaylistGetMany`. They can pass `tag` later without editing this file again.

## OpenAPI

Search `apps/api/openapi.yml` for `/playlist/public/recent` (`operationId: apiGetPlaylistPublicRecent`, about line 21132) and `/playlist/public/top` (`operationId: apiGetPlaylistPublicTop`, about line 21173).

On each operation, add an optional query parameter `tag` (string). Describe recent as: when set, only public playlists that have this folded tag, applied before paging. An unknown tag is an empty page. Describe top the same way, and keep the existing sentence that a range with no activity is an empty list.

Do not add `tag` to other playlist paths.

## Tests

Extend `apps/api/src/test/playlist-public-recent.integration.test.ts`, or add `apps/api/src/test/playlist-public-tag-filter.integration.test.ts` if the recent file's seed cannot take tags without bending its assertions. Cover both routes on the real database:

- No `tag`: a public playlist with no tags is still on recent, and the existing newest-first assertion still holds.
- `tag` set to a folded name: the page contains a public playlist with that tag and omits an untagged public playlist and a public playlist with a different tag. Insert more tagged public playlists than one page, request page 1 and page 2, and show that a match that sorts later is on the later page rather than dropped because an earlier unfiltered page was full.
- `tag=ADAM%20CURRY` matches a playlist saved as `adam curry`.
- An unknown tag returns 200 and an empty `data` array.
- `tag` longer than 50 characters returns 400.
- Public top with `tag` returns only tagged playlists that already have a positive count for that range. Seed the popularity row the same way neighboring playlist stats tests do. If no test inserts `stats_popularity_playlist`, insert the minimum columns that table requires (`playlist_id` and the four counts) for one tagged playlist and leave a tagged playlist without a row off the top list.

Update `apps/api/src/test/playlist.test.ts`:

- `GET /playlist/public/recent?medium=av&page=1` still calls `getManyPublicForList` with the same order, skip, and take. Expect the third argument `null`. `toHaveBeenCalledWith` fails if a new argument appears and the assertion still lists two.
- The same request with `&tag=news` passes the third argument `"news"` (or the folded form if the controller folds first). Pick one place to fold. Fold in the service so the controller passes the raw query string, and the test expects the raw string. The service test is the integration test above.
- Public top without `tag` still has call index `[2]` equal to the range count field. With `tag`, index `[3]` is that raw string and index `[2]` is unchanged.
- `GET /playlist/private/recent?tag=news` does not filter. The private schema still strips unknown `tag` via `stripUnknown`, so the private handler must not read `tag`. Assert the private service is called as it is today.

No Playwright spec. No Maestro flow. The playlists screens pass this parameter later.

## Files

- `apps/api/src/lib/validation/querySchemas.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `packages/orm/src/services/playlist/playlist.ts`
- `packages/orm/src/services/stats/popularity/statsPopularityPlaylist.ts`
- `packages/helpers-requests/src/api/queryParams.ts`
- `packages/helpers-requests/src/api/playlist/playlist.ts`
- `apps/api/openapi.yml`
- `apps/api/src/test/playlist.test.ts`
- `apps/api/src/test/playlist-public-recent.integration.test.ts` or `apps/api/src/test/playlist-public-tag-filter.integration.test.ts`

## Release scratchpad

```markdown
## Public playlist lists filter by tag

- Surfaces: api
- Change: `GET /playlist/public/recent` and `GET /playlist/public/top` take an optional `tag`. The match is the folded name, and it is applied before paging. Leaving `tag` off keeps today's lists, including playlists with no tags. An unknown tag is an empty page. Top still hides playlists with a zero count for the chosen range.
- Who notices: clients of the public playlist lists
- Operator steps: none
```
