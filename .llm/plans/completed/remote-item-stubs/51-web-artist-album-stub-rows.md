**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 51 — Web artist album rows render remote stubs

The artist page "Not Yet Added" section renders `channelsUnadded` through
`ListAlbumRemoteItemNodes`. After plan 31 those values are `DTORemoteChannelStub` objects, not
Podcast Index feeds. Publisher-feed `itemsUnadded` stays empty (plan 31), so this plan does not
add item rows to the album list.

Keep the existing section chrome: "Verified Albums", "Not Yet Added", and
`media.music.not_yet_added_albums_note`. Do not add a channel remote-item section on the artist
page (plan 52). Do not edit Add by RSS album sections.

## Rows

R2, R6, R10, R22, R33

## Runs after

31, 40, 50

## Files

apps/web/src/components/List/Music/Albums/ListAlbumRowRemoteItemUnadded.tsx
apps/web/src/components/List/Music/Albums/ListAlbumGridNodeUnadded.tsx
apps/web/src/components/List/Music/Albums/ListAlbumRemoteItemNodes.tsx
apps/web/src/app/artist/[channel_id]/ArtistPageAlbumSections.tsx
apps/web/src/app/artist/[channel_id]/ArtistPageList.tsx
apps/web/src/app/artist/[channel_id]/ArtistPageClient.tsx
release-notes/scratchpad.md

Plan 50 edits `ArtistPageClient.tsx` first (`ssrHasPodroll`). This plan only changes the
`ssrChannelsUnadded` type on that file. `page.tsx` passes `response.channelsUnadded` with no
local annotation; leave it.

## Album stub rows

Both unadded components take `channelUnadded: DTORemoteChannelStub`. Delete the
`unparsedPodcastIndexFeedTarget` and `podcastIndexFeedListImageUrl` imports. Do not delete those
helpers from `@podverse/helpers`.

Always render a `next/link` (a stub always has `provider_feed_id`). There is no unlinked body.

- `href={buildIndexProviderFeedPath(channelUnadded.index_provider, channelUnadded.provider_feed_id)}`
  (a path, no `WEB.origin`; parsed album rows are paths too)
- image `src`: `nonEmptyTrimmed(channelUnadded.image_url) ?? undefined` from
  `apps/web/src/components/Content/remoteItemStubRow.ts` (plan 50)
- alt: `nonEmptyTrimmed(channelUnadded.title) ?? tMedia('music.album_image')`
- heading: that same title, or `tMisc('untitled')` when the title is blank
- author span, only when `nonEmptyTrimmed(channelUnadded.author)` is set: that author. Omit the
  span when the author is blank. Do not fall back to `untitled` inside the author span.

`ListAlbumRemoteItemNodes.tsx`: `channelsUnadded: DTORemoteChannelStub[]`. Row and grid keys are
`remoteChannelStubRowKey(channelUnadded)`. Keep the divider placement as it is (between rows of
one group, not between the added group and the unadded group). The artist page still calls this
component twice, once with only added albums (`viewSelected="rows"`) and once with only unadded
albums. The grid branch must type-check even though the artist page does not select it.

`ArtistPageAlbumSections.tsx`, `ArtistPageList.tsx`, and `ArtistPageClient.tsx`: replace
`PodcastBatchByFeedGuidResponse['feeds']` with `DTORemoteChannelStub[]`. Drop the Podcast Index
type import when nothing else in the file uses it. Keep `data-testid="artist-not-yet-added-albums"`
and the note test id.

## What stays true

`apps/web/e2e/artist-page-albums-and-tracks.spec.ts` is not edited. After plan 31's seed, the
Not Yet Added row is still a link named `E2E Not Yet Added Album` (substring match) whose href
is `/podcast-index/feed/2147483631`, and `E2E Unknown Album` is still absent. The image alt and
the heading both use the stub title, so the link's accessible name still contains that title.

## Tests

No new spec and no unit test. The existing artist spec is the coverage. Do not change its
assertions.

## Release scratchpad

```markdown
## Not Yet Added albums link to the provider page from the stored stub

- Surfaces: web
- Change: an artist's Not Yet Added album row shows the stub's title, author, and artwork, and
  opens the Podcast Index page for that feed. An album the artist's feed lists that has no stub
  stays off the page.
- Who notices: listeners on an artist page
- Operator steps: none
```
