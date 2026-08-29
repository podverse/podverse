# 01 — Unified subscriptions repository (9b.8)

**Master step:** 9b.8
**Detail doc:** [600-unified-subscriptions-repository](/docs/proposals/mobile/_master-plan_/phase-1/details/600-unified-subscriptions-repository.md)
**Model:** Opus 4.8 (data-layer merge + offline cache + hydration soft-fail)

## Problem

There is no single "channels I follow" source in the app. Directory follows come from
`DTOAccount.account_following_channels` (numeric `channel_id` only). Add-by-RSS follows live in a
separate SQLite repo (`apps/mobile/src/data/repositories/addByRssRepository.ts`) plus
`account_following_add_by_rss_channels`. Home, Library, and car each reach for a different slice, so
add-by-RSS feeds never appear alongside subscriptions.

## Goal

Create `apps/mobile/src/data/repositories/subscriptionsRepository.ts` — the single source of truth
that merges both sources into one deduped, sorted, filterable list, cached for offline reads.

## Public API (implement this shape)

```ts
export type SubscriptionSource = 'directory' | 'addByRss';

export type SubscribedChannel = {
  idText: string;          // channel id_text (directory) or feed_url (add-by-RSS)
  title: string;           // required
  imageUrl: string | null;
  source: SubscriptionSource;
  medium: 'podcasts' | 'music'; // default 'podcasts'
};

export type SubscriptionFilter = 'all' | 'addByRss' | 'directory';

export const subscriptionsRepository = {
  list(params?: { filter?: SubscriptionFilter; sort?: 'alphabetical' | 'recent' }):
    Promise<SubscribedChannel[]>;
  // context needed for hydration; call from accountRepository.refresh (has context) after save
  syncFromAccount(account: DTOAccount, context: MobileAuthRequestContext): Promise<void>;
  clearCache(): Promise<void>;
};
```

## Approach

1. **Add-by-RSS source:** read existing rows from `addByRssRepository` (already carry `idText`
   (feed url), `title`, `imageUrl`). Map → `SubscribedChannel { source: 'addByRss' }`.
2. **Directory source + hydration:** hydrate display fields via the `ApiRequestService` method
   **`reqChannelGetMany`** with `type: 'subscribed'` — that endpoint returns the account's directory
   follows already hydrated (`id_text`, `title`, images), so no by-ids call is needed (reuse the
   `requestWithMobileAuthRefresh` path; **no raw `fetch`**). Map each channel →
   `SubscribedChannel { idText: channel.id_text, title, imageUrl, source: 'directory' }`. `title`
   required — drop entries without a usable title. (Page 1 / `medium: 'podcasts'` first slice.)
3. **Offline cache:** persist directory display fields so `list()` works offline without a network
   round-trip. Prefer a small new SQLite table `subscribed_channel` (idText, title, imageUrl,
   source, medium, updatedAt) written by `syncFromAccount`; `list()` reads add-by-RSS from
   `addByRssRepository` + directory from the cache table and merges. (Add-by-RSS already persists in
   `addByRssFeed`; do not duplicate it into the new table.)
4. **Merge + dedupe + sort:** union both sources, dedupe by `idText`, sort alphabetically by title
   by default (mirror legacy `sortPodcastArrayAlphabetically`).
5. **Filter:** `all` (default) → both; `addByRss` → add-by-RSS only; `directory` → directory only.
6. **Wire `syncFromAccount`:** call it from `accountRepository.refresh` (which has the auth context)
   right after `saveSnapshot`. Hydration is **soft-fail** — wrap in try/catch, log via the existing
   `console.warn('[subscriptions] …')` pattern, fall back to cached rows; never break the refresh.
   Also clear the cache from `accountRepository.clearSnapshot` on logout.

## Structure / DRY

- Keep pure functions small and testable: `mapAddByRssToSubscribed`, `mapDirectoryChannelToSubscribed`,
  `mergeSubscriptions`, `applySubscriptionFilter`.
- Match the existing repository + Vitest test pattern in `apps/mobile/src/data/repositories/`.
- Do not read SQLite in any native browse path (car reads the native cache, not this repo directly).

## Verify signatures first

Read `packages/helpers-requests/src/api/_request.ts` around `reqChannelGetMany` and the channel
request module for exact arg/return shapes and DTO field names (`id_text`, `title`, image). Use them
exactly; **no `as` casts** — narrow/guard per **avoid-type-assertions**. Inspect `addByRssRepository`
for the actual row shape before mapping.

## Files

- `apps/mobile/src/data/repositories/subscriptionsRepository.ts` — new.
- `apps/mobile/src/data/repositories/accountRepository.ts` — call `syncFromAccount` after snapshot
  save (soft-fail).
- SQLite schema/migration for `subscribed_channel` (follow the existing add-by-RSS table setup).
- `subscriptionsRepository.test.ts` — unit tests.

## Acceptance criteria

- `list()` returns directory + add-by-RSS merged, deduped, alphabetical.
- `list({ filter: 'addByRss' })` / `{ filter: 'directory' }` return the correct subset.
- Merged list renders offline from cache after one authenticated sync.
- `syncFromAccount` hydrates best-effort and never throws out of `saveSnapshot`.
- Unit tests cover merge + dedupe + each filter + title-required drop + offline fallback.

## Operator verification (end of step)

Provide these; do not run them yourself.

```bash
# Mobile — scoped unit test (mobile is a standalone install → --prefix, not -w)
npm --prefix apps/mobile run test -- subscriptionsRepository
```
