# 760-shared-medium-route-kind

**Master step:** P2.4.13
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Promote the channel and item route-kind decision into `@podverse/helpers` so web and mobile cannot
diverge on which medium opens which detail surface.

### Why

Web already has `getChannelRouteKind` / `getItemPathByMedium` in
[`redirectToChannelPageByMedium.ts`](apps/web/src/utils/redirect/redirectToChannelPageByMedium.ts).
Mobile has the same decision as `getChannelDetailRouteKind` in
[`podcastIndexFeedPreview.ts`](apps/mobile/src/screens/search/podcastIndexFeedPreview.ts). Both sit
on top of the shared classifiers (`isAlbumMediumId`, `isArtistMediumId`, `getItemTypeFromMedium`) in
[`packages/helpers/src/lib/medium.ts`](packages/helpers/src/lib/medium.ts). A new medium handled in
one place and not the other is a silent parity bug.

### Shared API

Add beside the existing classifiers in `medium.ts`:

```typescript
export type ChannelRouteKind = 'podcast' | 'album' | 'artist';

/** Canonical channel route kind for a medium. Unmapped / null → podcast. */
export const getChannelRouteKind = (
  mediumId: number | null | undefined
): ChannelRouteKind => {
  if (isArtistMediumId(mediumId)) return 'artist';
  if (isAlbumMediumId(mediumId)) return 'album';
  return 'podcast';
};
```

`getItemTypeFromMedium` already returns `'episode' | 'track'` — do not duplicate it. Path builders
(`buildPodcastPath`, `buildAlbumPath`, …) stay in `appRoutes.ts`; this helper only names the kind.

### Call-site collapse

| Surface | Today                                              | After                                              |
| ------- | -------------------------------------------------- | -------------------------------------------------- |
| Web     | Local `getChannelRouteKind` in redirect util       | Import from `@podverse/helpers`; keep path helpers |
| Mobile  | `getChannelDetailRouteKind` in podcastIndex preview | Delete; import `getChannelRouteKind`               |

Web path helpers (`getChannelPathByMedium`, `getItemPathByMedium`, enforce-canonical redirects) stay
web-local — they depend on Next `ROUTES` / `redirect`. Only the kind decision moves.

### Tests

- Unit tests in `packages/helpers` covering Podcast → podcast, Video → podcast, Music → album,
  PublisherMusic → artist, null/undefined/Audiobook → podcast.
- Update web `redirectToChannelPageByMedium.test.ts` and mobile `podcastIndexFeedPreview.test.ts` to
  assert against the shared helper (or drop the duplicate cases).

## Acceptance criteria

- One `getChannelRouteKind` in `@podverse/helpers`; web and mobile both consume it.
- No second local copy of the artist/album/podcast branch remains.
- Video-medium channels still resolve to `'podcast'` (match web today).

## Web parity references

- [`redirectToChannelPageByMedium.ts`](apps/web/src/utils/redirect/redirectToChannelPageByMedium.ts)
- [`packages/helpers/src/lib/medium.ts`](packages/helpers/src/lib/medium.ts)

## Verification

```bash
# Root
npm run build -w packages/helpers
npm run test -w packages/helpers -- medium
npm run test -w apps/web -- redirectToChannelPageByMedium
npm --prefix apps/mobile run test -- podcastIndexFeedPreview
```
