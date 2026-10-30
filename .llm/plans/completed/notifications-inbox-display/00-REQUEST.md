# Notifications inbox display

## Request

Do notifications display correctly on both mobile and web for Podverse in the inbox? I thought I saw on mobile, I thought I saw a number symbol as if there was a placeholder that was not getting used. And I thought I saw it might be grouping notifications, but there is no grouping of notifications we want to do. They should be a linear list of notifications that have an indicator next to them if they have not been seen before, and no indicator next to them if they have been seen before.

## Operator answers

- **When a notification has been seen:** "Opening the inbox counts them as seen, but there should also be handling that I think already exists where tapping a notification directly, like a push notification or a banner notification, etc., when it takes you to the page that the notification is intended to take them to, those actions should mark only that notification as seen."

Settled reading for planning: opening the inbox marks every notification already in the list as seen. Those rows keep their unseen indicator for that visit, and the next open shows no indicator on them. A direct open (push, banner, or the same kind of tap that goes to the notification's page) marks only that notification as seen. The operator believes that direct-open path already exists; keep it, and add it only where it is missing. Do not add Unread / Earlier groups. Web and mobile use the same seen rule.

### Review of the first planning pass

Answers to the decisions listed under "Decisions to review" in `00-SUMMARY.md`, in the operator's words.

- **D1 (plan 10):** "The inbox time line uses the same platform relative-time formatter as web (Intl.RelativeTimeFormat). The in-app banner uses that same helper, so it does too. Do not fill the inbox time line from the catalog ICU strings."
- **D2 (plan 10):** "Removed Content and the OPML rate-limit message use the shared catalog strings. Delete the mobile-only copies. Add the load-time converter so those shared plural strings render. The inbox time line still uses the platform formatter."
- **D3 (plan 21):** "Leave the phone notification shade as the phone handles it. Do not set a per-notification thread id or group key. The in-app inbox stays one flat list on web and mobile."
- **D4 (plan 20):** "The unseen dots clear when the listener leaves the inbox, including by opening a row and coming back. That matches web."
- **D5 (plan 20):** "Rows first loaded from a later page during that visit show no dot. Opening the inbox already marked them seen. Do not add a per-row read time to the list API."
- **D6 (plan 21):** "Add the guidance rule that the inbox is one flat list and states the seen rule."
- **D7 (plan 30):** "Every direct-open path already marks only that notification. Record the audit. Add no unit test. Do not run plan 30 as implementation."
- **D8 (plan 30):** "A push tapped while Offline Mode is on does not mark. The row stays unseen until the next inbox open with Offline Mode is off. Do not queue the mark."
- **D9 (plan 30):** "Tapping an inbox row sends no mark of its own. Rows rely on the mark-all when the inbox opens. Do not also mark that row by id on tap."

Scope of the second pass, per the operator: "Plans 20 and 21 already match D3 through D6, so leave them. The second pass revises plan 10 for D1 and D2, and drops plan 30 test work while recording D7 through D9 as already settled."

## Glossary

- **Number symbol:** the `#` character the operator saw on a mobile inbox row, read as a count placeholder that was not filled in.

## Orientation

Checked while writing this file.

- Web inbox is a flat map of rows, with an unread dot and a screen-reader "Unread" string per unread row: `apps/web/src/app/notifications/NotificationsPageClient.tsx` (`NotificationRow`).
- Mobile inbox is a flat list. The unread dot is `InboxNotificationRow` in `apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx`. The same row prefixes the accessibility label with `t('notifications.section.unread')` when `is_unread` is true. That key is "Unread" in `packages/i18n-catalog/mobile/originals/en-US.json` under `notifications.section`. A sibling key is `notifications.section.earlier` ("Earlier"). No other caller uses `notifications.section`.
- Consumer catalog keys `notifications_page.unread_section` and `notifications_page.earlier_section` are "Unread" and "Earlier" in `packages/i18n-catalog/consumer/originals/en-US.json`. Web uses `unread_section` as the screen-reader string on an unread row.
- Relative time copy uses next-intl ICU plurals whose count placeholder is `#`, for example `notifications_page.relative_time_hours_ago`: `{count, plural, one {# hour ago} other {# hours ago}}`. Mobile formats that through `formatNotificationRelativeTime` in `apps/mobile/src/notifications/accountNotificationLineLabels.ts`, which calls `t(..., { count })`. `apps/mobile` has no `i18next-icu` setup.
- Opening the mobile inbox calls `notificationsRepository.markRead`, then rewrites cached rows to `is_unread: false` in the same load (`NotificationsInboxScreen`).
- Marking one notification read already exists: `markNotificationReadById` in `apps/mobile/src/notifications/notificationReadActions.ts`, used by the inbox live row and by `apps/mobile/src/notifications/BannerNotificationHost.tsx`.
