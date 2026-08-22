# web-membership-gate-parity-followups — SUMMARY

Follow-ups discovered while reviewing **Step 8** of `mobile-membership-and-v4v` (web membership-gating
parity, Track 19.4). Step 8 centralized the membership-403 → modal via `useMembershipGate`
(`apps/web/src/hooks/useMembershipGate.ts`) and wired most member-only actions. Two member-gated
action families were **not** covered and still show a generic error/toast/alert to a logged-in
**expired** member instead of the membership modal. Mobile (plan 03) gates both, so web is not at
full parity yet.

## Source of truth for "member-only"

The API guard is `ensureAuthenticated(..., { skipMembershipStatus, requiredCapability })` in
[`apps/api/src/lib/auth/index.ts`](/apps/api/src/lib/auth/index.ts). A route is **member-only** when
`skipMembershipStatus: false` (returns 403 `membership_expired`, or `feature_not_available_for_account_type`
when a `requiredCapability` fails). Confirmed member-gated writes still ungated on web:

- **Queue add-item** — `reqQueueResource{Item,Clip,ItemSoundbite,ItemAddByRSS}Add{Next,Last,Between}`
  are `skipMembershipStatus: false` (see `apps/api/src/controllers/queue/queueResourceItem.ts` etc.).
  **Note:** queue **reorder** (`queueResource.ts`) is `skipMembershipStatus: true` — NOT gated — so the
  reorder gate added in Step 8 (`ListQueueResources.handleDragEnd`) is a harmless no-op; the real
  member-gated queue action (add-to-queue from rows) is unwired.
- **Web push device register** — `reqAccountWebPushDeviceCreate` is `skipMembershipStatus: false`
  (`apps/api/src/controllers/account/accountWebPushDevice.ts`), but the 403 is **swallowed** inside
  `apps/web/src/lib/notifications/webpush/requestNotificationPermission.ts` (create→update fallback,
  then a generic `alert()` in its own `catch`). So `SettingsNotifications.enableWebPush` (and even
  `NotificationIconButton`, whose gate can't see the swallowed error) never shows the membership modal
  for the webpush-register path.

## Not gaps (intentional / already correct)

- **Stats tracking** (`statsTrackEvent*`, `requiredCapability: trackStats`, `false`) — background
  analytics on playback; must **not** pop a modal. Leave ungated.
- **Playlist delete / UP disable / webpush disable / OPML / queue reorder** — `skipMembershipStatus: true`
  (not member-gated). Step 8's defensive gates on delete paths are harmless no-ops.
- Everything Step 8 already wired (subscribe/follow, notifications toggle, playlist create/edit + add-to,
  add-by-RSS add, clip create/edit/delete, PI directory add) is correct.

## Commit guidance

Step 8 is safe to commit as-is (no regressions). These two follow-ups complete web↔mobile parity and
can land in a separate change.
