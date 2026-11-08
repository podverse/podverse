---
name: mobile-fdroid-flavors
description: FOSS vs playstore Android/iOS product flavors — FCM vs UnifiedPush, non-FOSS dependency register, defer full implementation to Track 20.
---

# Mobile product flavors (playstore vs FOSS)

Use when implementing **push**, **billing**, **analytics**, or **native dependencies** that differ
between Google Play / App Store builds and F-Droid / de-Googled Android builds.

Full flavor implementation is **Track 20** (master plan steps 20.1–20.7). This skill captures
policy so early Tracks do not bake in FOSS-incompatible assumptions.

## Flavor split (target)

| Concern              | playstore flavor                         | FOSS flavor                                      |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| Push transport       | FCM (+ APNs via Firebase on iOS typical) | **UnifiedPush** via `/account/up-device/*`       |
| Google Play Services | Allowed where required                   | **None** — no Firebase, no proprietary blobs     |
| In-app purchases     | Store billing (Track 11)                 | **Unavailable** — link to web membership instead |
| Signing              | Play / App Store upload keys             | Separate FOSS signing key (step 20.5)            |

## Push endpoints (already on API)

Reuse typed wrappers in `packages/helpers-requests/src/api/account/`:

- **FCM:** `/account/fcm-device/*` — playstore flavor only
- **UnifiedPush:** `/account/up-device/*` — FOSS flavor (cross-ref Track 14.6, 20.2)

Do **not** port the web **Web Push** / service-worker path to mobile.

## Non-FOSS dependency register

When adding a native or npm dependency that is not FOSS-clean (Firebase, Play Services, proprietary
SDKs):

1. Gate it behind the **playstore** flavor build variant.
2. Document it in the FOSS register (Track 20.3 / steps 2.31, 14.7, 446-fdroid-register).
3. Ensure the FOSS flavor builds and runs without that dependency.

Examples called out in the master plan: FCM/Firebase (14.7), media engine Play Services (2.31).

### Register (running list)

| Component / dep                                          | License / source                                | FOSS status               | Flavor gating                                                                                                                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `podverse-media-engine` — Android (Media3 **ExoPlayer**) | Apache-2.0 (`androidx.media3`)                  | **FOSS-clean**            | None — ships in both flavors                                                                                                                                                                                                           |
| `podverse-media-engine` — iOS (AVFoundation / AVPlayer)  | Apple system framework                          | n/a (iOS only)            | None                                                                                                                                                                                                                                   |
| `expo-iap` (StoreKit 2, Play Billing)                    | MIT library; Play Billing is Google proprietary | Not FOSS-clean on Android | playstore. JS uses `unavailableBillingClient` when `EXPO_PUBLIC_MOBILE_BILLING=unavailable` or the push provider is `unifiedpush`. `apps/mobile/fossNativeModules.js` drops it from autolinking in those builds. |
| `@react-native-firebase/app`, `@react-native-firebase/messaging` | Apache-2.0 wrapper around proprietary Firebase / Play Services | Not FOSS-clean | playstore, and only when `GOOGLE_SERVICES_INFO_PLIST` / `GOOGLE_SERVICES_JSON` exist. UnifiedPush, `none`, and file-less builds unlink both packages. The app reads `getToken()`, which is an FCM registration token. |
| `expo-notifications` Android `firebase-messaging`        | Expo module; Gradle depends on `com.google.firebase:firebase-messaging` | Not FOSS-clean on Android | Still linked in every Android build, including UnifiedPush. An F-Droid binary is not submittable until this dependency is removed or replaced. Track 20 owns that. Do not add another Google library beside it. |

**Media engine (step 2.31):** the first-party engine uses **Media3 ExoPlayer** on Android and
**AVFoundation** on iOS. It links **no Google Play Services, no Firebase, no `react-native-track-player`**,
so it is FOSS-clean and needs **no playstore-flavor gating**. If later video/DRM/cast work pulls a
proprietary SDK (e.g. Play Services Cast, Widevine modular beyond system), gate it to the playstore
flavor and add a row here in the same PR — do not add Play Services solely to satisfy a feature.

## F-Droid build gate

A UnifiedPush build (`EXPO_PUBLIC_MOBILE_PUSH_PROVIDER=unifiedpush`) is the FOSS flavor.
`apps/mobile/react-native.config.js` asks Expo autolinking to skip every package
`fossNativeModules.js` marks. `app.config.ts` omits the Firebase config plugins and the store
billing plugin in that build.

Before calling an Android binary F-Droid compliant:

1. Prebuild with the UnifiedPush provider and billing `unavailable`.
2. Confirm the generated Android project does not depend on `@react-native-firebase/*` or `expo-iap`.
3. Confirm it also does not depend on `com.google.firebase` or `com.google.android.gms`.
   `expo-notifications` still fails this check. Replacing or patching that module is required
   before submission. Local notification display and the permission prompt have to keep working
   on UnifiedPush after that replacement.
4. Keep Firebase calls behind the FCM push provider so UnifiedPush JavaScript never needs the
   native module.

## LLM guidance

- Prefer **interfaces + flavor-specific implementations** over `#ifdef`-style copy-paste.
- FOSS builds must not require Google Play Services or Firebase at runtime.
- IAP and Play billing code must not ship in FOSS artifacts (step 20.6).
- Defer F-Droid metadata and submission to operator steps (20.4, 20.7).

## Related

- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md §4](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
- Master plan **Track 14** (push) and **Track 20** (FOSS / F-Droid)
- **mobile-react-native** rule — no blind imports of `@podverse/external-services-*`
