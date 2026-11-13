**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 50 — Membership comparison: Add by RSS is free on the mobile app

The membership comparison is the place the website and the mobile app tell people Add by RSS is
Premium-only. The row `add_rss` ("Add Custom RSS Feeds") is `free: false, premium: true` in
`MEMBERSHIP_COMPARISON_FEATURES`. Both clients render the document from
`buildMembershipComparisonDocument` (`GET /product/membership/comparison`, with the same function
as the offline fallback).

Mark that row the way Subscribe to Podcasts is already marked: checked in Free and in Premium,
with `freeOnMobileOnly`, so the name gets the existing `*` and the existing legend
("Free tier is available on the mobile app only. Premium includes the website."). Do not add a
legend, a column, or a catalog key.

Trial and Premium share one Add by RSS limit. This plan does not write that limit. Plan 60
removes `membership.trial_limitations_add_by_rss_feed_limit`, and the Trial limitations list
no longer states it. Plan 63 owns the at-limit message. Plan 64 owns the help text on the
mobile Add by RSS screen. The comparison row does not state a feed limit.

## Rows

R4, R49

## Runs after

32, 60

## Files

packages/helpers/src/lib/membershipFeatureComparison.ts
packages/helpers/src/lib/membershipFeatureComparison.test.ts
apps/api/src/test/external-services-and-meta.test.ts
release-notes/scratchpad.md

## Decisions already made (transcribe, do not revisit)

- One shared row, not a mobile-only override. The API document is what both clients render, and
  `freeOnMobileOnly` already means "Free is the mobile app, and Premium includes the website"
  (`membershipFeatureComparison.ts` file comment; Subscribe uses it).
- Web stays membership-gated. Do not edit `packages/helpers/src/lib/accessTier.ts`.
  `add_by_rss_add` and `add_by_rss_refresh` stay `membership`. On mobile those keys still gate a
  signed-in add and a signed-in refresh. They do not choose the parse path. This plan does not
  touch that.
- Do not edit catalog strings. The feature name `membership.comparison.add_rss` stays
  "Add Custom RSS Feeds" (and the existing es, fr, and el-GR lines). The legend
  `membership.free_on_mobile_legend` stays as written.
- Do not edit the at-limit sentence. Plan 60 deletes
  `membership.trial_limitations_add_by_rss_feed_limit` and drops `feedLimitBullet` from
  `apps/web/e2e/membership-page-trial-limitations.spec.ts`. The Trial limitations list no
  longer states the limit. Do not put that sentence back, and do not add a limit line to the
  list. Plan 63 owns `membership.add_by_rss_feed_limit_reached`. Leave that key as plan 63
  leaves it. Plan 64 owns the mobile help text (`features.add_by_rss.feed_limit_help`). Do not
  paste that sentence onto this row. These stay, because this set does not open adding a feed
  to the public directory:
  `membership.trial_limitations_directory_add_by_rss`,
  `membership.directory_add_by_rss_trial_blocked`.
- A signed-in user at the shared limit gets the support-email refusal. Signed-out adds have no
  feed limit. Neither fact is a second sentence on this table. Do not put the limit number on
  the `add_rss` row.

## 1. `packages/helpers/src/lib/membershipFeatureComparison.ts`

Replace the `add_rss` entry (the line `{ nameKey: 'add_rss', free: false, premium: true }`) with:

```ts
{ nameKey: 'add_rss', free: true, premium: true, freeOnMobileOnly: true },
```

Leave it where it sits in the array (after `screen_reader`, before `sync`). `freeOnMobileOnly`
is only applied when `free` is true and `comingSoon` is not (`membershipComparisonFreeOnMobileOnly`),
so the name becomes `"<plain name> *"` and the free-on-mobile legend is included. Subscribe
already turns that legend on; this row must turn it on even if Subscribe ever loses the flag.

Plan 60 edits this same file first. It removes `trialMaxAddByRSSFeeds` and
`premiumMaxAddByRSSFeeds` from `MembershipComparisonCaps` and adds no replacement field. It
removes `trialFeedLimit`, so the Trial limitations list no longer states the Add by RSS limit.
Leave that as plan 60 wrote it. Change only the `add_rss` row.

## 2. `packages/helpers/src/lib/membershipFeatureComparison.test.ts`

In `keeps Premium-only rows off the Free column`:

- Delete `expect(featureNamed('add_rss').free).toBe(false)`.
- Add, in that same test or in `marks Free-on-mobile separately from a feature that is mobile-app only`:
  `expect(featureNamed('add_rss').free).toBe(true)`,
  `expect(featureNamed('add_rss').premium).toBe(true)`,
  `expect(membershipComparisonFreeOnMobileOnly(featureNamed('add_rss'))).toBe(true)`.

In `localizes the Free check mark and fills Trial caps`, the fixture name for `add_rss` is the
string `add_rss`. After the flag change the built row's `name` is `add_rss *` and `free` is
true. Assert that on the row this test already finds by `id === 'add_rss'`. The order assertion
(`addRssIndex === screenReaderIndex + 1`) stays. Plan 60 removes `trialFeedLimit` from the
messages fixture and both Add by RSS fields from the caps, and it does not add
`maxAddByRSSFeeds` to `MembershipComparisonCaps`. Apply the `add_rss` assertions on top of
that. Do not restore `trialMaxAddByRSSFeeds`, `premiumMaxAddByRSSFeeds`, or `trialFeedLimit`.
Do not assert an Add by RSS line in the Trial limitations items.

## 3. `apps/api/src/test/external-services-and-meta.test.ts`

Search `describe('Membership comparison'`. Beside the existing `subscribe` assertion, assert the
`add_rss` row from the same `es` response. The Spanish catalog name is
`Añadir feeds RSS personalizados` (`packages/i18n-catalog/consumer/originals/es.json`,
`membership.comparison.add_rss`), so the document name is `Añadir feeds RSS personalizados *`
with `free: true` and `premium: true`. Do not page through the file.

## Tests

- Update `packages/helpers/src/lib/membershipFeatureComparison.test.ts` as in § 2.
- Update the existing `GET /comparison` case in
  `apps/api/src/test/external-services-and-meta.test.ts` as in § 3.
- No Playwright spec and no Maestro flow. The row is a pure flag; the helpers test holds it.
  The API case only checks the document the route already returns.

## Release scratchpad

```markdown
## Add by RSS shows as free on the mobile app in the membership comparison

- Surfaces: api, web, mobile
- Change: The membership comparison row "Add Custom RSS Feeds" is checked under Free and under Premium, with the existing free-on-mobile mark. The legend already says the free tier is the mobile app and Premium includes the website. The row does not state a feed limit. Adding a feed to the public directory stays blocked on Trial. The website still requires a membership to add a feed.
- Who notices: anyone reading the membership comparison on the website or in the app
- Operator steps: none
```
