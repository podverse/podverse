# 726-podcast-settings-and-header-bell

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Wire the podcast stack header actions and the podcast-specific settings screen. Depends on
[727](727-notification-subscribe-defaults.md) for auto-enable / type-default account fields and the
existing notification-channel APIs.

### Header actions

| Action                                                                                        | Visibility                   | Behavior                                                                |
| --------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| **Share**                                                                                     | Always                       | `buildPublicShareUrl('podcast', id)` + OS share sheet                   |
| **Bell**                                                                                      | Always                       | Logged out → `authentication.login_required`. Signed in → create/delete |
| `account_notification_channel` (types from account defaults on create). Icon reflects on/off. |
| **Gear**                                                                                      | Logged in **and** subscribed | Navigate to podcast settings screen                                     |

Use `HeaderBarAction` in `headerRight`. Bell and gear need accessible names (not `testID` alone).
Do not place share or the bell in `ChannelHeader` — that slot is subscribe and outbound links.
Web `HeaderButtons` is not the mobile layout for these icons
([`mobile-screen-layout`](/.cursor/rules/mobile-screen-layout.mdc)).

### Podcast settings screen

Mirror website [`ListChannelSettings`](apps/web/src/components/List/ListChannelSettings.tsx):

1. **RSS** — “Check feed for updates” (membership-gated on write; show status lines when available).
2. **Notifications** — Master switch:
   - Off → delete channel notification row (if any).
   - On → create channel and apply account type defaults; show three type switches
     (`new-item`, `livestream-scheduled`, `livestream-started`).
3. **Auto-download** — Disabled placeholder row / section pointing at the deferred work in
   [728](728-defer-channel-auto-download.md). Do not implement download scheduling.

### Lapsed membership

Show the settings screen. Tapping a notification write or RSS refresh uses `openGate`. Unsubscribe
remains available from the podcast header.

### Navigation

Register `PodcastSettings` (name TBD) on every stack that hosts `PodcastDetail` (Home, Search,
Library, Browse) per [`mobile-tab-stack-isolation`](/.cursor/rules/mobile-tab-stack-isolation.mdc).

## Acceptance criteria

- Share always works and uses the public podcast URL.
- Bell: logged-out shows login-required; signed-in toggles channel notifications and icon state.
- Gear appears only when logged in and subscribed; opens settings.
- Settings: master + three types; RSS refresh; auto-download placeholder.
- Lapsed membership: screen visible; gated writes open the membership dialog.
- E2E: bell login-gate when signed out; gear visible after signed-in subscribe; settings master
  switch creates notification channel (API-backed seed).

## Web parity references

- [`NotificationIconButton.tsx`](apps/web/src/components/Media/Header/NotificationIconButton.tsx)
- [`ListChannelSettings.tsx`](apps/web/src/components/List/ListChannelSettings.tsx)
- [`HeaderButtons.tsx`](apps/web/src/components/Media/Header/HeaderButtons.tsx)
- Mobile: [`MoreSettingsNotificationsScreen.tsx`](apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- podcast-episode
npm run mobile:e2e:test -- subscriptions-anonymous
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
