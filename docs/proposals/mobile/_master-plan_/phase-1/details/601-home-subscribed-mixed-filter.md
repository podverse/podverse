# 601-home-subscribed-mixed-filter

**Master step:** 8.16
**Model (author + implement):** Codex 5.3
**Status:** done
**Depends on:** 9b.8 / [600 unified subscriptions repository](/docs/proposals/mobile/_master-plan_/phase-1/details/600-unified-subscriptions-repository.md)

## Decision context

Home's **Podcasts** media type shows one merged list of directory follows and followed add-by-RSS
feeds. Add-by-RSS management remains in the RSS tab, while followed feeds are browsable from Home.

## Scope

For the **Podcasts** subscribed view on Home:

1. Source rows from **`subscriptionsRepository.list({ filter: 'all' })`** (600) instead of a
   directory-only API request. Map `SubscribedChannel` → existing `HomeFeedRowData` (id =
   `idText`, title, imageUrl, and source metadata).
2. Do not render a Home-level directory/add-by-RSS filter. Home's text filter applies to the
   complete merged local result.
3. Row tap routing: directory rows → Podcast detail; add-by-RSS rows → the typed add-by-RSS detail
   route on the Home stack. Use `SubscribedChannel.source` to branch.

## i18n

- The existing shared/consumer filter labels `subscriptions.filter.all` and
  `subscriptions.filter.addByRss` remain for Library's independent source-management view. Home
  has no source-filter copy. No hardcoded copy (see `i18n-user-facing-strings`).

## Acceptance criteria

- Home Podcasts shows the complete directory + add-by-RSS list in every auth state.
- Home has no directory/add-by-RSS source filter.
- Add-by-RSS row tap opens the Home-stack local detail; directory row tap opens Podcast detail.
- Global behavior for other media types is unchanged.

## Non-goals

- Music mediums (artists/albums) mixing — follow-on with 600's `medium` field.
- Episodes/clips subscribed feeds (those are separate Home media types and are not part of this
  Podcasts-only merge).

## Verification

```bash
npm run mobile:e2e:test -- home
```
