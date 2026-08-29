# Track 14 — Push notifications (FCM + UnifiedPush)

**Phase slug:** `mobile-track14-push`
**Master steps:** 14.1–14.8
**Detail IDs:** 440–447
**Parallel group:** PG-9 (with Tracks 15, 16). **Run after Track 15** — 14.4 tap routing reuses the
deep-link path map (452) + cold-start replay (453).
**Ship bar:** Playstore-flavor FCM push (register, locale, tap routing, permission UX) + FOSS
UnifiedPush transport wired. Full Gradle flavors remain Track 20. Functional — no Track 23 polish.

## Prerequisites

- **Track 15 (452, 453) `done`** before 14.4 (tap routing).
- Auth + `accountRepository` + bearer `mobileApi` (done).
- Account-settings/prefs post-login hook pattern (Track 16.2 helper is reusable).

## Current state (from exploration) — greenfield on mobile

- No FCM / `expo-notifications` / `notifee` / UnifiedPush client in `apps/mobile`.
- `POST_NOTIFICATIONS` declared but **never requested at runtime**; no permission helpers.
- No `installation_id` generation/persistence anywhere.
- No device registration on login/bootstrap.
- Server API + DTOs + integration tests **exist** (`/account/fcm-device/*`, `/account/up-device/*`).
- `helpers-requests` wrappers **partially** exist. **Missing:** `reqAccountFCMDeviceUpdateLocale`,
  `reqAccountUPDeviceUpdateLocale`, `reqAccountUPDeviceDeleteAll`.
- FOSS Gradle `productFlavors` not implemented (policy only — Track 20).

## Locked decisions

| Topic                  | Choice                                                                       |
| ---------------------- | ---------------------------------------------------------------------------- |
| Playstore transport    | FCM (`@react-native-firebase/messaging` or `expo-notifications` — confirm)   |
| FOSS transport         | UnifiedPush via `/account/up-device/*` (no Firebase)                          |
| Flavor isolation       | Push behind a swappable boundary now; full Gradle flavors = Track 20          |
| `installation_id`      | Generate UUID once per install; persist (SecureStore/AsyncStorage)            |
| Permission timing      | Contextual, after explicit user action (never on cold start)                  |
| Register hook          | Reuse shared post-auth hook (same call sites as Track 16.2 prefs sync)        |
| Tap routing            | Reuse Track 15 `getStateFromPath` (452) + cold-start buffer (453)             |
| E2E                    | Simulate notification-open via deep link (Maestro can't deliver real push)    |

## Model mix

| Model     | Steps                               |
| --------- | ----------------------------------- |
| Opus 4.8  | 14.6 (UnifiedPush FOSS)             |
| Codex 5.3 | 14.1, 14.2, 14.3, 14.4, 14.8        |
| Auto      | 14.5 (permission UX), 14.7 (doc)    |

## Operator-only (not agent code)

- Firebase project; `google-services.json` / `GoogleService-Info.plist`; APNs key upload.
- FOSS signing + F-Droid metadata (Track 20.4–20.7).

## After this phase

- PG-9 feature tracks complete → later PGs (18 multi-device, 19 IAP/V4V, 20 FOSS, 22 release train).
