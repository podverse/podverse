**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 23 — API: title search over stored channels, only while the allowlist is set

Add `GET /channel/search/title`. It title-matches every stored directory channel in Postgres
(R56) and answers only while the API's `config.catalog.podcastIndexIdAllowlist` is set (R57).
It ranks a title that starts with the term before one that only contains it, and the newest
publish date breaks a tie (R60). It pages inside the SQL query, with a `count`, so a page
holds every matching row and none is dropped after the query (R32). It calls no Podcast Index
service and needs no new index or migration.

Plan 24 makes the web Search page call it. The Podcast Index search route
(`GET /external-services/podcast-index/search/podcasts`) is unchanged, so an instance with the
allowlist unset searches exactly as it does now (R58).

## Rows

R32, R56, R57, R58, R60

## Runs after

12

## Files

- packages/orm/src/services/channel/channel.ts
- apps/api/src/lib/validation/querySchemas.ts
- apps/api/src/controllers/channel.ts
- apps/api/src/routes/channel.ts
- apps/api/openapi.yml
- packages/helpers-requests/src/api/channel/channel.ts
- packages/helpers-requests/src/api/_request.ts
- apps/api/src/test/channel-search-title.integration.test.ts
- release-notes/scratchpad.md

## Settled decisions

- **Route:** `GET /channel/search/title`, public (`security: []`, no `apiKeyAccess`), beside
  the other `/channel` list routes.
- **Reachable only with the allowlist set.** The handler first checks
  `config.catalog.podcastIndexIdAllowlist === null`. If it is null, the handler answers
  `404 { message: 'Not found' }` before it validates the query, so the open-mode server never
  parses the request or runs the unindexed query. A 404 reads as "this instance has no such
  route", which is what an open instance is.
- **Which channels.** Every stored directory channel. These are the rows Browse recent lists:
  the channel has `channel_about` and its feed's `feed_policy.public_visible` is true. The
  allowlist's ids do not filter the results. Stored shows off the list are found too (D11,
  D14). `feed.podcast_index_id` is not nullable on the entity, so there is no "no Podcast Index
  id" case to handle.
- **Match.** `channel.title ILIKE '%term%'`, case-insensitive, title only. The term is trimmed.
  `\`, `%`, and `_` in the term are escaped with a backslash, so they match literally.
  Postgres `LIKE` / `ILIKE` uses backslash as the default escape character, so no `ESCAPE`
  clause is needed.
- **Order (R60).** First, titles that start with the term (`ILIKE 'term%'`, rank 0), then
  titles that only contain it (rank 1). Within a rank, `channel_about.last_pub_date DESC NULLS
  LAST`. Then `channel.id DESC`, so the order is total and pages never overlap or skip.
- **Paging (R32).** `page` (required, 1-based) with the standard `PAGINATION.DEFAULT_LIMIT` via
  `getPaginationParams`. Offset and limit run in the id query. `meta.count` is the exact match
  count, from the same filters without the order.
- **Two queries per page.** The first selects only ids, with rank, order, offset, and limit, so
  no one-to-many join can multiply rows under `LIMIT`. The second loads those ids with
  `channelGetManyRelations`, and they are returned in the first query's order. This avoids the
  TypeORM limitation on ordering by a computed select alias combined with `skip`/`take`.
- **Medium.** The query takes `medium` with the Search facet values the Podcast Index route
  already takes (`QUERY_PARAMS_PODCAST_INDEX_SEARCH_MEDIUMS`: `all`, `music`; default `all`).
  `music` searches `music` channels. `all` searches `av` (podcast and video), never music. This
  matches today's two facets: All is Podcast Index `/search/byterm` and Music is
  `/search/music/byterm`. With Music off, plan 41 hides the Music facet and resolves the medium
  to `all`, so search shows no music (R17). The API does not read `musicEnabled` here (see
  Decisions in the step's final message).
- **No new index, no migration.** The `ILIKE '%…%'` scan over `channel.title` is accepted; the
  route is unreachable in open mode.
- **Response shape:** `ApiListResponse<Channel>`, `{ data, meta: { page, count, limit } }`, the
  same shape as `/channel/global/recent` but with a numeric `count`.

## `packages/orm/src/services/channel/channel.ts`

Tier A: `.js` relative specifiers. No `as`.

Below the `channelGetOneRelations` block (module scope), add:

```typescript
/** Escapes `\`, `%`, and `_` so a search term matches literally inside a LIKE pattern. */
const escapeLikePattern = (term: string): string => term.replace(/[\\%_]/g, (char) => `\\${char}`);

