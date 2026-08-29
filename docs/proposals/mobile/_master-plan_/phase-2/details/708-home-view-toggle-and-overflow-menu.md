# 708-home-view-toggle-and-overflow-menu

**Master step:** P2.1.1
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

Add a header overflow menu to Home with two items, matching the previous-generation app.

| Item                      | Behavior                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Grid View / List View** | Toggles the subscribed list between grid and list; persisted                    |
| **Mark All As Seen**      | Sets every subscribed channel's last-seen timestamp to now, clearing all badges |

### View toggle

Default is **list**. The choice persists across app restarts. This deliberately differs from the
previous-generation app, which defaulted to grid.

Grid cells show artwork with the unseen badge overlaid, no title or metadata line. Column count keeps
using the existing responsive breakpoints rather than a fixed three.

### Mark All As Seen

Applies the last-seen timestamp update from
[703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)
to every subscribed channel at once. Works signed out against local timestamps; for signed-in users
it syncs like any other seen-state change and only ever moves seen state forward.

The menu item is only meaningful when at least one channel has unseen items — hide or disable it
otherwise rather than presenting a no-op.

## Acceptance criteria

- The Home header shows an overflow control opening a menu with both items.
- Toggling view switches between list and grid, persists across restarts, and defaults to list on
  first launch.
- Grid cells render artwork plus the unseen badge, using responsive columns and staying virtualized.
- "Mark All As Seen" clears every unseen badge in one action and survives an app restart.
- The action works signed out and, when signed in, syncs without moving any timestamp backward.
- The menu item is hidden or disabled when nothing is unseen.
- Labels resolve through i18n; no hardcoded hex.
- E2E covers toggling to grid and back, and marking all as seen clearing badges.

- **Screen reader:** the icon-only overflow control has a label, menu items expose roles, the view
  toggle reports which mode is active, a disabled Mark All As Seen sets disabled state rather than
  only dimming, and the result of Mark All As Seen is announced.

## Web parity references

- Legacy: `podverse-rn` `NavPodcastsViewIcon`, `GridView.tsx`, `clearEpisodesCount()`
- `apps/web` `ViewSelector` (`layouts.grid_view` / `layouts.list_view` i18n keys)
- `apps/mobile/src/lib/.../resolveColumns.ts` — existing responsive column logic
- `apps/mobile/src/data/prefs/prefsStore.ts` — pref persistence pattern

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
