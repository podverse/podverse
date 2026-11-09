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
| iOS      | `com.podverse.fm` (notification extension `com.podverse.fm.ImageNotification`). App Store Connect Apple ID `1390888454`. SKU `podverse.fm`. Team `DF9KG8H54B`. |
| Android Play | `com.podverse`. Play App Signing is on. Google signs the releases people install. The whole install base uses that key. |
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
- **Push:** v5 reuses Firebase project `podverse-app`, the project v4
  production already uses. Do not create a second project. v4 tokens are
  not imported. The new app registers a token after the device prompt in
  [08](08-mobile-first-launch-migration.md). Adding v5 apps must leave the
  v4 apps alone:
  - Add iOS and Android apps for `com.podverse.app.next`. Do not edit,
    disable, or delete the existing apps for `com.podverse.fm` and
    `com.podverse`.
  - Download `GoogleService-Info.plist` and `google-services.json` only
    from the new app cards. One pair covers Next alpha, beta, and prod
    while those builds use `com.podverse.app.next`.
  - Do not rotate, replace, or delete the v4 Admin account
    `firebase-adminsdk-aqund`. Next alpha, beta, and prod send with a
    separate service account in this same project, `podverse-next-fcm`,
    project role Firebase Cloud Messaging API Admin
    (`roles/firebasecloudmessaging.admin`). The similarly named Firebase
    Cloud Messaging Admin role lacks `cloudmessaging.messages.create`.
    Do not send Next pushes with a key from `podcastdj-alpha` or
    `podverse-2`.
  - On Cloud Messaging, choose the new iOS app before uploading an APNs
    key. Do not replace the key on the v4 iOS app.
  - At store cutover, `com.podverse.fm` and `com.podverse` already have
    apps in this project. Re-download those existing files if a v5 build
    needs them. Do not register those ids again and do not regenerate
    their keys.

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
- Rotating or deleting the v4 Admin account `firebase-adminsdk-aqund`, or
  editing the v4 app registrations in `podverse-app`, stops push on the live
  v4 app. Add the v5 apps beside them. Next workers use `podverse-next-fcm`
  and do not replace that v4 account.
- A mistaken upload of the wrong binary to the v4 listing is high impact. Guard
  with separate EAS profiles and operator checklists.
- Installing a beta under the prod id **replaces** the user's v4 install on that
  device. Beta testers must accept that ([09](09-beta-environment.md)).
- Notification extension and any associated capabilities must stay aligned with
  the iOS bundle id.
- Store review timing is outside our control. Grace period planning must assume
  uncertainty ([12](12-production-launch-and-grace-period.md)).

The first store build uses the app version as its version name. That version
is already above `4.16.4`. The Android build number is greater than `5280`
and only increases. It does not start over at `1`.

## Future plan sets

- EAS profile and credentials inventory (operator-only secrets).
- Store submission checklist tied to [12](12-production-launch-and-grace-period.md).

In-place ids are recorded in
[mobile-deep-links-and-prod-cutover](/.cursor/rules/mobile-deep-links-and-prod-cutover.mdc).
