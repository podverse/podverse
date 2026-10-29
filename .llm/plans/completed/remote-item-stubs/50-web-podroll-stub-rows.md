**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 50 — Web podroll rows render remote stubs

Podroll on podcast, album, and artist pages already renders `RemoteItemsResponse`. After plan 31,
`channelsUnadded` is `DTORemoteChannelStub[]` and `itemsUnadded` is `DTORemoteItemStub[]`. Update
the podroll rows to that shape, link both kinds of stub with `buildIndexProviderFeedPath` (plan
40), and hide the section when every array is empty.

Parsed rows (`ContentPodrollChannelRow`, `ContentPodrollItemRow`) stay as they are: a parsed
channel links to the channel page, a parsed item links to the episode or track page, and a parsed
item row still shows the channel title above the item title.

Do not edit Add by RSS podroll files (plan 45). Do not edit
`apps/web/src/app/podcast-index/feed/`. Do not delete `unparsedPodcastIndexFeedTarget`; mobile
still calls it until area F.

## Rows

R2, R6, R10, R22, R28, R29, R33

## Runs after

31, 40

## Files

apps/web/src/components/Content/remoteItemStubRow.ts
apps/web/src/components/Content/Podroll/ContentPodroll.tsx
apps/web/src/components/Content/Podroll/ContentPodrollRows.tsx
apps/web/src/components/Content/Podroll/ContentPodrollChannelUnaddedRow.tsx
apps/web/src/components/Content/Podroll/ContentPodrollItemUnaddedRow.tsx
apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
apps/web/src/app/artist/[channel_id]/ArtistPageClient.tsx
apps/web/src/app/album/[channel_id]/AlbumPageClient.tsx
apps/api/src/lib/e2eArtistAlbumsFixture.ts
apps/api/src/controllers/externalServices/podcastIndex.ts
apps/api/src/test/e2e-artist-albums-fixture.test.ts
tools/web/seed-e2e.mjs
apps/web/e2e/helpers/seedConstants.ts
apps/web/e2e/podcast-podroll-stubs.spec.ts
makefiles/local/e2e-spec-order-web.txt
release-notes/scratchpad.md

## Shared row helpers — `remoteItemStubRow.ts` (new)

Named exports. Plans 51 and 52 import this file; do not copy the key strings.

```ts
import type {
  DTORemoteChannelStub,
  DTORemoteItemStub,
  RemoteItemsResponse,
} from '@podverse/helpers';

export function nonEmptyTrimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** `${index_provider}:${provider_feed_id}` */
export function remoteChannelStubRowKey(stub: DTORemoteChannelStub): string {
  return `${stub.index_provider}:${stub.provider_feed_id}`;
}

/** `${index_provider}:${provider_feed_id}:${item_guid}` from `channel_stub`. */
export function remoteItemStubRowKey(stub: DTORemoteItemStub): string {
  return `${remoteChannelStubRowKey(stub.channel_stub)}:${stub.item_guid}`;
}

export function remoteItemsResponseHasRows(
  response: RemoteItemsResponse | null
): response is RemoteItemsResponse {
  if (response === null) {
    return false;
  }
  return (
    response.channelsAdded.length > 0 ||
    response.channelsUnadded.length > 0 ||
    response.itemsAdded.length > 0 ||
    response.itemsUnadded.length > 0
  );
}
```

## Podroll rows

`ContentPodroll.tsx`: replace the four-length check with `remoteItemsResponseHasRows`. A null
response or four empty arrays returns null. `itemsUnadded` is a required array (plan 31); drop
the extra truthiness check. Put `data-testid="channel-podroll"` on the element that remains when
rows exist (the accordion, and the `listView` div).

`ContentPodrollRows.tsx`: delete `getItemUnaddedKey`. Keys:

- parsed channel: `channel.id` (unchanged)
- channel stub: `remoteChannelStubRowKey`
- parsed item: `item.id` (unchanged)
- item stub: `remoteItemStubRowKey`

Map `itemsUnadded` directly. Drop the null-element filter. Keep the row order: `channelsAdded`,
`channelsUnadded`, `itemsAdded`, `itemsUnadded`. Do not interleave them.

