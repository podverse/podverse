# 601-home-subscribed-mixed-filter

**Master step:** 8.16
**Model (author + implement):** Codex 5.3
**Status:** done
**Depends on:** 9b.8 / [600 unified subscriptions repository](/docs/proposals/mobile/_master-plan_/phase-1/details/600-unified-subscriptions-repository.md)

## Decision context

Home's **Podcasts** media type currently shows directory follows only
(`fetchHomeFeedRows` → `reqChannelGetMany({ type: 'subscribed' })` in
`apps/mobile/src/screens/home/homeFeedData.ts`). Add-by-RSS feeds are invisible here — they live
only in the RSS tab. Per the master-plan decision, subscribed views must **mix add-by-RSS with
directory follows by default**, with a filter to view only add-by-RSS.

## Scope

For the authenticated **Podcasts** subscribed view on Home:

1. Source rows from **`subscriptionsRepository.list({ filter })`** (600) instead of the
   directory-only `reqChannelGetMany({ type: 'subscribed' })` call. Map `SubscribedChannel` →
   existing `HomeFeedRowData` (id = `idText`, title, imageUrl, subtitle = source label or author).
   - Anonymous/global view (`type: 'global'`) and non-podcasts media types are unchanged.
2. Add a **subscription filter control** (segmented chip: All / Add-by-RSS) shown only for the
   authenticated Podcasts view. Default **All** (mixed). Selecting **Add-by-RSS** passes
   `filter: 'addByRss'`. Persist the choice in device prefs (reuse the prefs pattern from
   `preferredMediaType`; new key e.g. `home.subscriptionFilter`).
3. Row tap routing: directory rows → Podcast detail; add-by-RSS rows → the add-by-RSS detail/route
   already used by the RSS tab. Use `SubscribedChannel.source` to branch.

## i18n

- New shared/consumer keys for filter labels: `subscriptions.filter.all`,
  `subscriptions.filter.addByRss` (reuse across Home + Library 602). No hardcoded copy
  (see `i18n-user-facing-strings`).

## Acceptance criteria

- Authenticated Home Podcasts shows directory + add-by-RSS mixed by default.
- Filter → Add-by-RSS shows only add-by-RSS feeds; back to All restores the mix.
- Filter selection persists across app restarts.
- Add-by-RSS row tap opens the add-by-RSS detail; directory row tap opens Podcast detail.
- Global (anonymous) and other media types unchanged.

## Non-goals

- Music mediums (artists/albums) mixing — follow-on with 600's `medium` field.
- Episodes/clips subscribed feeds (those aggregate server-side; revisit after 600 caches
  add-by-RSS items).

## Verification

```bash
npm run mobile:e2e:test -- home
```
