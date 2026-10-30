This file is a record with no implementation prompt. It covers R10–R13, R23, and R24.

## Audit: every direct-open path already marks only that notification

A direct open (an OS push tap, a banner tap, or any tap that goes to the
notification's page) marks only that notification as seen. That already happens
on every direct-open path in both apps.

Server side, both endpoints exist in `apps/api/src/routes/account.ts` and
`AccountNotificationController` (`markReadOne`, `markReadByItem`):
`POST /account/notifications/:notification_id/mark-read` and
`POST /account/notifications/mark-read-by-item` (body `{ item_id_text, type }`). Each sets
`read_at` on the matching row only and sends `notification.read` with `scope: 'one'` to every
open stream. Push data carries no notification id. The parser writes the inbox row's
`payload.itemIdText` and `payload.type` from the same `itemNotification` it sends as push data
(`buildItemNotificationPayload` and the `linkIdText` / `messageType` it passes to
`notificationOrchestrator` in `packages/parser/src/lib/notifications/sharedNotificationHelpers.ts`),
so the by-item match finds exactly that row.

| Path | Where it marks | Endpoint |
| --- | --- | --- |
| Mobile OS push tap, app running (R10) | `usePushTapMarksRead` (mounted in `NotificationsRuntime`) subscribes through `subscribeToNotificationOpenReadTarget` in `apps/mobile/src/push/notificationRouting.ts`, then calls `markPushNotificationRead` | by item |
| Mobile OS push tap that cold-launched the app (R10) | Same hook, through `getInitialNotificationReadTarget` (read once per process) | by item |
| Mobile banner tap (R11) | `BannerNotificationHost` `onPress` calls `markNotificationReadById` before `openAccountNotificationLink` | by id |
| Mobile inbox row tap (R12) | No per-row call. Opening the inbox already ran Mark All as Read (`loadFirstPageAndMarkRead`), and a row that arrives while the inbox is focused is marked by id on arrival | all / by id |
| Web push popup shown by the service worker (R10) | `notificationclick` in `apps/web/public/webpush-sw.js` calls `markNotificationRead` with `fetch` | by item |
| Web push popup shown by a focused tab (R10) | `handleForegroundPush` in `apps/web/src/contexts/Notifications.tsx`: the popup's `onclick` calls `markPushNotificationRead`, which also sets the badge from `unread_count` | by item |
| Web popup on Chrome for Android, shown through the worker registration (R10) | `buildForegroundPushNotificationOptions` in `foregroundPush.ts` gives the popup the `data` shape the worker's click handler reads, so the click marks through the worker | by item |
| Web inbox row click (R12) | Same as mobile: the page ran Mark All as Read on open, and a live row is marked by id when the tab is visible | all / by id |

Paths that do not exist, so there is nothing to mark (R12):

- **Web in-page banner.** None by design. Web keeps the OS push popup and has no in-page toast.
- **Admin campaign push.** `createAccountNotificationWithOptionalPush` evaluates push eligibility
  and sends nothing. Campaign rows reach users only through the inbox.
- **Email.** No notification is sent by email.
- **UnifiedPush on mobile (FOSS flavor).** The app registers an endpoint
  (`apps/mobile/src/push/unifiedPushDeviceSync.ts`) but has no receiver that shows those pushes,
  so there is no tap. When a receiver is added, its tap must reach the same
  `markPushNotificationRead` call. That belongs to the FOSS push work, not this set.
- **Mobile push while the app is in the foreground.** The app sets no
  `Notifications.setNotificationHandler`, so the OS does not show the push. The banner shows
  instead, and the banner tap marks by id.
- **Auto-download silent pushes.** These carry `itemIdTexts` (plural) and create no inbox row.
  `extractNotificationReadTarget` returns null for them, so a stray response marks nothing.

Behavior that stays as it is:

- A web worker registered before the `api_base` parameter existed skips marking until the next
  visit with notifications allowed re-registers it (`ensureWebPushServiceWorkerScriptUrl`).
- The banner and push actions share one in-flight guard (`createInFlightGuard`) keyed by id or by
  item and type, so a double tap sends one request.

## Settled

- **D8:** "A push tapped while Offline Mode is on does not mark. The row stays unseen until the next inbox open with Offline Mode is off. Do not queue the mark."
- **D9:** "Tapping an inbox row sends no mark of its own. Rows rely on the mark-all when the inbox opens. Do not also mark that row by id on tap."
