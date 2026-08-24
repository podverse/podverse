# 07 — Mobile tabs & notifications inbox

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Ship bar:** Settings UX fixes; RSS → Library; Notifications tab + badge + inbox; expanded prefs;
expiry deep link; Maestro flows.

## Goal

Rework mobile navigation (remove RSS tab, add Notifications tab), build in-app inbox with global
badge, improve settings notification UX (login alert modal, remove verbose help text), and route
membership-expiry taps to renew.

## Context (read first)

- Navigation: `apps/mobile/src/navigation/index.tsx`, `tabBarIcon.tsx`
- RSS: `apps/mobile/src/screens/rss/*`, `RssStackNavigator`
- Library hub: inline `LibraryHubScreen` in `index.tsx`
- Cross-tab RSS navigations: `LibrarySubscriptionsScreen.tsx`, `HomeScreen.tsx`
- Settings: `apps/mobile/src/screens/more/MoreSettingsScreen.tsx`
- Push routing: `apps/mobile/src/push/notificationRouting.ts`
- API phase 03
- Skills: **mobile-reusable-components**, **mobile-e2e-screenshots**, **i18n-user-facing-strings**

## 07a — Settings UX quick fixes (can ship early)

In `MoreSettingsScreen.tsx`:

1. **Remove** `subtitle={t(\`settings.notifications.default_${notificationType}_help\`)}` from
   notification `ListRow`s (the "default can be overridden" text).
2. **Remove** inline `{!isAuthenticated ? <Text>login_to_enable...</Text> : null}` block.
3. **On toggle while logged out:** show `Alert.alert` (or shared modal) with title/body from new
   i18n keys e.g. `settings.notifications.login_required_title` /
   `settings.notifications.login_required_message`; single OK button; do not change switch state.

## 07b — Fold RSS into My Library

1. Move `AddByRssRoot`, `AddByRssFeedList` from `RssStackNavigator` to `LibraryStackNavigator`
   (`LIBRARY_STACK_ROUTES`).
2. Add hub row in `LibraryHubScreen` items: `features.add_by_rss.label` → navigate to AddByRssRoot.
3. Update deep links: move `add-by-rss` paths under `My Library` in `mobileNavigationScreens`.
4. Replace `navigation.getParent()?.navigate('RSS')` with
   `navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssRoot)` in `LibrarySubscriptionsScreen`,
   `HomeScreen`.
5. Remove `Tab.Screen` for RSS; remove `RssStackNavigator` and `MobileTabParamList.RSS`.
6. Update `tabBarIcon.tsx` — remove `rss` key (or keep for Library row icon only).

## 07c — Notifications tab

1. Add `Notifications` to `MobileTabParamList` (between Search and My Library or replace RSS slot —
   **replace RSS tab position** with Notifications).
2. `NotificationsStackNavigator` → `NotificationsInboxScreen`.
3. `tabBarIcon('notifications')` — Ionicons `notifications` / `notifications-outline`.
4. **Badge:** `options.tabBarBadge` from unseen count hook (React Navigation supports number; hide
   when 0).
5. Deep link: `notifications` path → inbox screen.

### `NotificationsInboxScreen`

`apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx`:

- `useFocusEffect`: call `mark-seen` API then load page 1.
- `FlatList` with `ListHeaderComponent` for "New" / "Earlier" section titles (split data array or
  `SectionList`).
- Pagination: footer "Load more" button (match `PodcastDetailScreen` pattern) or `onEndReached`.
- Row component: title, body, time ago, `Pressable` → `navigation` or `Linking` to `link_path`
  (reuse deep link parser).
- Repository: `notificationsRepository` in `apps/mobile/src/data/repositories/` calling API via
  `requestWithMobileAuthRefresh` (thin layer per **mobile-data-layer**).
- Hook: `useNotificationsUnseenCount` for tab badge (poll on focus + interval).

### Expanded settings prefs

Mirror web phase 06: per-category in-app/push toggles calling `PUT /notification-preferences`. For
categories with 2–3 delivery options, use `OptionChipGroup`; for more, push sub-screens. Product
updates: allow disable.

Keep legacy `syncNotificationTypeToAccountSettings` during transition OR map to new API in same
screen (prefer single new API; migrate toggles to categories `new-content` / `livestream`).

## 07d — Push tap routing

Update `notificationRouting.ts`:

- Add category/payload handling for `membership-expiry` → `MoreMembership` or web checkout URL.
- Admin categories with `link_path` in payload → generic path resolver.

## E2E

`apps/mobile/e2e/notifications-inbox.yaml`:

- Launch logged-in (E2E API user with seeded notification or API setup step)
- Tap Notifications tab → assert inbox
- Assert badge cleared after visit (optional second flow)

Update `settings-select.yaml` if notification section copy changed.

## i18n

- `nav.tab.notifications` in mobile catalog
- Login required alert strings
- Inbox section headers: `notifications.section.new`, `notifications.section.earlier`

## Tasks

1. Settings UX (07a).
2. RSS → Library (07b).
3. API repository + hooks.
4. Notifications tab + inbox screen (07c).
5. Expanded prefs (07c).
6. Push routing (07d).
7. Maestro flows + update cross-tab navigations in E2E.

## Out of scope

- Native push payload format changes (unless needed for new categories).
- Web UI (06).

## Acceptance

- Five tabs: Home, Search, Notifications, My Library, More.
- RSS reachable from Library hub.
- Unseen badge on tab; cleared after opening inbox.
- Logged-out toggle shows alert, not inline warning text.

## Verification (operator)

Leave-running: **Mobile Metro** (`npm run mobile:dev:e2e`), **Mobile E2E API**, **Mobile iOS**.

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- notifications-inbox
npm run mobile:e2e:test -- settings-select
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
