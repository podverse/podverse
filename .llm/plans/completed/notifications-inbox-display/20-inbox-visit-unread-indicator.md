**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Inbox rows keep their unseen dot for the whole visit (web and mobile)

## Rows

R1, R2, R6, R7, R8, R9, R14, R16

## Runs after

none

## Findings (answers to R1, R2, R6–R9, R14, R16)

Both inboxes are already one flat, newest-first list with a per-row indicator:

- **Mobile** `apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx`: `FillList` over
  `notifications`. `InboxNotificationRow` draws `styles.unreadDot` inside `styles.unreadSlot` when
  `item.is_unread`, and prefixes the accessibility label with the Unread string. A read row keeps
  the empty slot, so text stays aligned. Relative time shows a raw `#` (area A, R3, not this plan).
- **Web** `apps/web/src/app/notifications/NotificationsPageClient.tsx`: `state.items.map` inside
  `Pagination`. `NotificationRow` draws `.unreadDot` (`data-unread="true"`) plus a visually hidden
  Unread string when `row.is_unread`. Relative time uses `Intl.RelativeTimeFormat` and has no `#`.

Read state on the server (`packages/orm/src/services/account/accountNotification.ts`,
`AccountNotificationController.markRead`): a row is unread when it was created after the
account's `notifications_last_read_at` cutoff and has no `read_at`. Opening the inbox calls Mark
All as Read, which moves the cutoff to now. From then on, **every list response reports every
existing row read**.

So the dot already shows on first open and is gone on the next open (R9, and the second half of
R14). What breaks the first half of R14 ("those rows keep their unseen indicator for that visit")
is any reload during the visit, because the reload replaces rows with server rows that are now
read:

