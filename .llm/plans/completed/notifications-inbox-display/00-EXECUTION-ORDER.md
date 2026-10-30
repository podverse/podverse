# Notifications inbox display — execution order

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Request and settled review answers:
[00-REQUEST.md](00-REQUEST.md). Ledger, decisions, and open choices: [00-SUMMARY.md](00-SUMMARY.md).

Four phases, one prompt each, run one after another. Every plan shares a file or an
`npm run i18n:compile` run with the plan before it, so no two prompts run at once. Each prompt
appends its own release scratchpad entry (plan 21 has none). Prompt 10 runs last and closes the set.

## Where it runs

The set runs in this worktree, `podverse_feature_notifications_inbox_display`, branch
`feature/notifications-inbox-display`. Final messages land in
`.artifacts/plan-runner/notifications-inbox-display/`.

## No prompt for the direct-open rows

R10–R13, R23, and R24 are answered by [00-DIRECT-OPEN-AUDIT.md](00-DIRECT-OPEN-AUDIT.md): every
direct-open path (push tap, banner tap, inbox row tap) already marks only that notification, and
the operator chose to add no test (D7). That record has no prompt. Plans 20 and 21 keep the two
behaviors it relies on: opening the inbox marks every row, and a row that arrives while the inbox
is open is marked on arrival.

## Dependency graph

From each plan's `## Runs after`:

| Plan | Runs after |
| --- | --- |
| 20 inbox rows keep their unseen dot for the whole visit | none |
| 21 drop the Unread / Earlier keys, add the flat-list rule | 20 |
| 11 time line uses `Intl.RelativeTimeFormat` on mobile, as on web | 20, 21 |
| 10 mobile renders the shared catalog's ICU plural strings; closes the set | 11, 21 |

## Shared files that set the order

- **`apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx` and
  `apps/web/src/app/notifications/NotificationsPageClient.tsx`:** 20, then 21, then 11. Plan 11
  anchors its edits by symbol (`InboxNotificationRow`, `NotificationRow`, `getRelativeTimeLabel`),
  because 20 and 21 move lines.
- **`packages/i18n-catalog/consumer/originals/*.json` and `consumer/overrides/*.json`:** 21 renames
  `notifications_page.unread_section` to `notifications_page.unread` and deletes `earlier_section`;
  11 deletes `notifications_page.relative_time_*`. Both run `npm run i18n:compile`, which rewrites
  every `overrides/*.json`.
- **`packages/i18n-catalog/mobile/originals/*.json` and `mobile/overrides/*.json`:** 21 deletes
  `notifications.section` (mobile reads `notifications_page.unread` instead); 10 deletes the
  `removed_content.clips_*` / `playlist_entries_*` copies and `features.opml`. Both run
  `npm run i18n:compile`.
- **`apps/mobile/vitest.config.ts`:** 11 adds `src/shims/intlPolyfills.test.ts`; 10 adds
  `src/i18n/icuPlurals.test.ts`.
- **`packages/helpers`:** 20 adds `accountNotificationVisitUnread.ts` and its export in
  `src/index.ts`; 11 adds `formatRelativeTimeLabel` to `src/lib/date.ts` (already exported).
- **`release-notes/scratchpad.md`:** 20, 11, and 10 each append one entry.

## Phases

### Phase 1 — unseen dot lasts the whole visit

- **20**, alone. Owns `packages/helpers/src/lib/accountNotificationVisitUnread.ts` and its test,
  `packages/helpers/src/index.ts`, both inbox screens, and `apps/web/e2e/notifications-inbox.spec.ts`.

### Phase 2 — no group keys, flat-list rule

- **21**, alone. Owns the consumer and mobile catalog originals (group keys only) and their
  compiled overrides, both inbox screens, and `.cursor/rules/notifications-inbox-flat-list.mdc`.

### Phase 3 — shared relative-time formatter and Hermes polyfill

- **11**, alone. Owns `packages/helpers/src/lib/date.ts` and its test, both inbox screens,
  `apps/mobile/src/notifications/accountNotificationLineLabels.ts`,
  `apps/mobile/src/notifications/BannerNotificationHost.tsx`, `apps/mobile/src/shims/intlPolyfills.ts`
  and its test, `apps/mobile/index.js`, `apps/mobile/package.json`, `apps/mobile/package-lock.json`,
  `apps/mobile/vitest.config.ts`, the consumer catalog originals (`relative_time_*` keys) and
  overrides, and `.cursor/rules/reuse-beyond-components.mdc`. Runs `npm run mobile:install`, which
  needs the network.

### Phase 4 — shared plural strings on mobile, then close the set

- **10**, alone. Owns `apps/mobile/src/i18n/` (`icuPlurals.ts` and its test, `i18nInitOptions.ts`,
  `index.ts`, `resources.ts`), `apps/mobile/src/screens/more/MoreRemovedContentScreen.tsx`,
  `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts`, `apps/mobile/vitest.config.ts`, and the
  mobile catalog originals and overrides. Archives the set and carries the cumulative verification.
