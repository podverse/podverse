**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 62 — Mobile channel remote item list section, with Maestro coverage of stub rows

A channel's own `podcast:remoteItem` list (common on `musicL` and `podcastL` feeds) has no
mobile surface today. Plan 32 adds `GET /remote-item/channel/:idOrIdText`, which returns it in
the `RemoteItemsResponse` shape. This plan adds an evidence section, **Remote Items**, to the
podcast and album screens, rendered with plan 60's shared rows so parsed entries open their
screen and stubs open the provider search detail for the channel (R33). It also adds the Maestro
flow that drives plan 61's fixtures through podroll and the new section on a device.

## Rows

R2, R6, R10, R22, R28, R29, R33

## Runs after

32, 52, 60, 61

Plan 52 adds the `info.remote_items` catalog key ("Remote Items") that the web section uses;
this plan reuses it so web and mobile share one label.

## Files

apps/mobile/src/prefs/detailListPrefs.ts
apps/mobile/src/screens/podcast/podcastSections.ts
apps/mobile/src/screens/podcast/podcastSections.test.ts
apps/mobile/src/lib/sectionChromeFlags.ts
apps/mobile/src/lib/sectionChromeFlags.test.ts
apps/mobile/src/lib/offlineModeViews.ts
apps/mobile/src/lib/offlineModeViews.test.ts
apps/mobile/src/screens/podcast/sections/RemoteItemListPane.tsx
apps/mobile/src/screens/podcast/sections/PodcastPodrollSection.tsx
apps/mobile/src/screens/podcast/sections/PodcastRemoteItemsSection.tsx
apps/mobile/src/screens/podcast/sections/index.ts
apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx
apps/mobile/src/screens/album/AlbumDetailScreen.tsx
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
apps/mobile/e2e/remote-item-stubs.yaml
release-notes/scratchpad.md

## Where the section appears

- Podcast screen and album screen, as tab `remote_items`, placed after `podroll` and before
  `funding` (evidence chips sit after the always-on chips and before Funding; People stays last).
- Offered when the channel DTO has `channel_remote_items` with at least one entry, or, before the
  channel loads, when the cached chrome flag `hasRemoteItems` is true.
- **Not on the artist screen.** A publisher channel's `channel_remote_items` are its album
  references, which the Albums section already shows from `/publisher-feed`.
- Not the default section. Podcast still opens on Episodes and album on Tracks, even for a
  `musicL` or `podcastL` list whose own items are empty.
- Unavailable in Offline Mode, like Podroll: the pane shows `OFFLINE_UNAVAILABLE_MESSAGE_KEY`.
- The chip is labelled `info.remote_items`; an empty response shows `info.no_remote_items_found`.

## Tabs and section rules

`apps/mobile/src/prefs/detailListPrefs.ts`:

- `PODCAST_TABS` (near line 36): insert `'remote_items'` after `'podroll'`.
- `ALBUM_TABS` (near line 111): `['tracks', 'about', 'podroll', 'remote_items', 'funding', 'people']`.
- Doc comment above `PODCAST_TABS`: "evidence panes (Official clips, Podroll, Remote Items)".
- `ARTIST_TABS` and `ADD_BY_RSS_DETAIL_TABS` do not change.

`apps/mobile/src/screens/podcast/podcastSections.ts`:

- `PodcastSectionChannel` gains `channel_remote_items?: readonly unknown[] | null;`.
- `PODCAST_SECTION_LABEL_KEYS` gains `remote_items: 'info.remote_items'`.
- New export, beside `channelHasPodroll`:
  `export const channelHasRemoteItems = (channel: PodcastSectionChannel | null): boolean => (channel?.channel_remote_items?.length ?? 0) > 0;`
- `resolvePodcastSections` takes `previewHasRemoteItems?: boolean`, computes `hasRemoteItems`
  the same way as `hasPodroll`, and returns it for `section === 'remote_items'`. Its doc comment
  says "Official clips, Podroll, and Remote Items sit after those".
