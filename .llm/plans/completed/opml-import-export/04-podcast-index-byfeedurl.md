# 04 — Podcast Index: lookup by feed URL

**Phase 2 foundation.** Required by the import job (**06**) tier-2 resolution.

## Scope

Add a "find podcast by RSS feed URL" method to the Podcast Index service. This does not exist today
(only `byfeedid`, `byguid`, search-by-term, and `feedurl` as an episode secondary param).

## Implementation

1. In [packages/external-services-podcast-index/src/index.ts](/packages/external-services-podcast-index/src/index.ts)
   add `podcastGetByFeedUrl(feedUrl: string)`:
   - Call Podcast Index `GET /podcasts/byfeedurl?url=<encoded feedUrl>` using the same auth-header
     signing + `fetch` wrapper used by `podcastGetById` (303-324) / `podcastGetByGuid` (327-356).
   - Return the parsed `feed` object (podcast_index_id/`feedId`, title, url, etc.) or `null` on
     404/empty. Mirror the return shape/normalization of the existing `podcastGetById`.
   - Normalize the input via the same canonicalization used elsewhere (accept http/https).
2. Export the method through the package barrel and the service type so the API can call it.

## Notes

- Podcast Index's public API supports `/podcasts/byfeedurl`; confirm exact response envelope against
  an existing method's parsing and the API docs.
- Keep network + auth logic identical to sibling methods; only the path/params differ.

## Tests

- Unit test with a mocked `fetch`: success returns normalized feed; 404/empty returns `null`;
  auth headers present. Mirror existing external-services tests.

## Verification (operator)

```bash
npm run build:packages
npm run test -w @podverse/external-services-podcast-index
```