`ContentPodrollChannelUnaddedRow.tsx`: prop type `DTORemoteChannelStub`. Drop the null return.
One link, always (a stub always has `provider_feed_id`):

- `href={`${WEB.origin}${buildIndexProviderFeedPath(stub.index_provider, stub.provider_feed_id)}`}`
- artwork: pass `[imageUrl]` to `SkeletonFlashImage` when `nonEmptyTrimmed(stub.image_url)` is set, and an empty array when it is not
- alt and title text: that title, or `tMisc('untitled')` when the title is blank
- no author line (a parsed podroll channel row is title and image only)
- same `Link`, `SkeletonFlashImage`, and scss module as today

`ContentPodrollItemUnaddedRow.tsx`: prop type `DTORemoteItemStub`. Drop the null return. The row
is one link, not a play control. An item stub cannot be played. The link target is the **channel**
stub, never an item page (R28):

- `href={`${WEB.origin}${buildIndexProviderFeedPath(stub.channel_stub.index_provider, stub.channel_stub.provider_feed_id)}`}`
- artwork: `nonEmptyTrimmed(stub.image_url) ?? nonEmptyTrimmed(stub.channel_stub.image_url)`, passed
  to `SkeletonFlashImage` as a one-element array, or an empty array when both are blank
- title line: `nonEmptyTrimmed(stub.title) ?? tMisc('untitled')` (the item)
- subtitle line, only when the channel stub title is non-empty: that title
- third line, only when there is something to show: `formatDateTimeAbbrev(stub.pub_date, locale)`
  from `useLocale()` when `pub_date` is non-null, then `formatHHMMSS(stub.duration_seconds)` when
  `duration_seconds` is a number greater than 0. Join the parts that exist with ` · `. Reuse
  `styles.subtitle` for the channel line and the meta line. Omit a line that would be empty.
- alt: the item title string above, or `tMedia('image')` when you would otherwise repeat a blank

`buildIndexProviderFeedPath` is a value import from `@podverse/helpers`. `formatDateTimeAbbrev`
and `formatHHMMSS` are value imports from the same package. Type-only imports stay on their own
line.

## Chip and sidebar

The page still fetches podroll only when
`channel_podroll.channel_podroll_remote_items.length > 0` (unchanged, and not through
`loadOrNotFound`). Pass `remoteItemsResponseHasRows(ssrPodroll)` instead of `!!ssrPodroll` in:

- `PodcastPageClient.tsx` (`ssrHasPodroll`)
- `ArtistPageClient.tsx` (`ssrHasPodroll`)
- `AlbumPageClient.tsx` (`ssrHasPodroll`)

An empty response then hides the Podroll chip and, because `ContentPodroll` returns null, the
sidebar accordion.

## E2E fixture

A new podcast channel, not the shared `e2ePodChnl001` channel. Add `seedRemoteItemStubFixtures`
in `tools/web/seed-e2e.mjs` and call it from `main()` after `seedTasteProfileFixtures`. Mirror
`seedMediaPlayerAndEmbedFixtures`: delete this fixture's rows first, then insert. Do not read the
whole seed file; anchor on `async function main()`.

Constants, also exported from `apps/web/e2e/helpers/seedConstants.ts` with a "Must match
tools/web/seed-e2e.mjs" comment:

