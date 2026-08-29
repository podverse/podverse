# 08 — Home subscribed list and filter input

**Cursor model:** Codex 5.3
**Reasoning:** high
**Detail:** [705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)
**Master step:** P2.1.1
**Depends on:** 02, 06

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 2, 4–10, 17–18 before starting.

## Goal

Home becomes subscribed-only with a local **`Filter…`** input at the top of the list.

## Work

1. In `apps/mobile/src/screens/home/`, remove the anonymous global-directory fallback. Home shows
   subscribed content in every auth state, reading through `subscriptionsRepository`.
2. Add the filter input to the list header in `HomeScreen.tsx`:
   - Placeholder `Filter…` through i18n — it filters, it never queries the API.
   - Always visible at the top of the list, scrolling away with content. Do **not** implement the
     hidden-until-pull-down reveal; that is deferred to detail 710.
   - `testID` for E2E, following the existing `home-*` naming.
3. Matching: **title only**, case-insensitive substring, against **both** the raw title and the
   article-stripped title. Reuse the article-stripping helper already used by the sort in
   `subscriptionsMerge.ts` rather than writing a second one.
4. Filter over **locally stored** channels and items, covering directory subscriptions and
   add-by-RSS feeds in one merged result. It must work with the network disabled.
5. Persistence: keep the text for the session, clear on app restart.
6. Keep the existing `all | add-by-RSS` chip (`SubscriptionFilterControl`). It scopes the list; the
   filter narrows within that scope.
7. Two distinct empty states:
   - **No subscriptions:** guidance copy plus a **Search** button navigating to the Search tab.
   - **No filter matches:** a plain "no matches" message, no Search button.
8. Keep the list virtualized per **mobile-list-virtualization**; the filter input goes in
   `ListHeaderComponent`.
9. Update `apps/mobile/e2e/home.yaml` to cover filtering to a known subscription and both empty
   states.

## Constraints

- All copy through i18n; no hardcoded strings or hex. Put the `Filter…` placeholder and both empty
  states in the **`consumer`** catalog, not the mobile overlay — web reuses these exact keys in
  prompt 14, and a key may not exist in both `consumer` and `mobile`.
- **Screen reader** per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
  the filter input has an `accessibilityLabel`, the clear affordance is labeled, and the result count
  change is announced rather than silently re-rendering. The `all | add-by-RSS` chips need
  `accessibilityRole` and `accessibilityState.selected` — a `testID` alone leaves assistive
  technology unable to tell which chip is active.
- Reuse shared components per **mobile-reusable-components**; do not rebuild list chrome.
- Navigating to Search must not break tab stack isolation — use the tab navigation seam, not a
  cross-tab stack reset.
- Do not run tests during implementation.

## Done when

Home lists only subscribed content, the filter narrows it offline across both content sources,
session persistence behaves, and both empty states render correctly.
