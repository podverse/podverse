# 02 — Capabilities and Limits

## Goal

State honestly what the migration can achieve without a new v4 mobile release,
what needs a v4 API deploy or env change, and what is lost or best-effort.

## Status

Draft. Needs operator review.

## What we know

### v4 mobile without a new release

| Lever | How it works | Message control |
| ----- | ------------ | --------------- |
| Min version | `GET /api/v1/meta/app-info` → `MINIMUM_MOBILE_VERSION` | Blocking overlay; **hardcoded English** copy; button opens the store |
| Scheduled maintenance | Same endpoint + `MAINTENANCE_MODE_SCHEDULED_*` | Overlay with i18n maintenance strings and server times |
| Live maintenance | `MAINTENANCE_MODE_ENABLED` → API 503 | Offline-style UX; not an announcement channel |
| Free-text announcement | None | There is no DB- or env-driven banner body |

Sources: `podverse-api@develop` `src/routes/meta.ts`; `podverse-rn` `src/services/meta.ts`,
`UpdateRequiredOverlay`, `MaintenanceScheduledOverlay`.

### Other channels (no v4 app release)

- Mass email to accounts on record.
- FCM push (v4 Firebase project / key already used in prod ops).
- Google Play / App Store listing text (editable anytime).
- Banner or page on v4 web (needs a v4 web deploy).

### Data and auth carryover

| Item | Outlook |
| ---- | ------- |
| Password hashes | Likely portable: v4 `bcryptjs` 10 rounds; v5 `bcrypt` 10 rounds |
| v4 JWT sessions | Do not work against v5. Optional spike: exchange using the v4 JWT secret |
| Logged-in server data | Migratable from the live v4 DB on login or in batch |
| Signed-out local data | Only if v5 uses the same store ids (decided: yes) |
| Downloaded files | Best-effort if paths remain readable under the same app id |
| Membership expiry | Existing worker path after accounts exist; see billing ops |
| Store / PayPal purchase rows | Need a separate design; not covered by the expiry CSV import |
| Clips on deleted/missing episodes | May be unrecoverable |

## Proposed approach

1. Treat **no v4 app release** as a hard constraint.
2. Prefer **env-only** and **v5-only** work. Allow a v4 API deploy when it is
   clearly cheaper than a worse user experience (for example a migrated flag or
   a tiny meta field). Document each such deploy in the step that needs it.
3. Use email + push + store listing for "what to expect." Reserve
   `MINIMUM_MOBILE_VERSION` for the end of the grace period, when the overlay's
   "Update Now" button should open the v5 build on the same listing.
4. Do **not** use the maintenance overlay as a migration announcement. Its copy
   is maintenance-shaped and would confuse users.

## Honest limits and risks

- Users who never open the app and ignore email will only learn at force-upgrade
  time.
- Unverified or free-tier accounts without email are hard to reach except via
  push (if a device token exists) or the store listing.
- Password portability should be proven in rehearsal before promising "same
  password."
- A v4 JWT exchange is optional convenience. Re-login with the same password is
  the safe default.

## Open questions

- Is a password re-login acceptable for all users, or do we spike JWT exchange?
- Are FCM device tokens still fresh enough for a mass push?
- Accept that free-text in-app copy requires either a v4 release (rejected) or
  out-of-band channels?

## Future plan sets

- Spike: verify a sample of v4 password hashes against v5 `bcrypt.compare`.
- Spike (optional): v4 Bearer → v5 session exchange.
- Communication copy drafts ([10](10-user-communication.md)).