| Name | Value |
| --- | --- |
| `E2E_REMOTE_ITEM_CHANNEL_ID_TEXT` | `e2eRmtItmCh01` (13 chars) |
| `E2E_REMOTE_ITEM_CHANNEL_TITLE` | `E2E Remote Item Channel` |
| `E2E_REMOTE_ITEM_CHANNEL_FEED_PI_ID` | `876543225` |
| `E2E_REMOTE_ITEM_CHANNEL_FEED_URL` | `https://e2e-seed-remote-items.example/podcast.xml` |
| `E2E_REMOTE_ITEM_ALBUM_ID_TEXT` | `e2eRmtItmAl01` (13 chars) |
| `E2E_REMOTE_ITEM_ALBUM_TITLE` | `E2E Remote Item Album` |
| `E2E_REMOTE_ITEM_ALBUM_FEED_PI_ID` | `876543226` |
| `E2E_REMOTE_ITEM_ALBUM_FEED_URL` | `https://e2e-seed-remote-items.example/album.xml` |
| `E2E_PODROLL_STUB_PODCAST_INDEX_ID` | `2147483630` |
| `E2E_PODROLL_STUB_FEED_GUID` | `11111111-2222-4333-8444-555555555511` |
| `E2E_PODROLL_STUB_FEED_URL` | `https://e2e-seed-remote-items.example/podroll-stub.xml` |
| `E2E_PODROLL_STUB_TITLE` | `E2E Podroll Stub Show` |
| `E2E_PODROLL_STUB_ITEM_GUID` | `e2e-podroll-stub-item` |
| `E2E_PODROLL_STUB_ITEM_TITLE` | `E2E Podroll Stub Episode` |
| `E2E_PODROLL_UNKNOWN_TITLE` | `E2E Podroll Unknown Show` |
| `E2E_PODROLL_UNKNOWN_FEED_GUID` | `11111111-2222-4333-8444-555555555513` |
| `E2E_CHANNEL_REMOTE_STUB_PODCAST_INDEX_ID` | `2147483629` |
| `E2E_CHANNEL_REMOTE_STUB_FEED_GUID` | `11111111-2222-4333-8444-555555555512` |
| `E2E_CHANNEL_REMOTE_STUB_FEED_URL` | `https://e2e-seed-remote-items.example/remote-stub.xml` |
| `E2E_CHANNEL_REMOTE_STUB_TITLE` | `E2E Remote Stub Show` |
| `E2E_CHANNEL_REMOTE_STUB_AUTHOR` | `E2E Remote Stub Author` |
| `E2E_CHANNEL_REMOTE_STUB_ITEM_GUID` | `e2e-remote-stub-item` |
| `E2E_CHANNEL_REMOTE_STUB_ITEM_TITLE` | `E2E Remote Stub Episode` |
| `E2E_CHANNEL_REMOTE_UNKNOWN_TITLE` | `E2E Remote Unknown Show` |
| `E2E_CHANNEL_REMOTE_UNKNOWN_FEED_GUID` | `11111111-2222-4333-8444-555555555514` |

Image URL for both stubs: `http://localhost:2111/e2e/images/e2e-embed-channel-art-1400.png`.
Item stub `pub_date`: `2026-03-01T12:00:00.000Z`. `duration_seconds`: `3723` (`1:02:03`). Item
`image_url`: null, so the row uses the channel image.

Insert, in this order:

1. `DELETE FROM remote_channel_stub WHERE index_provider = 'podcast_index' AND provider_feed_id = ANY($1::text[])` with the two stub provider ids (aliases and item stubs cascade).
2. `DELETE FROM feed WHERE podcast_index_id = ANY($1::int[])` with `876543225` and `876543226`.
3. Podcast source feed (`podcast` medium): `feed`, `feed_log`, `feed_policy`
   (`parse_allowed`, `public_visible`, `add_allowed` all true), `channel` (`id_text`, `feed_id`,
   `medium_id` from `medium.value = 'podcast'`, `title`), `channel_about`, and
   `insertSeedChannelDescription`.
4. Album source feed, same shape, `medium.value = 'music'`, the album id and title. Music is an
   album route (`getChannelRouteKind`), not an artist route.
5. Podroll stub and remote-list stub, each:

```sql
INSERT INTO remote_channel_stub (
  index_provider, provider_feed_id, feed_guid, feed_url, title, author, image_url, medium_id
) VALUES (
  'podcast_index', $1, $2, $3, $4, $5, $6,
  (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1)
) RETURNING id;

INSERT INTO remote_channel_stub_alias (remote_channel_stub_id, key_kind, key_value)
VALUES ($1, 'feed_guid', $2), ($1, 'feed_url', $3);
```

GUID alias `key_value` is the lowercase GUID. URL alias `key_value` is the URL as stored. Podroll
stub author may be null. Remote-list stub author is `E2E Remote Stub Author`.

6. One item stub on each channel stub:

