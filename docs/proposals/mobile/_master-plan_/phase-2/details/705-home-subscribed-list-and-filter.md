# 705-home-subscribed-list-and-filter

**Master step:** P2.1.1
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

Home becomes a **subscribed-only** surface. All discovery moves to the Search tab, which stays where
it is. Home no longer falls back to global directory content for signed-out users — after
[701-anonymous-subscriptions](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)
a signed-out user has real subscriptions to show.

### Filter input

A text input sits at the top of the list with a **`Filter…`** placeholder. It filters; it does not
search the API.

| Property    | Decision                                                                |
| ----------- | ----------------------------------------------------------------------- |
| Placement   | Top of the list, scrolling away with content                            |
| Matching    | **Title only**, case-insensitive substring                              |
| Articles    | Matches the raw title **and** the article-stripped title                |
| Data source | **Locally stored** channels and items only                              |
| Coverage    | Both directory subscriptions and add-by-RSS feeds, in one merged result |
| Persistence | Kept for the session; cleared on app restart                            |

Matching both raw and article-stripped titles means typing `adam` finds "The Adam Friedland Show",
consistent with the existing article-stripped sort.

Because it reads local storage, the filter works fully offline.

The hidden-until-pull-down reveal from the legacy app is **deferred** —
see [710-defer-filter-pull-down-reveal](/docs/proposals/mobile/_master-plan_/phase-2/details/710-defer-filter-pull-down-reveal.md).

### Existing chip

The current `all | add-by-RSS` subscription chip **stays**. It scopes the list; the filter narrows
within that scope.

### Empty states

Two distinct empty states:

| Situation               | Presentation                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| No subscriptions at all | Guidance copy plus a **Search** button that opens the Search tab |
| Filter matches nothing  | A plain "no matches" message — **no** Search button              |

## Acceptance criteria

- Home lists only subscribed content; no global/directory rows appear for any auth state.
- The filter input is visible at the top of the list and scrolls with content.
- Filtering matches titles case-insensitively, including article-stripped forms, across directory
  subscriptions and add-by-RSS feeds together.
- Filtering works with the network disabled.
- Filter text survives tab switches within a session and is gone after an app restart.
- The `all | add-by-RSS` chip still scopes the list, and the filter applies within it.
- Zero subscriptions shows the Search CTA and it navigates to the Search tab; zero matches shows the
  plain message.
- The list stays virtualized (`FlatList`), and all copy resolves through i18n.
- E2E covers filtering to a known subscription and both empty states.

- **Screen reader:** the filter input and its clear affordance are labeled, the `all | add-by-RSS`
  chips expose `accessibilityRole` and selected state, and the result count change is announced
  rather than silently re-rendering.

**The session-only filter text is deliberate, not an oversight.**
[714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)
makes sort and structured filters persist across restarts, and explicitly **excludes free text**: a
restored filter term hides most of the list and reads as missing data rather than as a remembered
preference. The `all | add-by-RSS` chip does persist, through the shared contract. Do not "fix" the
text input to match the chip.

## Web parity references

- `apps/mobile/src/screens/home/HomeScreen.tsx`, `homeFeedData.ts`, `HomeFeedRow.tsx`
- `apps/mobile/src/components/subscriptions/SubscriptionFilterControl.tsx`
- `apps/mobile/src/data/repositories/subscriptionsMerge.ts` — existing article-stripped sort
- Web's `/podcasts` has no client-side filter; mobile adds one deliberately
- Rules: **mobile-list-virtualization**, **i18n-user-facing-strings**

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
