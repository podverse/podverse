**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 52 — Web channel remote-item list

A channel's own `podcast:remoteItem` rows (`channel.channel_remote_items`) have no web section
today. Plan 32 adds `GET /remote-item/channel/:idOrIdText` and `reqRemoteItemGetForChannel`,
returning the same `RemoteItemsResponse` as podroll. Show that list on the podcast page and the
album page, using the podroll stub rows from plan 50.

Do not show it on the artist page. The artist page already lists albums through
`/publisher-feed`, and this endpoint would repeat those albums. A non-album reference on an
artist channel is not given a section in this set.

Do not add the section to embeds. `fetchEmbedListPageClient.ts` already treats a non-episode
podcast `type` (including `podroll`) as the episode list, and a non-track album `type` as an
empty embed list. Leave that. Do not edit Add by RSS pages. Value time splits get no UI (R34 is
area B).

## Rows

R2, R6, R10, R22, R28, R29, R33

## Runs after

32, 40, 50

## Files

packages/helpers-requests/src/api/queryParams.ts
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
apps/web/src/components/Content/RemoteItems/ContentRemoteItems.tsx
apps/web/src/components/Content/RemoteItems/ContentRemoteItemsHeader.tsx
apps/web/src/app/podcast/[channel_id]/page.tsx
apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
apps/web/src/app/podcast/[channel_id]/PodcastPageSideContent.tsx
apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx
apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx
apps/web/src/app/podcast/[channel_id]/PodcastPageContext.tsx
apps/web/src/app/album/[channel_id]/page.tsx
apps/web/src/app/album/[channel_id]/AlbumPageClient.tsx
apps/web/src/app/album/[channel_id]/AlbumPageSideContent.tsx
apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx
apps/web/src/app/album/[channel_id]/AlbumPageList.tsx
apps/web/src/app/album/[channel_id]/AlbumPageContext.tsx
apps/web/e2e/channel-remote-item-list.spec.ts
makefiles/local/e2e-spec-order-web.txt
release-notes/scratchpad.md

Plan 50 already edits the podcast and album clients (`ssrHasPodroll`) and the spec-order file.
Edit those with a targeted insertion. Do not rewrite them.

## Section component

`ContentRemoteItems.tsx` copies the shell of `ContentPodroll.tsx`: null or
`!remoteItemsResponseHasRows(response)` returns null; `isAccordion` renders an `Accordion`
(reuse `ContentPodrollAccordion.module.scss`); otherwise a `listView` div (reuse
`ContentPodroll.module.scss`). The body is `ContentPodrollRows`, so channel stubs, item stubs,
and parsed rows match podroll, including the channel-page click target for an item stub.

`ContentRemoteItemsHeader.tsx` copies `ContentPodrollHeader.tsx` with `tInfo('remote_items')`
and an `h3`. `data-testid="channel-remote-items"` goes on the accordion and on the list-view
div, the same way plan 50 marks `channel-podroll`.

## Where it mounts

`GET /channel` already loads `channel_remote_items` (`channelGetOneRelations` in
`packages/orm/src/services/channel/channel.ts`). On the podcast page and the album page, next
to the existing podroll fetch:

```ts
let ssrRemoteItems: RemoteItemsResponse | null = null;
if ((ssrChannel.channel_remote_items?.length ?? 0) > 0) {
  ssrRemoteItems = await ssrApiRequestService.reqRemoteItemGetForChannel(ssrChannel.id_text);
}
```

Not `loadOrNotFound` (a failure here is not a missing channel). Do not fetch when the array is
missing or empty. Pass `ssrRemoteItems` through the client to the sidebar and the list.

Sidebar (`PodcastPageSideContent`, `AlbumPageSideContent`): after `ContentPodroll`,
`<ContentRemoteItems remoteItemsResponse={remoteItems} isAccordion defaultOpen />`.

Chip, only when `remoteItemsResponseHasRows(ssrRemoteItems)`, placed immediately after the
Podroll chip, `hideDesktop: true`, label `tInfo('remote_items')`:

