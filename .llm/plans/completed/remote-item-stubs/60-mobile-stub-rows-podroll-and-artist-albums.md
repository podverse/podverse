**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 60 — Mobile podroll and artist album lists render remote stubs

Plan 31 changes `channelsUnadded` / `itemsUnadded` in `RemoteItemsResponse` to remote stub DTOs,
which breaks the mobile type-check in `ArtistDetailScreen` until this plan lands. This plan makes
every mobile list that reads that response render stub rows next to parsed rows, and opens the
provider search detail for the **channel** when a stub row is tapped (R6, R10, R28):

- Podroll on podcast detail (`PodcastPodrollSection`), album detail, and artist detail.
- The artist's **Not Yet Added** albums (`GET /publisher-feed/channel/:id`).

The three screens today each carry a private `toPodrollEntries` copy that drops every unadded
reference. They collapse into one shared mapper and one shared row (**reuse-beyond-components**).

## Rows

R2, R6, R10, R22, R28, R29, R33

## Runs after

31, 43

## Files

apps/mobile/src/lib/remoteItems/remoteItemListEntries.ts
apps/mobile/src/lib/remoteItems/remoteItemListEntries.test.ts
apps/mobile/src/components/content/RemoteItemListRow.tsx
apps/mobile/src/components/content/index.ts
apps/mobile/src/hooks/useOpenRemoteItemListEntry.ts
apps/mobile/src/screens/podcast/sections/PodcastPodrollSection.tsx
apps/mobile/src/screens/album/AlbumDetailScreen.tsx
apps/mobile/src/screens/artist/ArtistDetailScreen.tsx
release-notes/scratchpad.md

## What the code says today (answers for R2, R6, R29, and the device-storage question)

- Mobile podroll on all three screens renders `channelsAdded` and `itemsAdded` only. Unadded
  podroll entries are never shown (the `PodcastPodrollSection` doc comment says so).
- The artist's Not Yet Added rows render raw Podcast Index feeds through
  `unparsedPodcastIndexFeedTarget`, which no longer type-checks after plan 31.
- A channel's own `podcast:remoteItem` list has no mobile surface at all (plan 62 adds it).
- **No device data migration.** `apps/mobile/src/data/db/schema.ts` stores no remote item DTO:
  podroll, publisher-feed, and remote item list responses are fetched per visit and held in
  React state only. The `payload_json` columns hold accounts, queue resources, channel items,
  playlists, and playable items; none embeds `RemoteItemsResponse`. Plans 30 and 31 do not change
  `DTOChannel` or `DTOItem`. The only device storage this set touches is the
  `section_chrome_flags.flags_json` key plan 62 adds.

## Shared mapper — `apps/mobile/src/lib/remoteItems/remoteItemListEntries.ts` (new)

Pure, no React Native imports. Type imports from `@podverse/helpers`; value imports
`primaryChannelListArtworkUrl` and `primaryListArtworkUrl` from `@podverse/helpers` (the same
import the three screens use today).

```ts
import type {
  DTOChannel,
  DTOItem,
  DTORemoteChannelStub,
  DTORemoteItemStub,
  RemoteItemsResponse,
} from '@podverse/helpers';

/** One row in a podroll, a remote item list, or the artist's Not Yet Added albums. */
export type RemoteItemListEntry =
  | {
      kind: 'channel';
      key: string;
      title: string;
      subtitle: string | null;
      imageUrl: string | null;
      channelIdText: string;
      mediumId: number | null;
    }
  | {
      kind: 'item';
      key: string;
      title: string;
      subtitle: string | null;
      imageUrl: string | null;
      itemIdText: string;
      /** The item's channel medium; picks episode versus track detail. */
      mediumId: number | null;
    }
  | {
      kind: 'channel_stub';
      key: string;
      /** Null when the provider reported no title; the row shows the untitled label. */
      title: string | null;
      subtitle: string | null;
      imageUrl: string | null;
      /** The channel the row opens on the provider search detail. */
      target: DTORemoteChannelStub;
    }
  | {
      kind: 'item_stub';
      key: string;
      title: string | null;
      subtitle: string | null;
      imageUrl: string | null;
      /** An item stub opens its channel's provider search detail, never an item page. */
      target: DTORemoteChannelStub;
    };

export const remoteChannelStubKey = (stub: DTORemoteChannelStub): string =>
  `${stub.index_provider}:${stub.provider_feed_id}`;

export const remoteItemStubKey = (stub: DTORemoteItemStub): string =>
  `${remoteChannelStubKey(stub.channel_stub)}:${stub.item_guid}`;

export const toRemoteChannelStubEntry = (stub: DTORemoteChannelStub): RemoteItemListEntry;

export const toRemoteItemListEntries = (response: RemoteItemsResponse): RemoteItemListEntry[];
```

