# 08 — Home view toggle and overflow menu

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Detail:** [708-home-view-toggle-and-overflow-menu](/docs/proposals/mobile/_master-plan_/phase-2/details/708-home-view-toggle-and-overflow-menu.md)
**Master step:** P2.1.1
**Depends on:** 04, 07

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 15–16, 20–23 before starting.

## Goal

A header overflow menu on Home with a persisted grid/list toggle and Mark All As Seen.

## Work

1. Add an overflow control to the Home header opening a menu with two items:
   **Grid View / List View** and **Mark All As Seen**.
2. **View toggle:**
   - Switches the subscribed list between list and grid.
   - Persists across app restarts via the existing prefs store in `apps/mobile/src/data/prefs/`.
   - Defaults to **list** on first launch — deliberately different from the legacy app's grid
     default.
   - Grid cells show artwork with the unseen badge overlaid, no title or metadata line.
   - Keep the existing responsive column logic (`resolveColumns.ts`) rather than a fixed three, and
     keep the list virtualized.
3. **Mark All As Seen:**
   - Sets every subscribed channel's last-seen timestamp to now using the repository from prompt 04.
   - Works signed out against local timestamps; for signed-in users it syncs like any other seen-state
     change and never moves seen state backward.
   - Hide or disable the item when nothing is unseen rather than presenting a no-op.
4. Label the menu items through i18n; reuse `layouts.grid_view` / `layouts.list_view` if those keys
   fit the mobile catalog.
5. Give the overflow control and both menu items `testID`s, and extend `apps/mobile/e2e/home.yaml`
   to toggle to grid and back and to mark all as seen clearing badges.

## Constraints

- No hardcoded hex; badge treatment matches prompt 07.
- Reuse existing menu/action-sheet components per **mobile-reusable-components**.
- **Screen reader** per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
  the overflow control is icon-only and **must** have an `accessibilityLabel`. Menu items need
  `accessibilityRole`, the view toggle exposes which mode is active, and a disabled Mark All As Seen
  sets `accessibilityState.disabled` rather than looking dimmed only. Announce the result of Mark All
  As Seen — a silent badge disappearance is invisible to a screen reader user.
- Do not run tests during implementation.

## Done when

The menu exists with both items, the view toggle persists and defaults to list, grid cells render
artwork plus badge, and Mark All As Seen clears every badge and survives a relaunch.