- `remote_items` is neither sortable nor filterable (leave `SORTABLE_SECTIONS` and
  `FILTERABLE_SECTIONS` alone).

`apps/mobile/src/lib/sectionChromeFlags.ts`:

- `ChannelSectionChromeFlags` gains `hasRemoteItems: boolean`;
  `EMPTY_CHANNEL_SECTION_CHROME_FLAGS` gains `hasRemoteItems: false`;
  `parseChannelSectionChromeFlags` reads `hasRemoteItems: readBooleanFlag(value, 'hasRemoteItems')`.
- No SQLite migration: `section_chrome_flags.flags_json` is a JSON blob, and a stored row
  without the key reads as `false` until the next online visit writes it.

`apps/mobile/src/lib/offlineModeViews.ts`:

- `OfflineUnavailableSurface` gains `'podcast_remote_items'` after `'podcast_podroll'`.
- `isPodcastSectionUnavailableOffline` returns true for `'remote_items'` too.

## Shared pane — `apps/mobile/src/screens/podcast/sections/RemoteItemListPane.tsx` (new)

Plan 60 leaves `PodcastPodrollSection` as a list of `RemoteItemListRow`s fed by one call. Move
that body into a pane both sections and the album screen render:

```ts
export type RemoteItemListPaneProps = {
  /** Catalog key for the list's spoken name. */
  accessibilityLabelKey: string;
  emptyMessageKey: string;
  /** One call returns the whole list; there is no second page. */
  fetchResponse: (api: ApiRequestService) => Promise<RemoteItemsResponse>;
  listHeader: ReactNode;
  onRefreshChannel: () => Promise<void>;
  /** Row testIDs are `${rowTestIDPrefix}-${index}`. */
  rowTestIDPrefix: string;
  testID: string;
};

export function RemoteItemListPane(props: RemoteItemListPaneProps): ReactElement;
```

- Body: `usePodcastSectionRows` with a `fetchPage` that returns
  `{ hasMore: false, rows: toRemoteItemListEntries(await fetchResponse(api)) }`,
  `useOpenRemoteItemListEntry()`, and `PodcastSectionList` with the props plan 60 gives the
  podroll list (`keyExtractor` by `entry.key`, `onRefresh` that calls `onRefreshChannel` and
  `refresh`, `onRetry={retry}`, `RemoteItemListRow` rows with `untitledLabel={t('misc.untitled')}`).
- `PodcastPodrollSection` becomes a wrapper:
  `<RemoteItemListPane accessibilityLabelKey="info.podroll" emptyMessageKey="info.no_podroll_found" fetchResponse={fetchPodroll} listHeader={listHeader} onRefreshChannel={onRefreshChannel} rowTestIDPrefix="podcast-podroll-row" testID="podcast-detail-podroll-list" />`,
  with `fetchPodroll = useCallback((api) => api.reqPodrollGetForChannel(channelIdText), [channelIdText])`.
  It keeps plan 60's component doc comment.
- `PodcastRemoteItemsSection.tsx` (new) is the same wrapper with
  `api.reqRemoteItemGetForChannel(channelIdText)`, `accessibilityLabelKey="info.remote_items"`,
  `emptyMessageKey="info.no_remote_items_found"`, `rowTestIDPrefix="podcast-remote-item-row"`,
  and `testID="podcast-detail-remote-items-list"`. Doc comment: "The items and feeds this
  channel's own feed points at with `podcast:remoteItem`: parsed ones open their screen, and
  remote stubs open the provider search detail for their feed. References the index provider
  does not know are left out by the API."
- Export `PodcastRemoteItemsSection` from `sections/index.ts`, after `PodcastPodrollSection`.
  `RemoteItemListPane` is exported from `sections/index.ts` too, for the album screen.

## `PodcastDetailScreen.tsx` (large file — anchors)

Mirror every `previewHasPodroll` use with `previewHasRemoteItems`:

