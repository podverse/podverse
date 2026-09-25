# Auto download background spike (go / no-go)

**Date:** plan implementation
**Verdict: GO** for Membership-tier with silent push + background fetch.

## What was checked

| Path | Platform | Expected mechanism | Result |
| ---- | -------- | ------------------ | ------ |
| Silent push → background JS → FileSystem download | iOS | FCM / APNs `content-available: 1` data message; `expo-notifications` + `expo-task-manager` background task; `expo-file-system` `createDownloadResumable` (NSURLSession background) | **Supported** on Expo SDK 52 with UIBackgroundModes `remote-notification` + `fetch`. Force-quit still drops delivery (documented OS limit). |
| Same | Android | High-priority FCM data message; UnifiedPush data payload | **Supported**. Less restricted than iOS while the process can run. |
| Periodic refresh without push | Both | `expo-background-fetch` + `expo-task-manager` | **Best-effort**; OS schedules intervals. Sufficient as a backstop for add-by-RSS and missed pushes. |
| Foreground sync evaluate | Both | After `channel-items` / `add-by-rss-parse` | **Reliable**; primary path when the app is open. |

## Operator device checklist (still required before ship)

1. Enable auto download on one podcast (Wi‑Fi only).
2. Kill to background (do not force-quit). Publish a new episode (or trigger parser). Confirm a transfer starts without opening the app.
3. Force-quit on iOS; confirm no silent wake (expected); open app and confirm evaluate catches up.
4. Toggle cellular off; on cellular, confirm pending; restore Wi‑Fi and confirm enqueue.
5. Repeat on Android FCM flavor and UnifiedPush flavor.

## Fallback not taken

iOS silent-push + background download is viable under Expo 52, so Membership + server registration (plan 05) proceeds. If a device checklist fails in a way that cannot be fixed with entitlements / payload headers, revisit anonymous best-effort and drop plan 05.
