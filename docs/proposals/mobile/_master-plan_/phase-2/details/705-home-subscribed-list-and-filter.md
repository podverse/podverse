# 705-home-subscribed-list-and-filter

**Master step:** P2.1.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Home is a **subscribed-only** surface for every media-type chip. Discovery lives on the **Browse**
tab (global directory) and the **Search** tab (Podcast Index feeds). Home never falls back to
global directory rows — after
[701-anonymous-subscriptions](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)
a signed-out user has real subscriptions to show.

**Every chip.** Podcasts / Artists / Albums read local follows filtered by channel **kind**
([739](/docs/proposals/mobile/_master-plan_/phase-2/details/739-home-subscribed-channel-kind-and-loaders.md)).
Episodes and Tracks read local items for subscribed parents (account subscribed API fill when the
local store is empty and signed in — never `type: 'global'`). Clips use the account subscribed clip
API only when authenticated; otherwise the empty matrix in
[740](/docs/proposals/mobile/_master-plan_/phase-2/details/740-home-empty-discovery-ctas.md)
(login or Browse).

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

### Unified subscription list

Home always shows directory subscriptions and followed add-by-RSS feeds together. The list source
does not have a Home-level directory/add-by-RSS scope control; the text input narrows the combined
local result.

### Empty states

| Situation              | Presentation                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Chip has no rows       | Generic empty copy plus Browse and/or Search per [740](/docs/proposals/mobile/_master-plan_/phase-2/details/740-home-empty-discovery-ctas.md) |
| Filter matches nothing | A plain "no matches" message — **no** discovery button                                                                                        |

Filter visibility is limited to channel lists (Podcasts / Artists / Albums) when rows exist —
see [741](/docs/proposals/mobile/_master-plan_/phase-2/details/741-home-filter-channel-lists-only.md).

### Carried over from detail 700

`App.tsx` renders `<MembershipExpiredBanner onRenew={navigateToMembershipScreen} />` above the tab
navigator — one of the three renewal reminder surfaces from
[700](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md).
It is mounted app-wide, not per screen, so this rebuild must **not** add a second copy to
`HomeScreen`; a lapsed member would see the banner twice on Home.

## Acceptance criteria

- Home lists only subscribed content; no global/directory rows appear for any auth state.
- The membership expiry banner still renders once above Home for a lapsed member and is still
  dismissible.
- The filter input is visible on Podcasts / Artists / Albums when the list has rows, and scrolls with
  content.
- Filtering matches titles case-insensitively, including article-stripped forms, across directory
  subscriptions and add-by-RSS feeds together.
- Filtering works with the network disabled.
- Filter text survives tab switches within a session and is gone after an app restart.
- Directory subscriptions and add-by-RSS feeds appear together in the same Home result.
- Empty chips show the discovery CTAs from detail 740; zero filter matches shows the plain message
  with no discovery button.
- The list stays virtualized (`FlatList`), and all copy resolves through i18n.
- E2E covers filtering to a known subscription and both empty states.

- **Screen reader:** the filter input and its clear affordance are labeled, and the result count
  change is announced rather than silently re-rendering.

**The session-only filter text is deliberate, not an oversight.**
[714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)
makes sort and structured filters persist across restarts, and explicitly **excludes free text**: a
restored filter term hides most of the list and reads as missing data rather than as a remembered
preference.

## Web parity references

- `apps/mobile/src/screens/home/HomeScreen.tsx`, `homeFeedData.ts`, `HomeFeedRow.tsx`
- `apps/mobile/src/data/repositories/subscriptionsMerge.ts` — existing article-stripped sort
- Web's `/podcasts` has no client-side filter; mobile adds one deliberately
- Rules: **mobile-list-virtualization**, **i18n-user-facing-strings**

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
