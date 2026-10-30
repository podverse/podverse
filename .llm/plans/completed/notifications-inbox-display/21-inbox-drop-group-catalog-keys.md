**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# Drop the Unread / Earlier group keys and record the flat-list rule

## Rows

R4, R5, R15

## Runs after

20

## Findings (answer to R4)

Neither inbox groups rows today. Grouping did exist until recently, and either of two things
explains what the operator saw:

1. **The inbox's own Unread / Earlier sections.** Commit `4035d63ac` ("Add developer documentation
   and update package dependencies", Oct 27, 2026) removed them from both inboxes. On mobile that
   was `sectionHeader` with `notifications.section.unread` and a `showEarlierHeading` row prop with
   `notifications.section.earlier`. On web it was `partitionedRows` with `<h2>` headings from
   `notifications_page.unread_section` / `earlier_section`. A build or dev client from before that
   commit still shows the groups. This branch contains the commit.
2. **The phone's own notification grouping**, outside the inbox. The FCM payload built in
   `packages/notifications/src/services/notifications/notificationOrchestrator.ts` sets no iOS
   thread id and no Android group key, and `apps/mobile/src/push/fcmTransport.ts` registers one
   `default` Android channel. iOS Notification Center stacks an app's notifications by default,
   and Android bundles four or more notifications from one app. That grouping belongs to the
   operating system and the listener's settings. This set does not change it.

What the removal left behind:

| Layer | Key | Used by |
| --- | --- | --- |
| mobile | `notifications.section.unread` | `InboxNotificationRow` accessibility label prefix |
| mobile | `notifications.section.earlier` | nothing |
| consumer | `notifications_page.unread_section` | web `NotificationRow` visually hidden Unread string |
| consumer | `notifications_page.earlier_section` | nothing |

The `section` names describe groups that no longer exist. They invite the next change to put a
heading back. Both surfaces already load the consumer layer, so one consumer key serves both.

## Change

### 1. One consumer key for the row's Unread string

In `packages/i18n-catalog/consumer/originals/{en-US,es,fr,el-GR}.json`, under `notifications_page`
(search `"unread_section"`; it is near line 1666 in each file):

- Rename `unread_section` to `unread`, keeping each locale's current value (`Unread`, `Sin leer`,
  `Non lues`, `Μη αναγνωσμένες`).
- Delete `earlier_section`.

Edit with StrReplace on those two lines only (**large-file-reading**). Area A may edit other keys
in the same files. Do not touch keys outside `notifications_page.unread_section` /
`earlier_section`.

### 2. Remove the mobile `notifications` block

In `packages/i18n-catalog/mobile/originals/{en-US,es,fr,el-GR}.json`, the top-level
`"notifications"` object (line 91 in each file) holds only `section.earlier` and `section.unread`.
Delete the whole `"notifications": { ... },` block (lines 91–96), so the `"features"` block's
closing `},` is followed directly by `"settings": {`.

### 3. Call sites

- `apps/web/src/app/notifications/NotificationsPageClient.tsx`, `NotificationRow`:
  `tNotifications('unread_section')` becomes `tNotifications('unread')`.
- `apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx`, `InboxNotificationRow`:
  `t('notifications.section.unread')` becomes `t('notifications_page.unread')`.

The string a reader hears is unchanged in every locale.

### 4. Compile

From the repo root run `npm run i18n:compile`. It rewrites `*/overrides/{es,fr,el-GR}.json` to
match the originals, which drops the removed keys and adds an empty `notifications_page.unread`
slot. Do not edit `overrides/` by hand (**i18n-management**). Before compiling, confirm that the
override values being dropped (`notifications.section.*` in `mobile/overrides`,
`notifications_page.unread_section` / `earlier_section` in `consumer/overrides`) are empty strings.
If any one is non-empty, stop and report it: an override is operator-owned, and a rename would
discard it.

### 5. Guidance rule (new)

Create `.cursor/rules/notifications-inbox-flat-list.mdc`, so the "no groups" constraint lives in
a rule rather than a code comment (**comments-future-forward**):

```markdown
---
description: The notifications inbox is one flat, newest-first list with a per-row unseen dot, with no Unread or Earlier groups, on web and mobile
globs:
  - "apps/web/src/app/notifications/**"
  - "apps/mobile/src/screens/notifications/**"
  - "apps/mobile/src/notifications/**"
alwaysApply: false
---

# The notifications inbox is one flat list

Web (`NotificationsPageClient`) and mobile (`NotificationsInboxScreen`) show notifications as one
list, newest first. Each row has an unseen indicator slot. The slot shows a dot while the row is
unseen and stays empty, keeping the text aligned, once it has been seen.

## Do not

- Add Unread / Earlier headings, sections, or any other grouping of rows.
- Add catalog keys for inbox groups.
- Move a row when it is marked seen.

## Seen rule (same on both surfaces)

- Opening the inbox marks every notification seen. Rows that were unseen at any point during that
  visit keep their dot until the visit ends, including across a reload
  (`applyNotificationVisitUnread` in `@podverse/helpers`). The next open shows no dot on them.
- Opening one notification directly (a push tap, a banner tap) marks only that notification seen.

The screen-reader Unread string on a row is `notifications_page.unread`.
```

## Files

packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
packages/i18n-catalog/consumer/overrides/es.json
packages/i18n-catalog/consumer/overrides/fr.json
packages/i18n-catalog/consumer/overrides/el-GR.json
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
packages/i18n-catalog/mobile/overrides/es.json
packages/i18n-catalog/mobile/overrides/fr.json
packages/i18n-catalog/mobile/overrides/el-GR.json
apps/web/src/app/notifications/NotificationsPageClient.tsx
apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx
.cursor/rules/notifications-inbox-flat-list.mdc

The `overrides/` files change only through `npm run i18n:compile`.

## Tests

No new tests. `apps/web/e2e/notifications-inbox.spec.ts` already asserts that no `Unread` or
`Earlier` level-2 heading renders, and plan 20 adds the dot assertions. Catalog shape is held by
`npm run i18n:validate`. `apps/mobile/e2e/notifications-inbox.yaml` is the mobile regression run.

## Release scratchpad

none
