# 10 — User Communication

## Goal

Tell v4 users what is coming, what to expect during the grace period, and when
the old app will stop working — without shipping a new v4 mobile binary.

## Status

Draft. Needs operator review.

## What we know

- Free-text in-app announcement is **not** available from the current v4 meta
  API ([02](02-capabilities-and-limits.md)).
- Available levers: mass email, FCM push, store listing text, v4 web banner
  (needs web deploy), and at the end `MINIMUM_MOBILE_VERSION` (blocking overlay
  with hardcoded "update" copy).
- Maintenance overlays are the wrong tone for migration news.

## Proposed approach

### Timeline of messages

| Phase | Channel | Intent |
| ----- | ------- | ------ |
| Before store submit | Email + optional push; Play/App Store "what's new" draft | Heads-up: new app coming; same login; grace period |
| Store live (grace start) | Email + push + listing | Update when ready; data migrates on login; keep using v4 until you switch |
| Mid grace | Reminder email to not-yet-migrated (if measurable) | Nudge |
| Grace end approaching | Email + push + web banner | Deadline date; after this v4 stops |
| Grace end | Raise `MINIMUM_MOBILE_VERSION` | Force update path to the v5 build on the same listing |

### Content principles

- Same email and password.
- What migrates vs best-effort (signed-out local data, downloads, clips).
- Beta testers: installing beta replaces v4 on that device.
- Support contact and FAQ link on v5 web.
- No secrets, no raw account dumps in any tooling that builds the list.

### Email list

Source of truth: distinct emails from v4 `users` (verified filter TBD). Export
stays outside the repo. Respect unsubscribe / legal requirements for the chosen
provider.

## Honest limits and risks

- Users without email, with bouncing addresses, or with notifications disabled
  will only see the store listing or the final force-update screen.
- Hardcoded overlay copy cannot explain "migration in progress" nuance.
- Sending too early (before the v5 build is actually available) creates support
  load.

## Open questions

- Email provider and from-address?
- Include unverified emails?
- Exact grace-period length and whether to announce a fixed end date up front
  or only after store approval?
- Localize emails (en-US only for v1)?

## Future plan sets

- Copy deck (email / push / listing / FAQ).
- Operator runbook for list export and send (PII outside git).
- Metrics: migrated vs contacted vs remaining.