export type ChannelTitleSearchPage = {
  channels: Channel[];
  count: number;
};
```

Add a method to `ChannelService`, directly after `getManyCount`:

```typescript
  /**
   * Directory channels whose title contains the term, case-insensitive. Titles that start with
   * the term come first, then the newest last publish date, then the highest id, so every page
   * is disjoint. The title match has no index; expose it only where the stored set is small.
   */
  async searchByTitle(args: {
    term: string;
    mediumType: QueryParamsMedium;
    offset: number;
    limit: number;
  }): Promise<ChannelTitleSearchPage> {
    const term = args.term.trim();
    if (term === '') {
      return { channels: [], count: 0 };
    }
    const escaped = escapeLikePattern(term);
    const medium_ids = getMediumIdArrayFromType(args.mediumType);

    const matching = this.repositoryRead
      .createQueryBuilder('channel')
      .innerJoin('channel.channel_about', 'channel_about')
      .innerJoin('channel.feed', 'feed')
      .innerJoin('feed.feed_policy', 'feed_policy')
      .where('feed_policy.public_visible = :publicVisible', { publicVisible: true })
      .andWhere('channel.title ILIKE :contains', { contains: `%${escaped}%` });
    if (medium_ids !== null) {
      matching.andWhere('channel.medium_id IN (:...medium_ids)', { medium_ids });
    }

    const count = await matching.clone().getCount();
    if (count === 0 || args.offset >= count) {
      return { channels: [], count };
    }

    const rows = await matching
      .clone()
      .select('channel.id', 'id')
      .addSelect('CASE WHEN channel.title ILIKE :prefix THEN 0 ELSE 1 END', 'title_rank')
      .setParameter('prefix', `${escaped}%`)
      .orderBy('title_rank', 'ASC')
      .addOrderBy('channel_about.last_pub_date', 'DESC', 'NULLS LAST')
      .addOrderBy('channel.id', 'DESC')
      .offset(args.offset)
      .limit(args.limit)
      .getRawMany<{ id: number | string; title_rank: number | string }>();
    const ids = rows.map((row) => Number(row.id));
    if (ids.length === 0) {
      return { channels: [], count };
    }

    const loaded = await this.repositoryRead.find({
      where: { id: In(ids) },
      relations: channelGetManyRelations,
    });
    const byId = new Map(loaded.map((channel) => [channel.id, channel]));
    const channels = ids
      .map((id) => byId.get(id))
      .filter((channel): channel is Channel => channel !== undefined);

    return { channels, count };
  }