```sql
INSERT INTO remote_item_stub (
  remote_channel_stub_id, item_guid, title, image_url, pub_date, duration_seconds
) VALUES ($1, $2, $3, NULL, $4, 3723);
```

7. `INSERT INTO channel_podroll (channel_id) VALUES ($1) RETURNING id`, then three
   `channel_podroll_remote_item` rows in this id order: the podroll stub (item_guid null, title
   `E2E Podroll Stub Show`), the podroll item (`item_guid` set, title `E2E Podroll Stub Episode`),
   the unknown GUID (title `E2E Podroll Unknown Show`, no stub).
8. Three `channel_remote_item` rows on the podcast channel, same pattern, for the remote-list
   stub, its item, and `E2E Remote Unknown Show`.
9. One `channel_remote_item` on the album channel: the remote-list stub channel ref only
   (`item_guid` null). Plan 52's album spec reads this row. This plan's spec does not.

## Preview fixture

`apps/api/src/lib/e2eArtistAlbumsFixture.ts` (after plan 31 it still exports the artist constants
and `buildE2eArtistNotYetAddedAlbumByIdResponse`). Add the two provider ids, titles, GUIDs, and
URLs above, and:

```ts
export function buildE2eRemoteStubPreviewByIdResponse(
  podcastIndexId: number
): PodcastIndexPodcastByIdResponse | null
```

Return the existing artist builder for `2147483631`. For `2147483630` and `2147483629`, return
the same response shape as `buildE2eArtistNotYetAddedAlbumByIdResponse` with that id, title,
GUID, URL, `medium: 'podcast'`, and the shared image URL. Any other id returns null.

`PodcastIndexController.podcastById`: when `config.e2e.fixturesEnabled`, call that function and
`res.json` a non-null result before `podcastIndexService.podcastGetById`. The artist id must
still return `buildE2eArtistNotYetAddedAlbumByIdResponse()` so the existing assertion
`expect(res.body).toEqual(buildE2eArtistNotYetAddedAlbumByIdResponse())` keeps passing.

`e2e-artist-albums-fixture.test.ts`: plan 31 removes the second test. Leave the artist preview
test as it is. Add two sibling tests: `GET /external-services/podcast-index/feed/2147483630` and
`.../2147483629` return 200, `feed.title` is the stub title, and the Podcast Index mock was not
called.

## Tests

`apps/web/e2e/podcast-podroll-stubs.spec.ts` (new). Suite title: "Podroll stub rows". One test,
verbose sentence title. Desktop viewport (the Podroll chip is `hideDesktop` at 1200px and up;
Playwright's default width is 1280). Do not click the chip.

1. Open `/podcast/e2eRmtItmCh01`. Status 200. URL matches `/podcast/e2eRmtItmCh01`.
2. Inside `getByTestId('channel-podroll')`: a link named `E2E Podroll Stub Show` with href
   `/podcast-index/feed/2147483630`, and a link named `E2E Podroll Stub Episode` whose text
   includes `E2E Podroll Stub Show` and `1:02:03`, with the same href. The show link is above
   the episode link (`boundingBox().y`).
3. `E2E Podroll Unknown Show` has count 0 on the page.
4. `actionAndCapture` clicks the episode link. URL matches
   `/podcast-index/feed/2147483630`. A heading named `E2E Podroll Stub Show` is visible. Pass
   that heading as `scrollToElement`. `capturePageLoad` on the podroll section before the click,
   with the episode link as `scrollToElement`.

Register the spec in `makefiles/local/e2e-spec-order-web.txt` immediately after
`apps/web/e2e/artist-page-albums-and-tracks.spec.ts`.

No new unit test. The row behavior is this spec. The existing artist spec is plan 51's.

## Release scratchpad

```markdown
## Podroll rows open the provider page for a stubbed show

- Surfaces: web
- Change: podroll on podcast, album, and artist pages lists a remote stub with its title and
  artwork. An episode stub shows the episode title, the show title, the publish date, and the
  duration, and is not playable. Clicking either row opens the Podcast Index page for the show.
  A podroll reference with no stub is left off the page, and an empty podroll hides the section.
- Who notices: listeners opening a show whose podroll points at feeds Podverse has not fully added
- Operator steps: none
```
