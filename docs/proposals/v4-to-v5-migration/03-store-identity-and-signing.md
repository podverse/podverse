# 03 — Store Identity and Signing

## Goal

Ship v5 production as an **in-place upgrade** of the existing store listings so
users update instead of installing a second app, and so on-device v4 data remains
readable.

## Status

Draft. Needs operator review. Decision to use v4 store ids is **made**.

## What we know

### v4 production identities

| Platform | Id |
| -------- | -- |
| iOS      | `com.podverse.fm` (notification extension `com.podverse.fm.ImageNotification`) |
| Android Play | `com.podverse` |
| F-Droid  | `com.podverse.fdroid` (separate; see [14](14-fdroid.md)) |
| Version  | App `4.16.4`; Android `versionCode` **5280** |

Sources: `podverse-rn` Xcode project and `android/app/build.gradle`.

### v5 today (isolation)

NextGen mobile currently uses **`com.podverse.app.next`** so alpha and store
experiments cannot overwrite the production listing. That isolation must end for
production cutover. See
[APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md) and
[mobile-deep-links-and-prod-cutover](/.cursor/rules/mobile-deep-links-and-prod-cutover.mdc).

### What "same app" requires

- **iOS:** same bundle id, same App Store Connect app record, same signing team.
- **Android:** same `applicationId`, same Play App Signing key.
- **Version:** Android `versionCode` must be greater than 5280. iOS build number
  must increase.
- **Deep links:** keep `podverse://` and `podverse.fm` AASA / assetlinks. During
  transition, list both `com.podverse.fm` / `com.podverse` and
  `com.podverse.app.next` where needed so beta and prod both verify.
- **Push:** decide whether v5 reuses the v4 Firebase / APNs project so existing
  device tokens remain useful for migration notices.

## Proposed approach

1. Keep alpha on `com.podverse.app.next`.
2. Ship **beta** and **production** under the v4 ids via TestFlight and Play
   internal / staged rollout, using EAS credentials that match the v4 signing
   material (credentials stay on EAS; nothing private in git).
3. Treat the first production upload as a full app replacement: phased rollout,
   crash monitors, and a rollback story (previous store build).
4. Plan first-launch local migration ([08](08-mobile-first-launch-migration.md))
   as part of the same identity decision — without matching ids it is impossible.

## Honest limits and risks

- Losing or rotating the Play App Signing key breaks in-place upgrades forever.
- A mistaken upload of the wrong binary to the v4 listing is high impact. Guard
  with separate EAS profiles and operator checklists.
- Installing a beta under the prod id **replaces** the user's v4 install on that
  device. Beta testers must accept that ([09](09-beta-environment.md)).
- Notification extension and any associated capabilities must stay aligned with
  the iOS bundle id.
- Store review timing is outside our control. Grace period planning must assume
  uncertainty ([12](12-production-launch-and-grace-period.md)).

## Open questions

- Confirm Apple Team ID and App Store Connect app id for `com.podverse.fm`.
- Confirm Play Console app and whether Play App Signing is already enrolled.
- Reuse v4 Firebase project for push, or migrate tokens later?
- Exact first production `versionName` / `versionCode` policy relative to 4.16.4
  / 5280.

## Future plan sets

- EAS profile and credentials inventory (operator-only secrets).
- Store submission checklist tied to [12](12-production-launch-and-grace-period.md).

In-place ids are recorded in
[mobile-deep-links-and-prod-cutover](/.cursor/rules/mobile-deep-links-and-prod-cutover.mdc).
