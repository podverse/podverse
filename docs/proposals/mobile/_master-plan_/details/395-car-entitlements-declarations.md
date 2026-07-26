# 395-car-entitlements-declarations

**Master step:** 12.16
**Model (author + implement):** Codex 5.3
**Status:** Android done; iOS CarPlay entitlement _TBD_

## Scope

Document the operator/portal steps to declare the car experiences with the app stores. Split by
platform — the Android Auto declaration is deliverable now; the iOS CarPlay entitlement is a later
slice.

## Android Auto (done)

- No Apple-style entitlement gate: DHU build + test needs no portal approval.
- **In code (this slice):** `com.google.android.gms.car.application` `<meta-data>` +
  `res/xml/automotive_app_desc.xml` (`<automotiveApp><uses name="media"/></automotiveApp>`) in the
  media-engine module manifest; merges into the app manifest at prebuild. Media browse service
  (`PodverseMediaLibraryService`) with the Media3 / MediaBrowserService intent filters.
- **Operator submits:** Play Console **Android Auto / cars** declaration as a **media** app + review
  against the media-app quality guidelines.
- Operator doc: `apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md`.

## iOS CarPlay (TBD — later slice)

- Requires the Apple **CarPlay entitlement** (`com.apple.developer.carplay-audio`) via a request to
  Apple, plus **App Group** provisioning so the CarPlay scene reads the shared native cache
  (`PodverseNativeCache.appGroupIdentifier`, reserved `nil` today).
- Tied to master steps 12.7–12.10 (CarPlay scene / templates / now-playing / remote commands) and
  12.18 (CarPlay simulator checklist). Not started here.

## Acceptance criteria

- Android operator declaration doc exists and lists the code-wired descriptor vs. portal steps.
- Marked clearly as operator/portal steps.
- iOS CarPlay entitlement section flagged TBD with the App Group dependency.

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- Android for Cars: <https://developer.android.com/training/cars/media>

## Verification

```bash
test -f apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md
rg -n 'car.application|automotive_app_desc' apps/mobile/modules/podverse-media-engine/android
```

## Depends on

- 12.11 media-library service + media-app descriptor (detail 390)
