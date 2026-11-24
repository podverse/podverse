**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Shared public boost-message view

Move the platform-neutral part of web's received-boostagram list into `@podverse/v4v-metaboost`, and point the existing web section at it. Web's rendered states stay the same. Mobile consumes these exports in plan 61.

## Rows

R24

## Runs after

none

## Files

- packages/v4v-metaboost/src/publicMessageView.ts
- packages/v4v-metaboost/src/publicMessageView.test.ts
- packages/v4v-metaboost/src/index.ts
- apps/web/src/components/Boost/messages/BoostMessagesSection.tsx
- apps/web/src/components/Boost/messages/useBoostMessagesSection.ts
- apps/web/src/components/Boost/messages/useBoostMessagesView.ts
- apps/web/src/components/Boost/messages/createMbrssBoostBreadcrumbLinkResolver.ts
- apps/web/src/components/Boost/messages/types.ts
- apps/web/src/components/Boost/messages/fetchPublicBoostMessages.ts
- apps/web/src/components/Boost/messages/formatPublicBoostAmountLine.ts
- apps/web/src/components/Boost/messages/getPublicBoostMessageLinkKey.ts
- apps/web/src/app/donate/DonatePageClient.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageList.tsx

Delete the three web files that become empty after the move: `fetchPublicBoostMessages.ts`, `formatPublicBoostAmountLine.ts`, `getPublicBoostMessageLinkKey.ts`. `types.ts` keeps `BoostBreadcrumbLinkResolver` (the resolver stays on web). Remove `BoostMessagesPageFetcher` from it. Do not leave a re-export of the moved type.

## Tests

Unit tests in `packages/v4v-metaboost/src/publicMessageView.test.ts` (Vitest include is already `src/**/*.test.ts`).

No Playwright spec. This plan does not change a web route, chip, heading, or row. `BoostMessagesSection` still renders the same states from the same props.

No Maestro flow. No API integration test. No MetaBoost server change.

## Release scratchpad

none

## What moves

Web already fetches and draws the list. The pieces below do not import React, Next, or React Native. They belong in `@podverse/v4v-metaboost`, which already exports `fetchMbrssV1PublicMessages`, `fetchMbV1PublicMessages`, `PublicBoostMessage`, `PublicBoostMessagesPage`, and `getBoostEligibilityForContent` (`MbrssMessagesScope`).

Do not add React to this package. Leave `useBoostMessagesSection`, `useBoostMessagesView`, `useMbrssV1BoostCapability`, and `createMbrssBoostBreadcrumbLinkResolver` in `apps/web`. Those own React state, the web modal refresh counter, and web hrefs.

### Amount line

Move `formatPublicBoostAmountLine` and `FormatPublicBoostAmountLabels` as they stand in `apps/web/src/components/Boost/messages/formatPublicBoostAmountLine.ts`. Same branches:

- blank amount returns null
- currency `BTC` plus a satoshis unit returns `{amount} {satoshisDenominationLabel}`
- currency `BTC` otherwise returns `{amount} {btcNonSatoshiSuffix}`
- currency `USD` with a finite number uses `Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })`
- currency `USD` that is not a finite number returns `{amount} USD`
- anything else joins the non-empty amount, raw currency, and raw unit with spaces

### Page fetcher

Move `createBoostMessagesPageFetcher`, `BoostMessagesSource`, and `toMbrssApiScope` from `fetchPublicBoostMessages.ts`.

`toMbrssApiScope` stays:

- `artist` and `album` become `{ type: 'channel', podcastGuid }`
- `track` and `livestream` become `{ type: 'item', itemGuid }`
- `bucket`, `channel`, and `item` pass through

`BoostMessagesPageFetcher` moves with it:

```ts
export type PublicBoostMessagesPageFetcher = (params: {
  page: number;
  limit: number;
}) => Promise<PublicBoostMessagesPage>;
```

Export `PUBLIC_BOOST_MESSAGES_PAGE_LIMIT = 20`. That is the default `createBoostMessagesPageFetcher` already uses and the default `BoostMessagesSection` already passes.

Add `createPublicBoostMessagesPageFetcher`. It replaces the `boostsPageFetcher` `useMemo` body in `useBoostMessagesView`. Input:

