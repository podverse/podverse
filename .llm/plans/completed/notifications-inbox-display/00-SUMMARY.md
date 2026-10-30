# Notifications inbox display — summary

Request: [00-REQUEST.md](00-REQUEST.md). Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Order and file ownership: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Requirement ledger

- **R1** (area B) "Do notifications display correctly on both mobile ... for Podverse in the inbox?" — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R2** (area B) "Do notifications display correctly on both ... web for Podverse in the inbox?" — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R3** (area A) "I thought I saw on mobile, I thought I saw a number symbol as if there was a placeholder that was not getting used." — Plan: [11](../../completed/notifications-inbox-display/11-relative-time-intl-formatter.md)
- **R4** (area B) "I thought I saw it might be grouping notifications" (question: does either inbox group rows?) — Plan: [21](../../completed/notifications-inbox-display/21-inbox-drop-group-catalog-keys.md)
- **R5** (area B) "there is no grouping of notifications we want to do." — Plan: [21](../../completed/notifications-inbox-display/21-inbox-drop-group-catalog-keys.md)
- **R6** (area B) "They should be a linear list of notifications" — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R7** (area B) "that have an indicator next to them if they have not been seen before," — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R8** (area B) "and no indicator next to them if they have been seen before." — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R9** (area B) "Opening the inbox counts them as seen" — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R10** (area C) "tapping a notification directly, like a push notification ... when it takes you to the page that the notification is intended to take them to, those actions should mark only that notification as seen." — Plan: [00-DIRECT-OPEN-AUDIT.md](00-DIRECT-OPEN-AUDIT.md) (record, no prompt)
- **R11** (area C) "tapping a notification directly, like ... a banner notification ... those actions should mark only that notification as seen." — Plan: [00-DIRECT-OPEN-AUDIT.md](00-DIRECT-OPEN-AUDIT.md) (record, no prompt)
- **R12** (area C) "tapping a notification directly, like a push notification or a banner notification, etc." (any other direct open that lands on the notification's page) — Plan: [00-DIRECT-OPEN-AUDIT.md](00-DIRECT-OPEN-AUDIT.md) (record, no prompt)
- **R13** (area C) "handling that I think already exists" (question: which direct-open paths already mark one; keep them and add only where missing) — Plan: [00-DIRECT-OPEN-AUDIT.md](00-DIRECT-OPEN-AUDIT.md) (record, no prompt)
- **R14** (area B) "Those rows keep their unseen indicator for that visit, and the next open shows no indicator on them." — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R15** (area B) "Do not add Unread / Earlier groups." — Plan: [21](../../completed/notifications-inbox-display/21-inbox-drop-group-catalog-keys.md)
- **R16** (area B) "Web and mobile use the same seen rule." (inbox-open rule; area C covers the direct-open rule on both surfaces) — Plan: [20](../../completed/notifications-inbox-display/20-inbox-visit-unread-indicator.md)
- **R17** (area A, step 05) "The inbox time line uses the same platform relative-time formatter as web (Intl.RelativeTimeFormat)." — Plan: [11](../../completed/notifications-inbox-display/11-relative-time-intl-formatter.md)
- **R18** (area A, step 05) "The in-app banner uses that same helper, so it does too." — Plan: [11](../../completed/notifications-inbox-display/11-relative-time-intl-formatter.md)
- **R19** (area A, step 05) "Do not fill the inbox time line from the catalog ICU strings." — Plan: [11](../../completed/notifications-inbox-display/11-relative-time-intl-formatter.md)
- **R20** (area A, step 05) "Removed Content and the OPML rate-limit message use the shared catalog strings." — Plan: [10](10-mobile-icu-plural-expansion.md)
- **R21** (area A, step 05) "Delete the mobile-only copies." — Plan: [10](10-mobile-icu-plural-expansion.md)
- **R22** (area A, step 05) "Add the load-time converter so those shared plural strings render." — Plan: [10](10-mobile-icu-plural-expansion.md)
- **R23** (area C, step 06) "Every direct-open path already marks only that notification. Record the audit." — Plan: [00-DIRECT-OPEN-AUDIT.md](00-DIRECT-OPEN-AUDIT.md) (record, no prompt)
- **R24** (area C, step 06) "Add no unit test. Do not run plan 30 as implementation." — Plan: [00-DIRECT-OPEN-AUDIT.md](00-DIRECT-OPEN-AUDIT.md) (record, no prompt)

## Areas

### Area A — Mobile count placeholders (ICU plurals)

- **Rows:** R3
- **Starts from:** `apps/mobile/src/i18n/index.ts` (i18next with single-brace `{name}` interpolation and no ICU plugin), `apps/mobile/src/i18n/resources.ts`, `packages/i18n-catalog/scripts/i18n-compile.ts`, and `formatNotificationRelativeTime` in `apps/mobile/src/notifications/accountNotificationLineLabels.ts`. The consumer keys `notifications_page.relative_time_*` are next-intl ICU plurals (`{count, plural, one {# hour ago} other {# hours ago}}`), which i18next renders with a raw `#`. `apps/mobile/src/screens/more/MoreRemovedContentScreen.tsx` and the mobile OPML rate-limit message (`src/lib/rateLimit/handleRateLimitMessage.ts`) render correctly today through mobile-only `_one` / `_other` copies (`removed_content.*`, `features.opml.rate_limited_time_*`) of shared ICU keys. After the first review, the inbox and banner time line use `Intl.RelativeTimeFormat` as web does, and those two screens move to the shared catalog strings through a load-time converter.
- **Depends on:** none
- **Shared files:** `packages/i18n-catalog/consumer/originals/*.json` if the chosen fix edits keys (area B may remove `notifications_page.earlier_section` from the same files); `accountNotificationLineLabels.ts` is read by area B's inbox row.
- **Plan number block:** 10–19

### Area B — Inbox list and seen indicator (mobile and web)

- **Rows:** R1, R2, R4, R5, R6, R7, R8, R9, R14, R15, R16
- **Starts from:** mobile `apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx` (`InboxNotificationRow`, `loadFirstPageAndMarkRead`, live `created` handler) and `apps/mobile/src/notifications/notificationsInboxCache.ts`; web `apps/web/src/app/notifications/NotificationsPageClient.tsx` (`NotificationRow`, `loadFirstPageAndMarkRead`), `notificationsInboxRows.ts`, and `NotificationsPage.module.scss`. Catalog keys `notifications.section.unread` / `.earlier` (mobile layer) and `notifications_page.unread_section` / `.earlier_section` (consumer layer). Tests: `apps/web/e2e/notifications-inbox.spec.ts`, `notificationsInboxRows.test.ts`, `notificationsInboxCache.test.ts`, and the inbox Maestro flow under `apps/mobile/e2e/`. A first look found no grouping code in either inbox; the plan answers R4 from the code, including whether the operator may have seen OS-level push grouping rather than inbox grouping.
- **Depends on:** none
- **Shared files:** mobile and consumer catalog originals (area A may edit consumer keys); `apps/mobile/src/notifications/notificationReadActions.ts` and `apps/mobile/src/push/openAccountNotificationLink.ts` are called by the inbox screen and may be edited by area C.
- **Plan number block:** 20–29

### Area C — Direct open marks only that notification seen (mobile and web)

- **Rows:** R10, R11, R12, R13
- **Starts from:** mobile `apps/mobile/src/push/notificationRouting.ts` (push response listeners and cold-start `getLastNotificationResponseAsync`), `apps/mobile/src/push/openAccountNotificationLink.ts`, `apps/mobile/src/notifications/BannerNotificationHost.tsx` (already calls `markNotificationReadById` on banner press), `apps/mobile/src/notifications/notificationReadActions.ts`; web `apps/web/public/webpush-sw.js` (`notificationclick`, `mark-read-by-item`) and `apps/web/src/lib/notifications/webpush/foregroundPush.ts`; API mark-one and mark-by-item in `apps/api/src/controllers/account/accountNotification.ts` and `apps/api/src/routes/account.ts`. Earlier completed plans `21-notification-mark-one-read.md`, `33-web-push-tap-marks-read.md`, and `41-mobile-push-tap-mark-read.md` under `.llm/plans/completed/realtime-banner-notifications/` describe what was built. The plan audits each direct-open path, keeps what exists, and adds marking only where it is missing.
- **Depends on:** none
- **Shared files:** `openAccountNotificationLink.ts` and `notificationReadActions.ts` (area B's inbox screen calls both).
- **Plan number block:** 30–39

## Order

- **Wave 1:** areas A, B, C. No area builds on another area's plan. A and B may both edit consumer catalog originals, but on different keys. B and C share two mobile helpers that only C is expected to edit. Assemble orders implementation phases by `## Files` overlap.
- **Second pass, after the first review:** answers are under "Review of the first planning pass" in `00-REQUEST.md`. Plans 20 and 21 stand as written (D3–D6). Step 05 revises plan 10 for R3 and R17–R22. Plan 10 now also edits mobile catalog originals and runs `i18n:compile`, as plan 21 does, so Close must keep plans 10 and 21 in different phases. Step 06 turns plan 30 into `00-DIRECT-OPEN-AUDIT.md`, a record with no prompt. It covers R10–R13, R23, and R24, and it records D8 and D9 as settled. Close maps those rows to that record, not to a prompt, and gives the set no prompt for plan 30.

## Decisions to review

All nine were answered in the first review; the answers are under "Review of the first planning pass" in `00-REQUEST.md`.

- **D1** (step 02, plan 10) Fix the mobile `#` once in the mobile i18n layer: a converter rewrites ICU plural strings into i18next `_one` / `_other` keys at load. Alternatives: add the `i18next-icu` plugin (reparses every mobile string, breaks existing `_one` / `_other` keys, needs `Intl.PluralRules` on Hermes), or copy each key into the mobile catalog per language.
- **D2** (step 02, plan 10) Keep the mobile-only copies of the Removed Content and OPML rate-limit strings (`removed_content.*`, `features.opml.rate_limited_time_*`). Alternative: point those screens at the shared keys (`settings.advanced.clips`, `settings.opml.import_rate_limited_time`) and delete the mobile copies, which touches four language files and two callers.
- **D3** (step 03, plan 21) Leave phone-level push grouping alone. Alternative: set a per-notification iOS thread id or Android group key so the phone does not stack the app's notifications.
- **D4** (step 03, plan 20) A visit ends when the listener leaves the inbox; opening a row and coming back counts as a new open with no dots (matches web today). Alternative: keep the dots across an open-and-return.
- **D5** (step 03, plan 20) Rows first loaded from a later page after the inbox opened (web page 2 onward, mobile scroll-to-load) show no dot, because they were already marked seen. Alternative: have the list API return a per-row read time so those rows can show their state from when the inbox opened.
- **D6** (step 03, plan 21) Add a guidance rule, `.cursor/rules/notifications-inbox-flat-list.mdc`, recording that the inbox is a flat list with no groups and stating the seen rule. Alternative: remove the leftover catalog keys only, with no rule.
- **D7** (step 04, plan 30) Write a test-only plan for R10–R13, since every direct-open path already marks only that notification. Alternative: record the rows as answered by the audit and run nothing.
- **D8** (step 04, plan 30) A push tapped in Offline Mode still does not mark; the row stays unseen until the next inbox open. Alternative: queue the mark and send it once Offline Mode is off.
- **D9** (step 04, plan 30) Tapping an inbox row sends no mark of its own; rows rely on the mark-all when the inbox opens. Alternative: also mark that row by id on tap, which covers a failed mark-all.

## Open before the implementation run

Step 05 made these choices after the review step, so the operator has not answered them. The plans carry the choice as written; edit plan 11 before the run to change one.

- **D10** (step 05, plan 11) Mobile bundles `@formatjs/intl-pluralrules` and `@formatjs/intl-relativetimeformat` with data for the four app languages, and no `Intl.Locale` polyfill (about 230 KB of raw JS). Hermes in this Expo SDK has neither API, so without a polyfill the inbox row and banner would throw. Side effect: mobile plural strings follow each language's own rules (French "0" takes the singular). Alternative: also add `@formatjs/intl-locale` (about 350 KB more).
- **D11** (step 05, plan 11) Delete the nine `notifications_page.relative_time_*` consumer keys, since nothing reads them after the change. Alternative: keep them unused.
- **D12** (step 05, plan 11) Mobile formats the time line in the app's language (`i18n.language`); web keeps the browser default locale, so web's output does not change. Alternative: web passes its next-intl locale, which changes web's output for listeners whose browser and app languages differ.
