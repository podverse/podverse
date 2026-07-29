# 395-car-entitlements-declarations

**Master step:** 12.16
**Model (author + implement):** Codex 5.3
**Status:** Android done; iOS portal + code wiring done

## Scope

Document the operator/portal steps to declare the car experiences with the app stores. Split by
platform.

## Android Auto (done)

- No Apple-style entitlement gate: DHU build + test needs no portal approval.
- **In code:** `com.google.android.gms.car.application` `<meta-data>` +
  `res/xml/automotive_app_desc.xml` in the media-engine module; merges at prebuild.
- **Operator submits:** Play Console Android Auto / cars declaration when shipping to users.
- Operator doc: `apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md`.

## iOS CarPlay (portal + code wiring complete for Next)

**Team already has CarPlay Audio** (enabled on production `com.podverse.fm`). For Next:

| Portal item                                   | Status                                             |
| --------------------------------------------- | -------------------------------------------------- |
| App ID `com.podverse.app.next`                | Created                                            |
| CarPlay Audio App + CarPlay framework toggles | Enabled on App ID                                  |
| App Group `group.com.podverse.app.next`       | Created + assigned to App ID                       |
| Contact form re-request                       | **Not required** (team capability already granted) |

Operator runbook: [`CARPLAY-ENTITLEMENT.md`](/apps/mobile/modules/podverse-media-engine/CARPLAY-ENTITLEMENT.md).

**Done (agent, step 12.7):** Expo entitlements (`ios.entitlements`) + Info.plist CarPlay scene
(`UIApplicationSceneManifest`) in `app.config.ts`, `PodverseCarPlaySceneDelegate.swift`, and
`PodverseNativeCache.appGroupIdentifier = "group.com.podverse.app.next"`.

## Acceptance criteria

- Android declaration doc exists.
- iOS runbook documents portal state for `.next` and points agents at App Group id string.
- Code wiring tracked under detail 386 / CarPlay COPY-PASTA set.

## Verification

```bash
test -f apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md
test -f apps/mobile/modules/podverse-media-engine/CARPLAY-ENTITLEMENT.md
```

## Depends on

- 12.11 media-library service (Android)
- CarPlay scene 12.7 for code-side entitlements merge