```ts
export type PublicBoostMessagesScopeType =
  | 'channel'
  | 'artist'
  | 'album'
  | 'item'
  | 'track'
  | 'livestream';

export type PublicBoostMessagesCapabilityStatus = 'idle' | 'loading' | 'success' | 'error';

export const createPublicBoostMessagesPageFetcher = (input: {
  fetchAllowed: boolean;
  metaBoost: MetaBoost | null;
  messagesScope: MbrssMessagesScope | null;
  capabilityStatus: PublicBoostMessagesCapabilityStatus;
  publicMessagesUrl: string | null;
  scopeType: PublicBoostMessagesScopeType;
}): PublicBoostMessagesPageFetcher | null;
```

Return null when any of these hold:

- `fetchAllowed` is false
- `metaBoost` is null or `metaBoost.standard` is not `mbrss-v1`
- `messagesScope` is null
- `capabilityStatus` is not `success`
- `publicMessagesUrl` is null
- `scopeType` is `channel`, `artist`, or `album` and `messagesScope.type` is not `channel`
- `scopeType` is `item`, `track`, or `livestream` and `messagesScope.type` is not `item`

Otherwise call `createBoostMessagesPageFetcher` with `type: 'mbrss-v1'`, that URL, and the same scope object the hook builds today (`channel` / `item` when the scope type is exactly that, otherwise the UI scope type plus the guid from `messagesScope`). `toMbrssApiScope` still collapses artist, album, track, and livestream onto the API path.

The donate page does not use this helper. It keeps an `mb-v1` fetcher. Change its import to `createBoostMessagesPageFetcher` from `@podverse/v4v-metaboost`. Leave the null checks and the `mb-v1` source object as they are.

### Breadcrumb target

```ts
export type PublicBoostBreadcrumbTarget =
  | { kind: 'item'; itemGuid: string }
  | { kind: 'channel' }
  | { kind: 'none' };

export const resolvePublicBoostBreadcrumbTarget = (
  message: PublicBoostMessage,
  currentPodcastGuid: string | null
): PublicBoostBreadcrumbTarget;
```

- `breadcrumbContext` missing, or `isSubBucket` not true: `{ kind: 'none' }`
- `itemGuid` is a non-empty string: `{ kind: 'item', itemGuid }`
- `podcastGuid` is a non-empty string, `currentPodcastGuid` is a non-empty string, and they are equal: `{ kind: 'channel' }`
- otherwise `{ kind: 'none' }`

`createMbrssBoostBreadcrumbLinkResolver` calls this first. `{ kind: 'none' }` returns null and does not touch the item cache. `{ kind: 'item' }` keeps today's guid cache, in-flight map, `resolveItemIdTextByGuid`, `findItemIdTextByGuid`, and `resolveItemHref`. `{ kind: 'channel' }` keeps `resolveChannelHref(channelIdText)`. Do not change the default href builders (`buildPodcastPath`, `buildEpisodePath`) or any page's `resolveChannelHref` / `resolveItemHref` / `resolveItemIdTextByGuid`.

### Row

```ts
export type PublicBoostMessageRow = {
  key: string;
  senderName: string;
  createdAt: string;
  dateLabel: string;
  showAmountRow: boolean;
  amountPrimary: string | null;
  appName: string | null;
  body: string | null;
  breadcrumb: {
    podcastLabel: string;
    itemLabel: string | null;
    target: PublicBoostBreadcrumbTarget;
  } | null;
};

export const toPublicBoostMessageRow = (
  message: PublicBoostMessage,
  options: {
    locale: string;
    anonymousLabel: string;
    headingFallback: string;
    currentPodcastGuid: string | null;
    satoshisDenominationLabel: string;
    btcNonSatoshiSuffix: string;
  }
): PublicBoostMessageRow;
```

Match `BoostMessagesSection` as it stands:

