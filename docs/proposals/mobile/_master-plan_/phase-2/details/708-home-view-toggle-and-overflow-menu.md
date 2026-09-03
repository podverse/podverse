# 708-home-view-toggle-and-overflow-menu

**Master step:** P2.1.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Add a header overflow menu to Home with two entries, matching the previous-generation app.

| Entry                     | Behavior                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Grid View / List View** | Chooses how the subscribed list is drawn; persisted                             |
| **Mark All As Seen**      | Sets every subscribed channel's last-seen timestamp to now, clearing all badges |

The menu is offered on the **Podcasts** media type only. Both entries describe the subscribed
channel list, so on Episodes, Clips, Artists, Albums, and Tracks it would open onto nothing that
applies.

### View toggle

Default is **list**. The choice persists across app restarts, per media type, under the same
scope-keyed preference the sort uses (`viewMode`). This deliberately differs from the
previous-generation app, which defaulted to grid: a tile is artwork alone, which identifies a show
only to someone who already recognises its cover, whereas rows name every subscription.

The view is presented as **two checkable rows** rather than one row whose label flips between "Grid
View" and "List View". A flipping label cannot say whether it names the mode you are in or the one
you would move to, and there is no way to hear the difference — which is also what makes the
"reports which mode is active" requirement below unsatisfiable with a single row.

Grid cells show artwork with the unseen badge overlaid, no title or metadata line. The title remains
the tile's accessible name, so the grid costs a screen reader user no information even though it
shows less.

Column count is responsive, from `resolveGridColumns` beside the existing `resolveColumns`. The two
are separate because they count different things: `resolveColumns` counts how many **rows** fit side
by side, and a row carries artwork, a title, a metadata line, and its action buttons, so a phone fits
exactly one. Reusing it for tiles would put a single tile per line on every phone — a list with the
titles removed rather than a grid. Both scale on the same design-token breakpoints.

### Mark All As Seen

Applies the last-seen timestamp update from
[703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)
to every subscribed channel and add-by-RSS feed at once, under a single timestamp so the badges clear
together rather than in write order.

Written straight to the device, exactly as opening a channel is, so it works signed out and returns
before the network is consulted. The next reconciliation carries the timestamps to the account by the
same push that carries an ordinary mark, and because seen state only moves forward a failed one costs
nothing. It marks what is followed **now** rather than every row in the table, so a stale entry for
something unfollowed elsewhere is not resurrected with a fresh timestamp.

Disabled when no subscription has anything unseen, answered from the badges already on screen rather
than by asking storage again.

## Acceptance criteria

- The Home header shows an overflow control opening a menu with the view rows and Mark All As Seen.
- Choosing a view switches between list and grid, persists across restarts, and defaults to list on
  first launch.
- Grid cells render artwork plus the unseen badge, using responsive columns and staying virtualized.
- "Mark All As Seen" clears every unseen badge in one action and survives an app restart.
- The action works signed out and, when signed in, syncs without moving any timestamp backward.
- The menu entry is disabled when nothing is unseen.
- Labels resolve through i18n; no hardcoded hex.
- E2E covers switching to grid and back, and the disabled Mark All As Seen not acting.

- **Screen reader:** the overflow control has a label, menu items expose menu roles, the checked view
  row reports itself as selected, a disabled Mark All As Seen sets disabled state rather than only
  dimming, and the result of Mark All As Seen is announced.

## Web parity references

- Legacy: `podverse-rn` `NavPodcastsViewIcon`, `GridView.tsx`, `clearEpisodesCount()`
- `apps/web` `ViewSelector` (`layouts.grid_view` / `layouts.list_view` i18n keys, already in the
  `consumer` catalog and reused here)
- `apps/mobile/src/theme/resolveColumns.ts` — responsive row and tile column counts
- `apps/mobile/src/prefs/homeListPrefs.ts` — scope-keyed pref persistence, shared with the sort
- `apps/mobile/src/components/primitives/ActionSheet.tsx` — the shared bottom sheet, extracted from
  `MediaRowActions` so the header menu and the row menus are one component

## Verification

```bash
npm run lint
npm --prefix apps/mobile run test
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- subscriptions-anonymous
```