- `PodcastPageListHeader.tsx` — key `'remote-items'`, type `QueryParamsChannelType`
- `AlbumPageListHeader.tsx` — key `'remote-items'`, type `QueryParamsChannelMusicAlbumType`

List body: `{type === 'remote-items' && <ContentRemoteItems remoteItemsResponse={remoteItems} />}`.

Skip the episode or track refetch when that chip is selected:

- `PodcastPageContext.tsx`, the early return around the `filterParams.type === 'podroll'` check:
  add `filterParams.type === 'remote-items'`.
- `AlbumPageContext.tsx`, the same check (it does not include `boosts`; do not add `boosts`):
  add `'remote-items'`.

Detail section chips stay visit-local. Do not write `type=remote-items` into the URL on first
paint. An explicit `?type=remote-items` selects the chip for that request only, which the
existing `z.enum(...)` parse already does once the value is in the enum.

## Query param

In `packages/helpers-requests/src/api/queryParams.ts`, add `'remote-items'` immediately after
`'podroll'` in `QUERY_PARAMS_CHANNEL_TYPE_VALUES` and
`QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES`. Do not add it to
`QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES`.

## Copy

Insert `remote_items` immediately after `info.podroll` in each consumer originals file. Do not
edit `overrides/` or compiled JSON. Search for `"podroll"` and insert beside it
(**large-file-reading**).

| Locale | Value |
| --- | --- |
| en-US | Remote Items |
| es | Elementos remotos |
| fr | Éléments distants |
| el-GR | Απομακρυσμένα στοιχεία |

English is title case. The other three use each language's own capitalization.

## Tests

`apps/web/e2e/channel-remote-item-list.spec.ts` (new). Suite title: "Channel remote item list".
The seed is plan 50's (`e2eRmtItmCh01`, `e2eRmtItmAl01`, provider id `2147483629`). Import the
constants from `./helpers/seedConstants`. Desktop viewport. Do not click the chip; the section
is the sidebar accordion. `capturePageLoad` / `actionAndCapture` with the asserted element as
`scrollToElement`.

1. When a visitor opens the remote-item seed podcast, the Remote Items section lists the stubbed
   show and the stubbed episode, hides the unknown reference, and the episode opens the show's
   Podcast Index page.
   - `/podcast/e2eRmtItmCh01` returns 200 and the URL matches.
   - Inside `channel-remote-items`: link `E2E Remote Stub Show` with href
     `/podcast-index/feed/2147483629`, above a link `E2E Remote Stub Episode` whose text includes
     `E2E Remote Stub Show` and `1:02:03` and whose href is the same path.
   - `E2E Remote Unknown Show` has count 0.
   - Click the episode link. URL matches `/podcast-index/feed/2147483629`. Heading
     `E2E Remote Stub Show` is visible.
2. When a visitor opens the remote-item seed album, the Remote Items section lists that show
   and its author, and does not list the episode.
   - `/album/e2eRmtItmAl01` returns 200 and the URL matches.
   - Inside `channel-remote-items`: one link named `E2E Remote Stub Show`, href
     `/podcast-index/feed/2147483629`, and the author text `E2E Remote Stub Author`.
   - `E2E Remote Stub Episode` and `E2E Remote Unknown Show` have count 0 inside that section.

Register the spec in `makefiles/local/e2e-spec-order-web.txt` on the line immediately after
`apps/web/e2e/podcast-podroll-stubs.spec.ts` (plan 50 adds that line).

No unit test. No API test (plan 32 covers the endpoint).

## Release scratchpad

```markdown
## Podcast and album pages list a channel's remote items

- Surfaces: web
- Change: a podcast or album page shows a Remote Items section when the feed has
  `podcast:remoteItem` entries that resolve to a parsed channel, a parsed episode, or a remote
  stub. Stub rows match podroll: the show or episode is listed, and a click opens the Podcast
  Index page for the show. References with no stub are left out, and an empty list hides the
  section. Artist pages are unchanged.
- Who notices: listeners on a podcast or album whose feed points at other feeds
- Operator steps: none
```
