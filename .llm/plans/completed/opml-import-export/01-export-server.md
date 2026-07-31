# 01 — OPML Export: server endpoint + generation

**Phase 1 foundation.** Build the server-side OPML export used identically by web and mobile.

## Scope

Add an authenticated endpoint that returns an OPML document listing the user's directory follows +
add-by-RSS follows.

## Server

1. **OPML generation lib** — new `apps/api/src/lib/opml/generateOpml.ts` (pure function; unit
   testable). Input: `{ directoryChannels: {title, feedUrl}[]; addByRssChannels: {title, feedUrl}[] }`.
   Output: OPML 2.0 XML string. Escape XML entities. One `<outline type="rss" text=… title=… xmlUrl=…/>`
   per feed. Group under a single `<body>` (optionally two `<outline>` group folders: "Podcasts",
   "Add by RSS" — keep flat for v1, note folders as a later polish).
2. **Resolve feed URLs for directory follows** — directory follows store `channel_id`, not
   `feed_url`. Load the followed channels and their feed URLs:
   - Follows: `AccountFollowingChannelService.getFollowedChannels`
     ([packages/orm/src/services/account/accountFollowingChannel.ts](/packages/orm/src/services/account/accountFollowingChannel.ts) 25-90).
   - Feed URL per channel: join through `FeedService` (channel → feed). Confirm the channel→feedUrl
     accessor in [packages/orm/src/services/feed/feed.ts](/packages/orm/src/services/feed/feed.ts);
     add a batch `getFeedUrlsByChannelIds` helper if none exists.
   - Add-by-RSS: `AccountFollowingAddByRSSChannelService.getFollowedAddByRSSChannels`
     ([packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts](/packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts) 35-62)
     — already has `feed_url` + `title`.
3. **Controller** — `apps/api/src/controllers/account/accountOpmlExport.ts`: `ensureAuthenticated`,
   load both lists for `req.user.id`, call `generateOpml`, respond `200` with
   `Content-Type: text/x-opml` (or `application/xml`) and
   `Content-Disposition: attachment; filename="podverse-opml-export-<yyyy-mm-dd>.opml"`.
4. **Route** — register `GET /account/opml/export` in
   [apps/api/src/routes/account.ts](/apps/api/src/routes/account.ts) near the other account routes.
   Rate limit with `rateLimitAuthEndpoint` (per-user, modest e.g. 10/hour) —
   [apps/api/src/lib/rateLimiter.ts](/apps/api/src/lib/rateLimiter.ts).
5. **OpenAPI** — document the endpoint in [apps/api/openapi.yml](/apps/api/openapi.yml) (see
   **swagger-openapi** skill if present; keep consistent with existing account routes).

## Shared request helper

6. Add `reqAccountOpmlExport` to `@podverse/helpers-requests`
   ([packages/helpers-requests/src/api/account/](/packages/helpers-requests/src/api/account/)) and
   an `ApiRequestService` instance method in
   [packages/helpers-requests/src/api/_request.ts](/packages/helpers-requests/src/api/_request.ts).
   Return the raw response body (Blob on web / text on mobile). Follow the existing
   `reqAccountDownloadData` shape for a binary/file response.

## Tests

- Unit: `generateOpml` — correct XML, entity escaping, empty lists, both feed types.
- API integration (see **api-testing** skill): authed export returns OPML containing seeded
  directory + add-by-RSS feed URLs; unauthed → 401; rate limit → 429.

## Out of scope

- Import (Phase 2). Folder grouping polish. Client UI (02/03).

## Verification (operator)

```bash
npm run build:packages
npm run test -w @podverse/helpers
npm run test:e2e:api
```