- import `channelHasRemoteItems` beside `channelHasPodroll` (near line 69) and
  `PodcastRemoteItemsSection` beside `PodcastPodrollSection` (near line 85);
- `SECTION_COMPONENTS` (near line 110): `remote_items: PodcastRemoteItemsSection` after `podroll`;
- state (near line 159): `useState<boolean>(cachedChrome?.hasRemoteItems === true)`;
- the cache re-read (near line 218), the offline branch that clears the flag (near line 249),
  the loaded channel (near lines 260–271: compute `hasRemoteItems = channelHasRemoteItems(response)`,
  set it, and pass `hasRemoteItems` to `sectionChromeFlagsRepository.mergeChannel`), and the
  stored-flags read (near line 322: `setPreviewHasRemoteItems(flags.hasRemoteItems)`);
- `resolvePodcastSections` call (near line 594): pass `previewHasRemoteItems` and add it to the
  dependency list.

The fallback that moves off a section the channel stopped offering (near line 606) already
applies to every evidence section; extend its comment to name Remote Items beside Podroll.

## `AlbumDetailScreen.tsx` (large file — anchors)

- `SECTION_LABEL_KEYS` (near line 190): `remote_items: 'info.remote_items'` after `podroll`.
- import `channelHasRemoteItems` with `channelHasPodroll`, and `RemoteItemListPane` from
  `../podcast/sections`.
- `previewHasRemoteItems` state beside `previewHasPodroll` (near line 279), re-read beside line
  371, set and merged beside the podroll lines in `loadChannel` (near lines 442–452).
- `availableSections` (near line 643): compute `hasRemoteItems` like `hasPodroll` and return it
  for `tab === 'remote_items'`; add `previewHasRemoteItems` to the dependency list.
- `const fetchRemoteItems = useCallback((api: ApiRequestService) => api.reqRemoteItemGetForChannel(albumId), [albumId]);`
- `remoteItemsBody`, beside `podrollBody` (near line 1166):

  ```tsx
  const remoteItemsBody = offlineModeEnabled ? (
    <ListEmpty
      messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
      testID="album-detail-remote-items-offline"
    />
  ) : (
    <RemoteItemListPane
      accessibilityLabelKey="info.remote_items"
      emptyMessageKey="info.no_remote_items_found"
      fetchResponse={fetchRemoteItems}
      listHeader={null}
      onRefreshChannel={loadChannel}
      rowTestIDPrefix="album-detail-remote-item-row"
      testID="album-detail-remote-items-list"
    />
  );
  ```

- `sectionListBody` (near line 1189): add `section === 'remote_items' ? remoteItemsBody` after
  the podroll branch.
- The album podroll keeps its own `FillList` and state; moving it onto `RemoteItemListPane` is
  out of scope here.
- `loadChannel` (near line 425) is already `async (): Promise<void>`, so it passes straight
  through as `onRefreshChannel`.

## Catalog keys

`info.remote_items` already exists (plan 52: "Remote Items", es "Elementos remotos", fr
"Éléments distants", el-GR "Απομακρυσμένα στοιχεία"). Do not add or change it.

Add only `info.no_remote_items_found`, consumer layer, inserted after `"no_podroll_found"` in the
`info` block (near line 393) of each original. Title case in English chrome; the empty state is
chrome like `no_podroll_found`.

| key | en-US | es | fr | el-GR |
| --- | --- | --- | --- | --- |
| `info.no_remote_items_found` | No Remote Items Found | No se encontraron elementos remotos | Aucun élément distant trouvé | Δεν βρέθηκαν απομακρυσμένα στοιχεία |

## Maestro — `apps/mobile/e2e/remote-item-stubs.yaml` (new)

Header comment: "Podroll and a channel's remote item list show parsed rows and remote stubs; a
stub opens the Podcast Index preview for its feed, and a parsed row opens its own screen."
Follow `apps/mobile/e2e/artist.yaml` for launch, login, deep links, the iOS open dialog, the
platform back steps, and `${TIMEOUT_*}` values (**mobile-maestro-timeouts**).

