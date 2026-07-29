# 02 — Home subscribed mixes add-by-RSS + directory + filter (8.16)

**Master step:** 8.16
**Detail doc:** [601-home-subscribed-mixed-filter](/docs/proposals/mobile/_master-plan_/details/601-home-subscribed-mixed-filter.md)
**Model:** Codex 5.3
**Depends on:** Step 1 (9b.8 / `subscriptionsRepository`)

## Problem

Home's authenticated **Podcasts** subscribed view fetches directory follows only —
`fetchHomeFeedRows` → `reqChannelGetMany({ type: 'subscribed' })` in
`apps/mobile/src/screens/home/homeFeedData.ts`. Add-by-RSS feeds are invisible on Home.

## Goal

For the authenticated Podcasts subscribed view, show directory follows + add-by-RSS **mixed by
default**, with a filter to view add-by-RSS only.

## Approach

1. In `fetchHomeFeedRows`, for `mediaType === 'podcasts'` **and** `status === 'authenticated'`,
   source rows from `subscriptionsRepository.list({ filter })` instead of
   `reqChannelGetMany({ type: 'subscribed' })`. Map `SubscribedChannel` → `HomeFeedRowData`
   (`id = idText`, `title`, `imageUrl`, `subtitle` = source label or author). Leave the anonymous
   `global` path and all other media types unchanged.
2. Add a **subscription filter control** (segmented chip: All / Add-by-RSS) rendered only for the
   authenticated Podcasts view. Default **All** (mixed). Selecting Add-by-RSS passes
   `filter: 'addByRss'`. Persist the choice in device prefs — reuse the pattern in
   `apps/mobile/src/prefs/preferredMediaType.ts` (new key, e.g. `home.subscriptionFilter`).
3. Row tap routing by `SubscribedChannel.source`: directory → Podcast detail; add-by-RSS → the
   add-by-RSS detail/route already used by the RSS tab. Thread `source` (or a per-row `kind`)
   through `HomeFeedRowData` so the tap handler can branch without re-fetching.

## i18n

- New shared/consumer keys `subscriptions.filter.all`, `subscriptions.filter.addByRss` (reused by
  Library step 3). No hardcoded copy (**i18n-user-facing-strings**).

## Files

- `apps/mobile/src/screens/home/homeFeedData.ts` — subscribed podcasts source + row source field.
- Home screen component (media-type selector area) — add the filter chip + pref wiring + routing.
- `apps/mobile/src/prefs/` — new persisted filter pref (match `preferredMediaType`).
- i18n catalog keys.

## Acceptance criteria

- Authenticated Home Podcasts shows directory + add-by-RSS mixed by default.
- Filter → Add-by-RSS shows only add-by-RSS; back to All restores the mix.
- Filter selection persists across app restarts.
- Add-by-RSS row tap opens the add-by-RSS detail; directory row tap opens Podcast detail.
- Global (anonymous) view and other media types unchanged.

## Operator verification (end of step)

Prereq: **Mobile Metro** (`npm run mobile:dev`) + a device up. Provide; do not run.

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