- `key` is `message.messageGuid` when that string is non-empty, otherwise `message.id` (today's `message.messageGuid || message.id`)
- `senderName` is the trimmed `message.senderName` when that is non-empty, otherwise `anonymousLabel`
- `dateLabel` is `formatDateTimeAbbrev(message.createdAt, locale)` from `@podverse/helpers`
- `appName` is `message.appName` when `trim()` is non-empty, otherwise null
- amount line is `formatPublicBoostAmountLine`
- `showAmountRow` is true when the amount line is non-null or `appName` is non-null
- `amountPrimary` is the amount line when `showAmountRow` and the line is non-null, the em dash `\u2014` when `showAmountRow` and the line is null, and null when `showAmountRow` is false
- `body` is `message.body` when it is a non-empty string, otherwise null
- `breadcrumb` is null when `breadcrumbContext` is missing or `isSubBucket` is not true
- otherwise `podcastLabel` is `breadcrumbContext.podcastLabel` when that is a non-empty string, otherwise `headingFallback`
- `itemLabel` is `breadcrumbContext.itemLabel` when that is a non-empty string, otherwise null
- `breadcrumb.target` is `resolvePublicBoostBreadcrumbTarget(message, currentPodcastGuid)`, including `{ kind: 'none' }` when the labels still show and nothing is linkable

`useBoostMessagesSection` keeps its own resolver cache. Where it decides a message has no link, use `resolvePublicBoostBreadcrumbTarget(...).kind === 'none'` instead of a second `isSubBucket` check. Keep the cache key function (`item:{guid}` / `channel:{guid}`).

### Web section

`BoostMessagesSection` maps `toPublicBoostMessageRow` for the sender, date, amount, app name, and body. It still owns the heading, the loading / error / empty branches, pagination, and the scroll-to-section behavior. Catalog keys stay:

- loading `value.boost_messages.public_messages_loading`
- error `value.boost_messages.public_messages_unavailable`
- empty `value.boost_messages.public_messages_empty`
- anonymous `misc.anonymous`
- satoshis label `value.types.lightning.denomination`
- BTC suffix `value.boost_messages.public_amount_btc_token`
- locale from `useLocale()`
- heading fallback is the `heading` prop
Pass `currentPodcastGuid: null` from the section. The section does not know the podcast guid, and it does not use `row.breadcrumb.target`. The link href still comes from `messageLinkMap`.

The web section keeps using `messageLinkMap[key]` for the href. It shows the item label as a `Link` when that href is a non-empty string, and as text otherwise. Breadcrumb visibility stays `message.breadcrumbContext?.isSubBucket === true`, so a sub-bucket whose target kind is `none` still shows its labels. Do not hide that row because the target is `none`.

`useBoostMessagesView` replaces the fetcher `useMemo` body with `createPublicBoostMessagesPageFetcher`. Pass `fetchAllowed: ssrCanShowBoosts`. `canShowBoostTab` stays `boostsPageFetcher !== null`. Leave `refreshTrigger` on `publicBoostMessagesRefreshTrigger`.

`AddByRSSArtistPageList.tsx` imports `BoostMessagesPageFetcher` from `apps/web/src/components/Boost/messages/types`. Point that type at `PublicBoostMessagesPageFetcher` from `@podverse/v4v-metaboost`. Leave `BoostBreadcrumbLinkResolver` on the web types import. Do not change the list props.

## index.ts

Append this line at the end of `packages/v4v-metaboost/src/index.ts`:

```ts
export * from './publicMessageView.js';
```

Area A also edits this file. Add only that line. Do not reorder the existing exports.

Relative imports inside the package use the `.js` specifier.

## Tests to write

One file, `publicMessageView.test.ts`. Cover these cases and stop:

- satoshis BTC amount uses the passed denomination label
- non-satoshi BTC amount uses the passed BTC token
- a numeric USD amount is a currency string for `en-US`
- a non-numeric USD amount is `{amount} USD`
- an unknown currency joins amount, currency, and unit
- a blank amount returns null
- `artist` and `album` request URLs end in `/channel/{podcastGuid}` (stub `fetch` the way `publicMessages.boostPath.test.ts` does)
- `track` and `livestream` request URLs end in `/item/{itemGuid}`
- `createPublicBoostMessagesPageFetcher` returns null when capability status is not `success`, when `publicMessagesUrl` is null, when `fetchAllowed` is false, and when a channel scope is paired with an item `messagesScope`
- breadcrumb target is `item` when `isSubBucket` and `itemGuid` is set, `channel` when the podcast guids match and there is no item guid, and `none` when `isSubBucket` is false or the podcast guids differ
- a blank sender name becomes the anonymous label
- a message with an app name and no amount sets `showAmountRow` and `amountPrimary` to the em dash
- a message with no amount and a blank app name sets `showAmountRow` false
- a sub-bucket message whose podcast guid does not match still has a non-null `breadcrumb`, with `target.kind` of `none`

## Out of this plan

Do not add the mobile list, a mobile chip, or a mobile hook. Do not change `boostEligibility.ts`, capability fetch, or the boost send form. Do not change page files other than the donate import and the artist list type import.