Field rules:

| kind | key | title | subtitle | imageUrl |
| --- | --- | --- | --- | --- |
| `channel` | `channel:${id_text}` | `channel.title ?? id_text` | `channel.channel_about?.author ?? null` | `primaryChannelListArtworkUrl(channel.channel_images)` |
| `item` | `item:${id_text}` | `item.title ?? id_text` | `item.channel?.title ?? null` | `primaryListArtworkUrl(item.item_images, item.channel?.channel_images)` |
| `channel_stub` | `remoteChannelStubKey(stub)` | `stub.title` | `stub.author` | `stub.image_url` |
| `item_stub` | `remoteItemStubKey(stub)` | `stub.title ?? stub.channel_stub.title` | `stub.channel_stub.title` | `stub.image_url ?? stub.channel_stub.image_url` |

- `channel.mediumId` is `channel.medium_id ?? null`; `item.mediumId` is
  `item.channel?.medium_id ?? null`. `item_stub.target` is `stub.channel_stub`.
- Trim `id_text`; skip a parsed channel or item whose trimmed `id_text` is empty (today's rule).
- Treat a blank (whitespace-only) stub `title`, `author`, or `image_url` as `null`.
- Order: `channelsAdded`, then `channelsUnadded`, then `itemsAdded`, then `itemsUnadded`, each in
  response order (plan 31 keeps feed order within each array). Rows are not interleaved and get
  no "not yet added" heading: a stub row looks like a parsed row (R8's "a row with the content
  you would expect").
- Skip any entry whose `key` was already emitted.
- An item stub shows the item: its own title and image, with the channel stub's title as the
  subtitle (R29). Publication date and duration are not shown; parsed podroll item rows show
  title and subtitle only, and stub rows match them.

## Shared row — `apps/mobile/src/components/content/RemoteItemListRow.tsx` (new)

A memoized wrapper over `AlbumListRow` (same folder), which already draws the top hairline, the
square `CoverImage` at `LIST_ROW_ARTWORK_SIZE` with `decodeEdge`, and the `ListRow`.

```ts
export type RemoteItemListRowProps = {
  entry: RemoteItemListEntry;
  onPress: (entry: RemoteItemListEntry) => void;
  testID: string;
  /** `t('misc.untitled')` from the list, so each row does not subscribe to i18n. */
  untitledLabel: string;
};
```

- `AlbumListRow` props: `addByRssFeedUrl={null}`, `imageUrl={entry.imageUrl}`,
  `subtitle={entry.subtitle ?? undefined}`, `title={entry.title ?? untitledLabel}`,
  `testID={testID}`, and `onPress` from a `useCallback` that calls `onPress(entry)`.
- No accessibility label override: `ListRow` reads title and subtitle, and the row opens what it
  names on every kind, so no hint is needed.
- Export `RemoteItemListRow` and `RemoteItemListRowProps` from
  `apps/mobile/src/components/content/index.ts`, beside `AlbumListRow`.

## Open hook — `apps/mobile/src/hooks/useOpenRemoteItemListEntry.ts` (new)

```ts
export function useOpenRemoteItemListEntry(): (entry: RemoteItemListEntry) => void;
```

Uses `useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList>>()` and navigates on
the current tab's stack (**mobile-tab-stack-isolation**), through
`CHANNEL_BROWSE_STACK_ROUTES`, with `useCallback([navigation])`:

| kind | Navigation |
| --- | --- |
| `channel`, `getChannelRouteKind(mediumId)` is `artist` | `ArtistDetail`, `buildArtistDetailParams({ artistId: channelIdText, previewImageUrl: imageUrl, previewTitle: title })` |
| `channel`, route kind `album` | `AlbumDetail`, `buildAlbumDetailParams({ albumId: channelIdText, previewImageUrl: imageUrl, previewTitle: title })` |
| `channel`, route kind `podcast` | `PodcastDetail`, `buildPodcastDetailParams({ podcastId: channelIdText, previewImageUrl: imageUrl, previewTitle: title })` |
| `item`, `getItemTypeFromMedium(mediumId)` is `track` | `TrackDetail`, `buildTrackDetailParams({ trackId: itemIdText, previewImageUrl: imageUrl, previewTitle: title })` |
| `item`, type `episode` | `EpisodeDetail`, `{ episodeId: itemIdText }` |
| `channel_stub`, `item_stub` | `SearchResultDetail`, `buildSearchResultDetailParams(target)` (plan 43) |

- Import `getChannelRouteKind` and `getItemTypeFromMedium` from `@podverse/helpers/medium`
  (the subpath `apps/mobile/src/lib/mergeRedirect.ts` uses). Import the param builders and
  `CHANNEL_BROWSE_STACK_ROUTES` from `../navigation`, which re-exports `buildArtistDetailParams`,
  `buildAlbumDetailParams`, `buildPodcastDetailParams`, `buildTrackDetailParams`, and plan 43's
  `buildSearchResultDetailParams`.
- Today podroll channel rows on album and artist always open `PodcastDetail`, and item rows
  always open `EpisodeDetail`. Routing by medium fixes music podroll entries opening the podcast
  screen.
- A stub's search detail refreshes its description in the background and replaces itself with
  the channel screen when the feed has been parsed since (plan 43). This hook does not check.
- No Offline Mode branch: every list that renders these rows is already hidden behind the
  offline unavailable message while the toggle is on.

## `PodcastPodrollSection.tsx`

`apps/mobile/src/screens/podcast/sections/PodcastPodrollSection.tsx`:

- Delete `coverStyles`, `createContentListRowStyles`, `PodrollEntry`, `toPodrollEntries`, and
  `PodcastPodrollRow`, and their now-unused imports (`StyleSheet`, `View`, `CoverImage`,
  `ListRow`, `channelToHomeRow`, `itemToHomeRow`, `buildPodcastDetailParams`,
  `CHANNEL_BROWSE_STACK_ROUTES`, `LIST_ROW_ARTWORK_SIZE`, the themed-style imports, the
  `ChannelBrowseStackParamList` and `NativeStackNavigationProp` types, and `useNavigation`).
- `fetchPage` returns `{ hasMore: false, rows: toRemoteItemListEntries(response) }`, typed
  `PodcastSectionPage<RemoteItemListEntry>`.
- `const openEntry = useOpenRemoteItemListEntry();` replaces the local `openEntry`.
- `keyExtractor={(entry) => entry.key}` stays; hoist it to a module-level
  `const podrollKeyExtractor = (entry: RemoteItemListEntry): string => entry.key;`.
- `renderRow={({ index, row }) => <RemoteItemListRow entry={row} onPress={openEntry} testID={`podcast-podroll-row-${index}`} untitledLabel={untitledLabel} />}`
  with `const untitledLabel = t('misc.untitled');`. The testID keeps its value.
- Rewrite both doc comments. The `toPodrollEntries` comment goes with the function. The component
  comment becomes: "The podcasts and episodes this podcast recommends: parsed ones open their
  screen, and remote stubs open the provider search detail for their feed. References the index
  provider does not know are left out by the API. The whole podroll arrives in one response, so
  there is no second page. The chip only appears when the feed declared a podroll, which makes
  an empty list here a declared podroll none of whose entries the API returned."

## `AlbumDetailScreen.tsx` (large file — anchors)

`apps/mobile/src/screens/album/AlbumDetailScreen.tsx`, podroll parts only:

- Delete `type PodrollEntry` (near line 88), `albumPodrollKeyExtractor` (near line 99),
  `function AlbumPodrollRow` (near line 164), and `toPodrollEntries` (near line 211). Remove
  `RemoteItemsResponse` from the type import and `primaryListArtworkUrl` from the value import
  when nothing else in the file uses them (check with a search first; `ListRow` may still be
  used elsewhere in the file).
- Add a module-level `const albumPodrollKeyExtractor = (row: RemoteItemListEntry): string => row.key;`.
- `podrollRows` state (near line 314): `useState<RemoteItemListEntry[]>([])`.
- `loadPodroll` (near line 611): `setPodrollRows(toRemoteItemListEntries(response))`.
- `handlePodrollPress` (near line 945): replace the whole callback with
  `const handlePodrollPress = useOpenRemoteItemListEntry();`.
- `renderPodrollItem` (near line 1075): render
  `<RemoteItemListRow entry={item} onPress={handlePodrollPress} testID={`album-detail-podroll-row-${index}`} untitledLabel={untitledLabel} />`,
  with `const untitledLabel = t('misc.untitled');` declared above it and `untitledLabel` in the
  dependency list. The testID keeps its value.
- Rows gain artwork (they had none). That matches the podcast podroll row.

## `ArtistDetailScreen.tsx` (large file — anchors)

`apps/mobile/src/screens/artist/ArtistDetailScreen.tsx`:

Imports (top of file):

- Type import: drop `PodcastBatchByFeedGuidResponse` and `RemoteItemsResponse`; add
  `DTORemoteChannelStub`.
- Value import from `@podverse/helpers`: drop `podcastIndexFeedListImageUrl`,
  `primaryListArtworkUrl` (only `toPodrollEntries` uses it; confirm with a search), and
  `unparsedPodcastIndexFeedTarget`. Keep `primaryChannelLightboxArtworkUrl` and
  `primaryChannelListArtworkUrl`.
- Add `RemoteItemListRow` to the existing `../../components/content` import, and import
  `toRemoteChannelStubEntry`, `toRemoteItemListEntries`, `remoteChannelStubKey`, and the
  `RemoteItemListEntry` type from `../../lib/remoteItems/remoteItemListEntries`, and
  `useOpenRemoteItemListEntry` from `../../hooks/useOpenRemoteItemListEntry`.

Not Yet Added albums:

- `type ArtistAlbumUnadded` (near line 107) becomes `type ArtistAlbumUnadded = DTORemoteChannelStub;`.
- Delete `function ArtistUnaddedAlbumRow` (near line 203). In `renderAlbumsItem`'s final branch
  (near line 1077) render
  `<RemoteItemListRow entry={toRemoteChannelStubEntry(item.row)} onPress={handleOpenRemoteEntry} testID={`artist-album-unadded-row-${item.sectionIndex}`} untitledLabel={untitledLabel} />`.
  The testID keeps its value; `apps/mobile/e2e/artist.yaml` taps it. Every stub row is
  pressable (today a row without a Podcast Index id was not).
- `notYetAddedKey` in `albumSectionRows` (near line 949):
  `(row) => `not-yet-added-${remoteChannelStubKey(row)}``.
- Delete `handleOpenUnaddedAlbum` (near line 847) and add
  `const handleOpenRemoteEntry = useOpenRemoteItemListEntry();`. Replace
  `handleOpenUnaddedAlbum` with `handleOpenRemoteEntry` in `renderAlbumsItem`'s dependency list,
  and add `untitledLabel`.
- `setAlbumsUnadded(response.channelsUnadded)` (near line 485) stays; it now type-checks as
  `DTORemoteChannelStub[]`.
- `buildArtistAlbumSectionRows` in `artistDetailSections.ts` is generic over the not-yet-added
  row type and needs no change.

Podroll:

- Delete `type PodrollEntry` (near line 109), `function ArtistPodrollRow` (near line 238), and
  `toPodrollEntries` (near line 264).
- `artistPodrollKeyExtractor` (near line 130): `(row: RemoteItemListEntry): string => row.key`.
- `podrollRows` state: `useState<RemoteItemListEntry[]>([])`; `loadPodroll`:
  `setPodrollRows(toRemoteItemListEntries(response))`.
- Delete `handlePodrollPress` (near line 865); `renderPodrollItem` (near line 1122) renders
  `<RemoteItemListRow entry={item} onPress={handleOpenRemoteEntry} testID={`artist-podroll-row-${index}`} untitledLabel={untitledLabel} />`
  and its dependency list becomes `[handleOpenRemoteEntry, untitledLabel]`.
- Declare `const untitledLabel = t('misc.untitled');` once, above the first callback that uses
  it.
- Remove imports that end up unused (`buildPodcastDetailParams` is still used by nothing else in
  the file once `handlePodrollPress` is gone; check each with a search). `StyleSheet`, `View`,
  `CoverImage`, `ListRow`, `albumCoverStyles`, and `createContentListRowStyles` stay in use by
  `ArtistAddedAlbumRow`.

`useArtistUnsubscribe.tsx` reads only `channelsAdded` and needs no change.

## Reuse

- `AlbumListRow` (`apps/mobile/src/components/content/AlbumListRow.tsx`) for the row chrome.
- `buildSearchResultDetailParams` (plan 43) for the click target; the web twin is
  `buildIndexProviderFeedPath` (area E).
- Parity source: the web podroll and album rows area E renders from the same response; the
  ordering and key rules above come from plan 31's "What clients rely on".

## Tests

- `apps/mobile/src/lib/remoteItems/remoteItemListEntries.test.ts` (new, Vitest), with small
  literal fixtures typed as the helpers DTOs:
  - order is parsed channels, channel stubs, parsed items, item stubs, each in input order;
  - a parsed row with a blank `id_text` is skipped;
  - keys are `channel:<id>`, `item:<id>`, `podcast_index:<feed id>`, and
    `podcast_index:<feed id>:<item guid>`, and a repeated key is emitted once;
  - an item stub's target is its `channel_stub`; its title falls back to the channel stub's title
    and its image to the channel stub's image; its subtitle is the channel stub's title;
  - a channel stub with a blank title maps to `title: null`;
  - `mediumId` comes from `channel.medium_id` and from `item.channel?.medium_id`;
  - all four arrays empty → `[]`.
- Maestro: `apps/mobile/e2e/artist.yaml` keeps passing unchanged (it taps
  `artist-album-unadded-row-0` and lands on `pi-feed-preview-screen` titled "E2E Not Yet Added
  Album", now served by plan 31's seeded stub). Podroll stub rows get device coverage in plan
  62's `remote-item-stubs.yaml`, which runs on plan 61's fixture.

## Release scratchpad

```markdown
## Mobile podroll and Not Yet Added albums show remote stubs

- Surfaces: mobile
- Change: podroll on podcast, album, and artist screens now lists recommended feeds and episodes
  Podverse has not parsed yet, using the remote stubs the API returns. Tapping one opens the
  Podcast Index preview for its feed (an episode stub opens its show's preview). Podroll rows on
  album and artist screens gain artwork, and a recommended album, artist, or track now opens the
  album, artist, or track screen instead of the podcast or episode screen. The artist's Not Yet
  Added albums render from the same stubs, and every row is tappable.
- Who notices: mobile listeners browsing podrolls and artist pages
- Operator steps: none
```
