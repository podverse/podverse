# 600-unified-subscriptions-repository

**Master step:** 9b.8
**Model (author + implement):** Opus 4.8
**Status:** done

## Decision context

Podverse-rn (legacy) treated a user's **subscriptions** as one merged list: directory-followed
podcasts + locally added add-by-RSS feeds were combined (`combineWithAddByRSSPodcasts` in
`src/services/podcast.ts`) and shown together everywhere (Podcasts screen, CarPlay Podcasts tab).

The new app currently **separates** them: Home "subscribed" uses `reqChannelGetMany({ type:
'subscribed' })` (directory follows only), while add-by-RSS lives in its own SQLite repo
(`addByRssRepository`) surfaced only in the **RSS** tab. Product decision (master plan Open
decisions): **merge by default in every subscribed view, with an optional filter to view only
add-by-RSS** (and optionally directory-only). This detail defines the shared data layer that all
consumers use so Home, Library, and car stay consistent.

## Scope

Create a **subscriptions repository** as the single source of truth for "channels I follow",
merging both sources:

- **Directory follows:** `DTOAccount.account_following_channels` (numeric `channel_id` only) — must
  be hydrated to display fields (title, image, `id_text`).
- **Add-by-RSS follows:** `addByRssRepository` local rows (already carry `title`, `imageUrl`,
  `feedUrl`, `idText`) plus `DTOAccount.account_following_add_by_rss_channels`.

### Public API (proposed)

```ts
// apps/mobile/src/data/repositories/subscriptionsRepository.ts
export type SubscriptionSource = 'directory' | 'addByRss';

export type SubscribedChannel = {
  idText: string;          // channel id_text (directory) or feed_url (add-by-RSS)
  title: string;           // required; drop entries that never resolve a title
  imageUrl: string | null;
  source: SubscriptionSource;
  medium: 'podcasts' | 'music'; // for future music mixing; default 'podcasts'
};

export type SubscriptionFilter = 'all' | 'addByRss' | 'directory';

export const subscriptionsRepository = {
  list(params?: { filter?: SubscriptionFilter; sort?: 'alphabetical' | 'recent' }):
    Promise<SubscribedChannel[]>;
  // Called from accountRepository.saveSnapshot after /auth/me: hydrate + cache directory
  // display fields so the merged list works offline and feeds the native cache.
  // Needs the auth request context to hydrate; called from accountRepository.refresh (which has it)
  // after saveSnapshot, soft-fail.
  syncFromAccount(account: DTOAccount, context: MobileAuthRequestContext): Promise<void>;
};
```

- **Default filter `all`** → directory + add-by-RSS merged, deduped by `idText`, sorted
  alphabetically (mirror legacy `sortPodcastArrayAlphabetically`); `recent` optional later.
- `addByRss` / `directory` filters back the "view only add-by-RSS" UX requirement.

### Offline-first + hydration

- Persist a lightweight **subscribed-channel cache** so the merged list renders offline and does
  not require a network round-trip on every read. Options (pick smallest that works):
  1. New SQLite table `subscribed_channel` (idText, title, imageUrl, source, medium, updatedAt),
     written by `syncFromAccount` (add-by-RSS rows already live in `addByRssFeed`; the table only
     needs to cache **directory** channel display fields), or
  2. Extend the account snapshot with hydrated follow display fields.
     Prefer (1): a dedicated cache table keeps `addByRssRepository` untouched and mirrors the
     existing repository pattern.
- Hydrate directory follows via the `ApiRequestService` method **`reqChannelGetMany`** with
  `type: 'subscribed'` — the subscribed-list endpoint returns exactly the account's directory
  follows with display fields (`id_text`, `title`, images), so numeric `account_following_channels`
  ids are hydrated without a by-ids endpoint. Best-effort/soft-fail — a hydration failure must not
  block the refresh; fall back to cached rows. (Page 1, `medium: 'podcasts'` for the first slice;
  pagination + music medium are follow-ons.)
- No raw `fetch`; reuse the mobile auth-refresh request path.

### Consumers (this repo becomes the seam)

- **Home** subscribed podcasts (8.16 / [601](/docs/proposals/mobile/_master-plan_/details/601-home-subscribed-mixed-filter.md)).
- **Library** subscriptions list (9.30 / [602](/docs/proposals/mobile/_master-plan_/details/602-library-subscriptions-list.md)).
- **Car** native-cache library-browse projection (12.22 /
  [401](/docs/proposals/mobile/_master-plan_/details/401-car-library-directory-follows.md)) — the
  car projection calls this repo instead of duplicating hydration.

## Web parity references

- Legacy merge: `podverse-rn` `src/services/podcast.ts` `combineWithAddByRSSPodcasts`,
  `getSubscribedPodcasts`.
- New web separation (to reconcile as a product decision, not required in this step):
  `apps/web/src/components/SideBar/SideBar.tsx`, `apps/web/src/app/add-by-rss/*`.
- DTOs: `packages/helpers/src/dtos/account/account.ts`
  (`account_following_channels`, `account_following_add_by_rss_channels`,
  `account_following_playlists`).

## Acceptance criteria

- `subscriptionsRepository.list()` returns directory + add-by-RSS merged, deduped, alphabetical.
- `list({ filter: 'addByRss' })` returns only add-by-RSS; `filter: 'directory'` only directory.
- Merged list renders offline from cache after one authenticated sync.
- `syncFromAccount` hydrates directory display fields best-effort and never throws out of
  `saveSnapshot`.
- Unit tests cover merge + dedupe + each filter + title-required drop + offline fallback.

## Non-goals

- No server API change (`/auth/me` payload unchanged; client hydrates + caches).
- Music-medium mixing (artists/albums) is a follow-on; keep `medium: 'podcasts'` primary here.
- No web changes in this step (web parity decision tracked separately).

## Verification

```bash
npm --prefix apps/mobile run test -- subscriptionsRepository
```
