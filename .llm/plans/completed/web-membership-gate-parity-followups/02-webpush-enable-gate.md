# 02 — Gate web-push enable (member-only device register) on web

## Problem

`reqAccountWebPushDeviceCreate` is member-gated (`skipMembershipStatus: false`,
`apps/api/src/controllers/account/accountWebPushDevice.ts`). It is called inside the shared lib, which
**swallows** the error:

```56:78:apps/web/src/lib/notifications/webpush/requestNotificationPermission.ts
    // Send subscription to the server
    try {
      await apiRequestService.reqAccountWebPushDeviceCreate({ endpoint, p256dh, auth });
    } catch {
      // If create fails, try update (device might already exist)
      await apiRequestService.reqAccountWebPushDeviceUpdate({ endpoint, p256dh, auth });
    }
    return true;
  } catch (error) {
    alert('Error requesting notification permission. See console for details.');
    console.error('Error Requesting Notification Permission:', error);
    return false;
  }
```

For an expired member: create → 403, fallback update → 403, outer `catch` → generic `alert()`. So
`SettingsNotifications.enableWebPush` (and `NotificationIconButton.toggleNotification`, whose Step 8
gate can't observe the swallowed error) never show the membership modal.

## Approach

Do not gate inside the lib (it's a shared, framework-light helper and uses `alert`). Instead, make the
membership 403 **observable** to callers, then let the existing `useMembershipGate` handle it.

1. In `requestNotificationPermission.ts`: when the device-register error is a membership 403
   (detect via shared `parseMembershipGateError` from `@podverse/helpers-requests`), **rethrow** it
   instead of `alert()`-ing (or return a discriminated failure the caller can inspect). Keep the
   generic `alert()` only for non-membership errors, or move that decision to the caller.
2. In `SettingsNotifications.enableWebPush`: wrap the `requestNotificationPermission()` call and, on a
   membership 403, call `tryHandleMembershipGateError(error)` (already imported for `enableUP`/
   `toggleDefaultType`) before any generic handling.
3. `NotificationIconButton.toggleNotification` already has the gate in its `catch`; once the lib
   rethrows membership 403s, that path is covered too — verify no double `alert()`.

Keep the logged-out guard (`login_to_enable_notifications`) unchanged.

## Tests

- Add an expired-member web-push-enable case (unit for the lib rethrow decision is cheapest; or an E2E
  step mocking the webpush device-create 403) asserting the membership modal appears, not the `alert()`.

## Done when

- Enabling web push (Settings and per-channel bell) as a logged-in expired member shows the membership
  modal + Renew; non-membership failures keep their existing `alert()`/warn behavior.
