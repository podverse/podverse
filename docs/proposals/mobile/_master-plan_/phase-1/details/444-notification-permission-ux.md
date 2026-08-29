# 444-notification-permission-ux

**Master step:** 14.5
**Model (author + implement):** Auto
**Status:** done

## Scope

- Request notification permission **contextually after a user action** (e.g. enabling notifications
  for a podcast or toggling notifications in Settings), not on cold start.
- Android 13+ `POST_NOTIFICATIONS` runtime request (declared in manifest, never requested today);
  iOS provisional/explicit prompt.
- Graceful denied state with an "open OS settings" affordance; copy from i18n.

## Acceptance criteria

- Permission is requested only after an explicit user action.
- Denied path shows a non-blocking explanation + open-settings link (no repeated nagging).
- Registration (14.2) proceeds only after permission is granted.

## Web parity references

- i18n: `settings.notifications.*` (consumer), `authentication.login_to_enable_notifications`;
  add mobile-overlay keys for OS permission rationale / open-settings if missing
  (`packages/i18n-catalog/mobile/originals/en-US.json`).
- Push module from 440.

## Verification

```bash
grep -rq "requestPermission\|POST_NOTIFICATIONS\|openSettings" apps/mobile/src
```
