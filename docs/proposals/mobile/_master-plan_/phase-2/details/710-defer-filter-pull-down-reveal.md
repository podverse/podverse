# 710-defer-filter-pull-down-reveal

**Master step:** P2.3.8
**Model (author + implement):** Codex 5.3
**Status:** draft — deferred to a future phase

## Scope

The previous-generation app hides its list filter input until the user pulls the list down, matching
the native iOS hidden-search-bar convention. The operator wants that eventually, but it is
**deferred**.

For now the filter input ships **always visible** at the top of the list, scrolling away with
content (see
[705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)).

When this is picked up:

- Hidden at rest; revealed by pulling the list down; re-hides when the user scrolls back down.
- Android has no native equivalent convention, so its behavior needs an explicit decision — mirror
  iOS, or keep the input visible on Android.
- Interaction with pull-to-refresh needs care: both gestures start with a downward pull on a list
  that is already at the top, and they must not fight each other.
- Applies to every list that adopts the filter input, not just Home.

Because the filter input already exists and works, this is a presentation change with no data or API
impact.

## Acceptance criteria

- The filter input is hidden at rest and revealed by a downward pull on a list at scroll position 0.
- Pull-to-refresh still works and the two gestures are distinguishable in practice on both platforms.
- Re-hiding on scroll-down does not discard the user's filter text mid-session.
- Android behavior follows whichever option the operator picks, and the choice is recorded here.
- Accessible: the input is reachable without the gesture for assistive-technology users.

## Web parity references

- `apps/mobile/src/screens/home/HomeScreen.tsx` — `FlatList` header hosting the filter input
- Legacy: `podverse-rn` `PodcastsScreen` `_ListHeaderComponent` + `SearchBar`
- Rule: **mobile-list-virtualization**

## Verification

```bash
npm run lint
npm run mobile:e2e:test -- home
```