1. `runFlow: shared/launch-and-connect.yaml`, `runFlow: shared/login-seeded-user.yaml`.
2. `openLink: podverse-next://podcast/e2ePodroll0001`, iOS open dialog, wait for
   `podcast-detail-screen` (`TIMEOUT_SLOWEST`).
3. Tap `podcast-detail-section-podroll`; wait for `podcast-podroll-row-0` (`TIMEOUT_SLOW`).
   Assert visible texts "E2E Music Album", "E2E Not Yet Added Album", "E2E Not Yet Added Track";
   assert not visible "E2E Unknown Album". `takeScreenshot: remote-item-stubs-podroll`.
4. Tap `podcast-podroll-row-2` (the item stub); wait for `pi-feed-preview-screen`; assert text
   "E2E Not Yet Added Album" and `pi-feed-add-button`. Do not press Add. Go back; wait for
   `podcast-detail-screen`.
5. Tap `podcast-podroll-row-0`; wait for `album-detail-screen`. Go back.
6. `openLink: podverse-next://album/e2eRemoteList01`, iOS open dialog, wait for
   `album-detail-screen`.
7. Tap `album-detail-section-remote_items`; wait for `album-detail-remote-item-row-0`. Assert
   texts "E2E Music Track One" and "E2E Not Yet Added Track"; assert not visible
   "E2E Unknown Track". `takeScreenshot: remote-item-stubs-list`.
8. Tap `album-detail-remote-item-row-1`; wait for `pi-feed-preview-screen` with text
   "E2E Not Yet Added Album". Go back.
9. Tap `album-detail-remote-item-row-0`; wait for `track-detail-screen`.
   `takeScreenshot: remote-item-stubs-track`.

Use `scrollUntilVisible` before a tap when a row can sit under the mini player, as
`artist.yaml` does. The screen testIDs (`podcast-detail-screen`, `album-detail-screen`,
`track-detail-screen`) exist today; the chips are `podcast-detail-section-${tab}` and
`album-detail-section-${tab}`. New top-level YAML joins the full suite automatically, and the
README's flow list is examples only, so the README does not change.

## Reuse

- Plan 60's `toRemoteItemListEntries`, `RemoteItemListRow`, and `useOpenRemoteItemListEntry`.
- `usePodcastSectionRows` and `PodcastSectionList`, as the podroll section uses them.
- Plan 32's `reqRemoteItemGetForChannel`.

## Tests

- `podcastSections.test.ts`: `resolvePodcastSections` offers `remote_items` after `podroll` and
  before `funding` when `channel_remote_items` has an entry, hides it when the list is empty or
  missing, and uses `previewHasRemoteItems` while the channel is null. `channelHasRemoteItems`
  for null, empty, and non-empty.
- `sectionChromeFlags.test.ts`: add `hasRemoteItems` to every expected literal; a stored object
  without `hasRemoteItems` parses to `false`, and `{ hasRemoteItems: true }` parses to `true`.
- `offlineModeViews.test.ts`: `isPodcastSectionUnavailableOffline('remote_items')` is true.
- Maestro: `apps/mobile/e2e/remote-item-stubs.yaml` (above), on plan 61's fixtures.

## Release scratchpad

```markdown
## Mobile shows a channel's remote item list

- Surfaces: mobile
- Change: podcast and album screens gain a Remote Items section when the feed lists
  `podcast:remoteItem` entries (common on music and podcast list feeds). Parsed entries open
  their episode, track, podcast, or album screen; entries Podverse has not parsed yet show as
  remote stubs that open the Podcast Index preview for their feed. The section is unavailable in
  Offline Mode. New string `info.no_remote_items_found` in all four consumer locales; the
  section reuses the web section's `info.remote_items` label.
- Who notices: mobile listeners opening music or podcast list feeds
- Operator steps: none
```