```

`In` is already imported from `typeorm` in this file, and `getMediumIdArrayFromType` and
`QueryParamsMedium` from `@podverse/helpers`. `packages/orm/src/index.ts` already has
`export * from './services/channel/channel.js';`, so `ChannelTitleSearchPage` is exported with
no edit there.

If TypeORM rejects `orderBy('title_rank')` (alias resolution), order by the expression instead:
`.orderBy('CASE WHEN channel.title ILIKE :prefix THEN 0 ELSE 1 END', 'ASC')` and drop the
`addSelect`. The order, paging, and test expectations do not change.

## `apps/api/src/lib/validation/querySchemas.ts`

Directly after `podcastIndexSearchQuerySchema`:

```typescript
export const channelTitleSearchQuerySchema = {
  q: Joi.string().trim().min(1).max(255).required(),
  medium: Joi.string()
    .valid(...QUERY_PARAMS_PODCAST_INDEX_SEARCH_MEDIUMS)
    .default('all'),
  page: Joi.number().integer().min(1).required(),
};
```

## `apps/api/src/controllers/channel.ts`

- Add `channelTitleSearchQuerySchema` to the `@api/lib/validation/index.js` import, and
  `QueryParamsPodcastIndexSearchMedium` to the `import type` from `@podverse/helpers`.
- Add a static method after `getManyGlobalTop`:

```typescript
  /**
   * Title search over stored directory channels. Answers only while the Podcast Index id
   * allowlist is set; the title match is unindexed, so an open instance never runs it.
   */
  static async searchByTitle(req: Request, res: Response): Promise<void> {
    if (config.catalog.podcastIndexIdAllowlist === null) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    validateQueryObject(Joi.object(channelTitleSearchQuerySchema), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { q, medium } = req.query as {
          q: string;
          medium: QueryParamsPodcastIndexSearchMedium;
        };
        const { channels, count } = await ChannelController.channelService.searchByTitle({
          term: q,
          mediumType: medium === 'music' ? 'music' : 'av',
          offset,
          limit,
        });
        const response: ApiListResponse<Channel> = {
          data: channels,
          meta: { page, count, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }
```

The `req.query as { … }` cast matches every list handler in this file; keep it.

## `apps/api/src/routes/channel.ts`

After the `/global/top` line:

```typescript
router.get('/search/title', asyncHandler(ChannelController.searchByTitle));
```

## `apps/api/openapi.yml`

Add `/channel/search/title` directly after the `/channel/global/top` path, copying the
`/channel/global/recent` entry's layout:

- `operationId: apiGetChannelSearchTitle`, tag `channel`, `summary: GET /channel/search/title`,
  `security: []`.
- `description`: "Public title search over stored directory channels, available only while the
  instance sets a Podcast Index id allowlist (`CATALOG_PODCAST_INDEX_ID_ALLOWLIST`). Titles that
  start with the term come before titles that only contain it; within each group, the newest
  last publish date comes first. `meta.count` is the total number of matches. With no
  allowlist the route answers 404."
- Parameters: `q` (query, required, string, `minLength: 1`, `maxLength: 255`); `medium`
  (query, optional, string, enum `all`, `music`, default `all`; description "`all` searches
  podcasts and videos; `music` searches music."); `$ref: "#/components/parameters/PageQueryRequired"`.
- Responses: `200` `ChannelListResponse`; `400` `ValidationErrorResponse`; `404`
  `NotFoundErrorResponse` with description "No Podcast Index id allowlist is set on this
  instance."; `500` `InternalServerErrorResponse`. No 401 or 403; the route has no auth.

## `packages/helpers-requests/src/api/channel/channel.ts`

Add `QueryParamsPodcastIndexSearchMedium` to the type import from `@podverse/helpers`. After
`reqChannelGetManyGlobalTop`:

```typescript
/** Title search over stored channels. Only an instance with a Podcast Index id allowlist answers. */
export async function reqChannelSearchByTitle(
  api: ApiRequestService,
  params: { q: string; medium: QueryParamsPodcastIndexSearchMedium; page: number }
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/search/title',
    method: 'GET',
    config: {
      params,
    },
  });
}
```

## `packages/helpers-requests/src/api/_request.ts`

Add `reqChannelSearchByTitle` to the import from `./channel/channel.js` (alphabetical), and a
method directly after `reqChannelGetMany`:

```typescript
  reqChannelSearchByTitle(params: {
    q: string;
    medium: QueryParamsPodcastIndexSearchMedium;
    page: number;
  }) {
    return reqChannelSearchByTitle(this, params);
  }
```

Import `QueryParamsPodcastIndexSearchMedium` as a type if the file does not already (the
`reqPodcastIndexSearchPodcasts` method's options type may already bring it in).

## Shared files

- `apps/api/openapi.yml`: steps 08 and 11 also add routes or responses here. Assemble orders
  the prompts. Each edit is its own path block.
- `apps/api/src/controllers/channel.ts` and `apps/api/src/routes/channel.ts`: no other plan in
  this set is expected to edit them. If one does, Assemble orders them.
- `release-notes/scratchpad.md`: every plan.

## Tests

API integration test, new file `apps/api/src/test/channel-search-title.integration.test.ts`.
Copy the setup of `channel-add-by-rss-directory-match.integration.test.ts`: the
`CategoryService` mock, `startTestApp`/`stopTestApp`, `nextPodcastIndexId`, `seedChannel` with
the read-write manager, and the `DELETE FROM feed WHERE id = ANY($1::int[])` cleanup.

- Also mock `../factories/podcastIndexService.js` with `searchPodcasts` and
  `searchMusicByTerm` that throw ("Podcast Index must not be called by title search"). This
  proves R56's "no Podcast Index request".
- After `startTestApp()`, read the config the app uses with
  `const { config } = await import('@api/config/index.js');`, the way `getBaseApiUrl` does,
  because `startTestApp` resets modules. Use `request(app)` from `supertest` against
  `${await getBaseApiUrl()}/channel/search/title`.
- `withAllowlist(run)`: save `config.catalog`, assign
  `{ ...saved, podcastIndexIdAllowlist: [nextPodcastIndexId()] }` (an id no seeded feed has,
  which proves results are not limited to the list), run, and restore the saved object in
  `finally`.
- `seedChannel({ title, mediumId, lastPubDate, publicVisible, withAbout })`. It saves the feed
  with a random https URL and `nextPodcastIndexId()` and the channel with `feed_id`,
  `medium_id`, and `title`. It inserts `feed_policy` as the copied test does, and when
  `withAbout` is true runs `INSERT INTO channel_about (channel_id, last_pub_date) VALUES ($1,
  $2)` with `lastPubDate` (an ISO string or `null`). It returns `id_text`.
- One token per file run: `const token = \`ttl${randomUUID().replaceAll('-', '').slice(0, 10)}\`;`
  so no other test's rows match. Seed in `beforeAll`:

| Name | Title | Medium | last_pub_date | Visible | About |
| --- | --- | --- | --- | --- | --- |
| startsNewer | `${token} Beta` | Podcast | 2025-01-01 | yes | yes |
| startsOlder | `${token} Alpha` | Podcast | 2024-01-01 | yes | yes |
| startsVideo | `${token} Gamma` | Video | 2023-01-01 | yes | yes |
| containsNewest | `The ${token} Show` | Podcast | 2026-01-01 | yes | yes |
| containsNoDate | `Old ${token} Hour` | Podcast | null | yes | yes |
| music | `${token} Album` | Music | 2026-02-01 | yes | yes |
| hidden | `${token} Hidden` | Podcast | 2026-03-01 | no | yes |
| unparsed | `${token} Unparsed` | Podcast | — | yes | no |

`AV_ORDER` is `[startsNewer, startsOlder, startsVideo, containsNewest, containsNoDate]`.

Test titles are full sentences:

1. "Title search answers 404 while the allowlist is unset." With the test env's blank catalog,
   `?q=${token}&page=1` is 404 with body `{ message: 'Not found' }`, and a request with no
   query at all is also 404 (the check comes before validation). (R57)
2. "Titles that start with the term come before titles that contain it, newest publish date
   first." In `withAllowlist`, `?q=${token}&page=1` is 200; `data.map(id_text)` equals
   `AV_ORDER`; `meta` equals `{ page: 1, count: 5, limit: 60 }`. Music, hidden, and unparsed
   are absent. (R56, R60)
3. "The match ignores letter case." `q` is `token.toUpperCase()`; same ids in the same order.
4. "The music medium lists only music channels." `medium=music`; `data` is `[music]`, count 1.
5. "Percent and underscore in the term match only themselves." `q` of `${token}_Alpha` and of
   `${token}%Show` each return `data: []` with `count: 0`. Unescaped, `_` and `%` would match
   the space.
6. "Pages are cut in the query, so every match appears on exactly one page." Call the service
   directly: `new (await import('@podverse/orm')).ChannelService().searchByTitle({ term: token,
   mediumType: 'av', offset: 2, limit: 2 })` returns `[startsVideo, containsNewest]` with count
   5; `offset: 4, limit: 2` returns `[containsNoDate]` with count 5. Over HTTP, `page=2` returns
   `data: []` with `meta.count` 5. (R32)
7. "A blank term is a validation error while the allowlist is set." `q` of three spaces with
   `page=1` is 400.

Wrap only the 400 assertion in `withMutedExpectedErrorLogs` if it logs. Default API test
timeouts apply (**test-timeout-budget**). The default web lane's `apps/web/e2e/search-page.spec.ts`
keeps proving the Podcast Index search with the allowlist unset (R58); this plan does not
touch it.

## Release scratchpad

```markdown
## Title search for instances with a Podcast Index id allowlist (API)

- Surfaces: api
- Change: new public `GET /channel/search/title?q=&medium=all|music&page=`. It matches the term against the titles of every stored directory channel in Postgres, case-insensitive. Titles that start with the term come first, then titles that contain it, with the newest last publish date first in each group. Pages are cut in the query, and `meta.count` is the total. `all` searches podcasts and videos; `music` searches music. It makes no Podcast Index request and adds no index. It answers only while `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` is set and returns 404 otherwise. The Podcast Index search route is unchanged.
- Who notices: operators of narrowed instances; web Search uses it on those instances
- Operator steps: none
```