| Surface | Reload during the visit that clears the dots |
| --- | --- |
| Mobile | `resync` stream event (published on the session's first stream open and on replay limit), the load focus effect re-running when `requestContext` changes (token refresh) or Offline Mode flips, the inbox Retry |
| Web | `notification.resync` stream event on page 1; paging to page 2 and back to page 1 |

One more mobile defect against R14: the live `created` handler writes the arriving row into the
session inbox cache with `is_unread: true`. The screen marks it read by id on the next line, but
the next open seeds its first paint from the cache (`useState(() => getNotificationsInboxCache()
?.items ?? [])`) and shows a dot on that row until the server answers.

## Change

A per-visit set of notification ids that were unread at any point during the visit. Every list
response and every live row adds its unread ids to the set. Rows whose id is in the set are shown
unread. The set is emptied when a new visit starts. The server state and the mobile session cache
are not changed by the overlay; the cache keeps server truth.

The rule lives once in `@podverse/helpers` and both inboxes call it (**reuse-beyond-components**).

### 1. Shared helper (new)

`packages/helpers/src/lib/accountNotificationVisitUnread.ts`:

```typescript
import type { DTOAccountNotification } from '../dtos/account/accountNotification.js';

export type NotificationVisitUnreadResult = {
  rows: DTOAccountNotification[];
  visitUnreadIds: ReadonlySet<number>;
};

/**
 * Opening the inbox marks every notification seen on the server, so a reload during the same
 * visit reports those rows read. An inbox visit keeps the unseen indicator on every row that was
 * unseen at any point in the visit. Records the ids `rows` reports unread, then returns `rows`
 * with every recorded id unread. Returns the same set and the same array when nothing changes.
 */
export function applyNotificationVisitUnread(
  visitUnreadIds: ReadonlySet<number>,
  rows: DTOAccountNotification[]
): NotificationVisitUnreadResult {
  let nextIds: Set<number> | null = null;
  for (const row of rows) {
    if (row.is_unread && !visitUnreadIds.has(row.id)) {
      if (nextIds === null) {
        nextIds = new Set(visitUnreadIds);
      }
      nextIds.add(row.id);
    }
  }
  const ids: ReadonlySet<number> = nextIds ?? visitUnreadIds;

  let changed = false;
  const nextRows = rows.map((row) => {
    if (row.is_unread || !ids.has(row.id)) {
      return row;
    }
    changed = true;
    return { ...row, is_unread: true };
  });

  return { rows: changed ? nextRows : rows, visitUnreadIds: ids };
}
```

Export it from `packages/helpers/src/index.ts`: add
`export * from './lib/accountNotificationVisitUnread.js';` directly after the
`./lib/accountNotificationType.js` line.

### 2. Web — `apps/web/src/app/notifications/NotificationsPageClient.tsx`

- Import `applyNotificationVisitUnread` in the existing value import from `@podverse/helpers`.
- Add `const visitUnreadIdsRef = useRef<ReadonlySet<number>>(new Set<number>());` beside the other
  refs (after `isPageActiveRef`).
- `loadPage`: after the stale check, run
  `const visit = applyNotificationVisitUnread(visitUnreadIdsRef.current, data.items);`, assign
  `visitUnreadIdsRef.current = visit.visitUnreadIds;`, and pass `items: visit.rows` to `setState`.
  This covers the first load, resync, and every page change.
- The `useEffect` that defines `loadFirstPageAndMarkRead`: set
  `visitUnreadIdsRef.current = new Set<number>();` as its first statement (after
  `isPageActiveRef.current = true;`), so a remount starts a new visit.
- Stream `created` handler: before updating `liveRowsRef`, run the helper on `[row]` and assign
  `visitUnreadIdsRef.current = visit.visitUnreadIds;`. Keep inserting `row` itself (the stream
  sends it unread). `mergeLiveRows` needs no change.
- `NotificationRow` is unchanged.

A web visit is one mount of the page. Following a row's link and coming back remounts it, which is
a new open.

### 3. Mobile — `apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx`

- Import `applyNotificationVisitUnread` in the existing value import from `@podverse/helpers`
  (the line that already imports `accountNotificationImageUrl`).
- Add `const visitUnreadIdsRef = useRef<ReadonlySet<number>>(new Set<number>());` beside
  `inboxGenerationRef`.
- `loadPage`:
  - Offline branch: when `cached !== null`, pass the helper's `rows` for `cached.items` to
    `setNotifications` and assign the returned set to the ref.
  - Online branch: right after `notificationsRepository.list` returns and the append generation
    check passes, run the helper on `nextData.items`, assign the set, and use `visit.rows` in both
    arms of the `setNotifications` updater (`replace` uses `visit.rows`; `append` uses
    `appendUniqueBy(previous, visit.rows, inboxRowKeyExtractor)`). Both
    `setNotificationsInboxCache` calls keep `nextData.items` (server truth).
- `loadFirstPageAndMarkRead`:
  - Offline branch: same as `loadPage`'s offline branch.
  - Online branch: keep `const items = withHeld(nextData.items);`. Run the helper on `items`,
    assign the set, and call `setNotifications(visit.rows)`. The cache write keeps using `items`
    and its existing `marked` flip to `is_unread: false`.
- Live `created` handler: run the helper on `[notification]` and assign the set before
  `setNotifications`. Keep `prependLiveNotification(items, notification)` for state. Change the
  cache write to `prependLiveNotification(cached.items, { ...notification, is_unread: false })`,
  because the handler marks that row read by id on the next line. Held rows
  (`liveRowsDuringLoadRef`) keep the original `notification`.
- Visit boundary: move the `useFocusEffect` block that calls `markNotificationsInboxFocused` and
  `subscribeNotificationStreamEvents` (deps `[]`) so it is declared **before** the
  `useFocusEffect` that calls `loadFirstPageAndMarkRead`. Declare both after the
  `loadFirstPageAndMarkReadRef.current = loadFirstPageAndMarkRead;` line. In the moved block, set
  `visitUnreadIdsRef.current = new Set<number>();` as the first statement of the callback and
  again in its cleanup, after `releaseInboxFocus()`. Do not reset the set in the load focus
  effect: that effect also re-runs mid-visit when `requestContext` or `offlineModeEnabled`
  changes, and those reloads must keep the dots.
- `handleRetryInbox` and the `resync` handler stay as they are. They are the same visit.

A mobile visit runs from focus to blur of `NotificationsInbox`. Opening a row (which leaves the
inbox through `openAccountNotificationLink`) and coming back is a new open, the same as web.

### What stays the same

- Mark All as Read on open, the badge reset, and mark-one for live rows, on both surfaces.
- `InboxNotificationRow` and `NotificationRow` markup, styles, `testID`s, and accessibility labels.
- Rows first loaded on a later page after the open (web page 2 and on, mobile scroll-to-load)
  show the server's state. Mark All as Read already covered them, so they arrive read and show
  no dot. Rebuilding their open-time state would need per-row `read_at` in the list response; this
  plan does not change the API.

## Files

packages/helpers/src/lib/accountNotificationVisitUnread.ts
packages/helpers/src/lib/accountNotificationVisitUnread.test.ts
packages/helpers/src/index.ts
apps/web/src/app/notifications/NotificationsPageClient.tsx
apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx
apps/web/e2e/notifications-inbox.spec.ts
release-notes/scratchpad.md

## Tests

**Unit (helpers, Vitest)** — new `packages/helpers/src/lib/accountNotificationVisitUnread.test.ts`.
Build rows the way `apps/mobile/src/notifications/notificationsInboxCache.test.ts` does
(`NotificationCategoryEnum.NewContent`). Four cases:

1. Unread rows are recorded. When every recorded row already reads unread, the same `rows` array is
   returned.
2. A row the server now reports read stays unread when its id was recorded earlier in the visit.
   Rows whose ids were never recorded come back as the same objects.
3. When `rows` has no new unread id, the same set is returned.
4. An empty set and all-read rows return both inputs unchanged.

**Playwright** — `apps/web/e2e/notifications-inbox.spec.ts` (**e2e-readability**,
**e2e-screenshot-verified-element**):

- First test (`shows bell badge and clears after opening notifications page`): the list mock
  returns two rows. The first is `{ ...mockNotification, is_unread: unreadCount > 0 }`, which is
  unread until the mark-read mock runs. The second is an already seen row:
  `{ ...mockNotification, id: 903, title: 'Clips load faster', created_at:
  '2026-08-22T10:00:00.000Z' }`. Assert that the seen row's link
  (`System update: Clips load faster – Large playlists now load without paging.`) has no
  `[data-unread="true"]`. After the existing capture, add an `actionAndCapture` step:
  "When the listener opens the inbox again, the notification they already saw has no unread
  indicator." It runs `page.goto(ROUTES.NOTIFICATIONS)`, then expects `rowHeading` visible and
  `page.locator('[data-unread="true"]')` to have count 0, and captures `rowHeading`.
- New test in `Live notification stream`: "When the stream resyncs while the inbox is open, a
  notification that was unread keeps its indicator." Count list requests. The first list response
  is `{ ...mockNotification, is_unread: true }` and later ones are `mockNotification`
  (`is_unread: false`). Mock `mark-read` and `mockUnreadCount(page, 0)`. Stream bodies:
  `notificationStateBody(1, 100)`, then a gated body
  `'retry: 600000\n\n' + sseEvent('notification.resync', { reason: 'replay_limit' })`. Open
  `ROUTES.NOTIFICATIONS` and expect the row's dot visible. In `actionAndCapture`: `gate.open()`,
  `await expect.poll(() => listRequests).toBe(2)`, and expect the row's `[data-unread="true"]`
  still visible. Capture the row.

**Maestro** — `apps/mobile/e2e/notifications-inbox.yaml` is unchanged and is the mobile regression
run. The mobile E2E seed has no notifications for the seeded user, so the dot rule is held by the
helper unit test (**mobile-test-economics**).

## Release scratchpad

```markdown
## Inbox rows keep their unseen dot for the whole visit

- Surfaces: web, mobile
- Change: Opening the notifications inbox still marks every notification seen, and the next open
  shows no dot on them. During the visit itself, rows that were unseen when it started, or that
  arrived while it was open, now keep their dot even when the list reloads (a stream resync, a
  token refresh, Retry, an Offline Mode switch on mobile, or paging back to page 1 on web). On
  mobile, a notification that arrives while the inbox is open is no longer cached as unseen, so
  the next open does not flash a dot on it before the list loads.
- Who notices: signed-in members who use the inbox
- Operator steps: none
```
