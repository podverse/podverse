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
| v4 JWT sessions | Do not work against v5. People sign in with the copied password. No session exchange |
| Logged-in server data | One v4 account at v5 sign-in. Bulk copy only at grace end, outside the v4 app |
| Signed-out local data | Only if v5 uses the same store ids (decided: yes) |
| Downloaded files | Best-effort if paths remain readable under the same app id |
| Membership expiry | Existing worker path after accounts exist; see billing ops |
| Store / PayPal purchase rows | Need a separate design; not covered by the expiry CSV import |
| Clips on deleted/missing episodes | May be unrecoverable |

## Proposed approach

1. Treat **no v4 app release** as a hard constraint.
2. Prefer **env-only** and **v5-only** work. One v4 API deploy is part of the
   migration: after an account is copied, the v4 API rejects that account. The
   legacy client may not show why. Support handles those contacts.
3. Once v5 is live in at least one place, turn off the v4 subscription
   products in Apple, Google Play, and PayPal so a new v4 purchase fails.
4. Use email and the store listing for "what to expect." There is no public
   migration page and no mass notification. A longer reply is sent only when
   someone contacts us. Reserve the v4
   `MINIMUM_MOBILE_VERSION` for the real grace end. The number is the first
   live NextGen store version, and it stays unset until that build exists.
   NextGen has no app-wide minimum-version check yet. Add one before go-live
   ([13](13-forced-migration-and-v4-shutdown.md)). The existing per-channel
   purchase floor stays blank at go-live and only hides plans before a charge.
5. Do **not** use the maintenance overlay as a migration announcement. Its copy
   is maintenance-shaped and would confuse users.

## Honest limits and risks

- Users who never open the app and ignore email will only learn at force-upgrade
  time.
- Unverified or free-tier accounts without email are hard to reach except via
  the store listing.
- Password portability should be proven in rehearsal before promising "same
  password."
- A logged-in v4 session does not become a NextGen session. The person signs
  in with the same email and password.

## Future plan sets

- Spike: verify a sample of v4 password hashes against v5 `bcrypt.compare`.
- Communication copy drafts ([10](10-user-communication.md)).
