# Free-software flavor — what is removed, and what we give up

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

## Purpose

Define the Android binary that is allowed to carry the free-software label. Record which
proprietary pieces already exist, which a feature flag can keep out, and which have to leave
the build because a flag cannot stop Gradle or a static import.

## Decision

Build one Android release from the same commit as Play, with:

- `EXPO_PUBLIC_MOBILE_PUSH_PROVIDER=unifiedpush`
- `EXPO_PUBLIC_MOBILE_BILLING=unavailable`
- application id `com.podverse.app.next.foss` (see the tracks brief)
- no `google-services.json` and no Google services Gradle plugin

Behavior flags stay. They are not the compliance boundary. The boundary is a scan of the
**compiled** free-software Gradle graph and of the APK: no `com.google.firebase`, no
`com.google.android.gms` as a library, no Play Billing classes, no Crashlytics, no ad SDK.

If the scan fails, we do not publish. We write the blocker in the drift file and stop.

## Already true

`.cursor/skills/mobile-fdroid-flavors/SKILL.md` and `apps/mobile/fossNativeModules.js`:

| Piece | Free-software status today |
| --- | --- |
| `@react-native-firebase/app` and `messaging` | Unlinked when the push provider is `unifiedpush` or `none`, and when the Google services file is missing. JS loads them through `require()` in `apps/mobile/src/push/firebaseNativeModules.ts`, not a top-level import. |
| `expo-iap` | Unlinked for `unifiedpush` and when billing is `unavailable`. |
| `expo-notifications` | **Still linked on every Android build.** Its Gradle config depends on `com.google.firebase:firebase-messaging`. The skill already says an F-Droid binary is not submittable until this is gone, and that local notification display and the permission prompt must keep working. |
| Media engine (Media3 ExoPlayer) | Free software. No Play Services. Stays. |
| UnifiedPush account routes | Already on the API. The mobile screen is `AdvancedUnifiedPush`. |

`apps/mobile/app.config.ts` sets `android.usesCleartextTraffic: true` for the whole app so
ExoPlayer can reach E2E test-assets over HTTP. That is a release-policy problem for IzzyOnDroid
and a review question for F-Droid. It is not an anti-feature by itself.

`apps/mobile/modules/podverse-media-engine` ships an Android Auto **descriptor**
(`com.google.android.gms.car.application` meta-data pointing at `automotive_app_desc.xml`).
That string is not the Play Services library. Keep the descriptor. The scan must be written so
this XML does not look like a Maven dependency. Android Auto on a de-Googled phone simply has
no host app. Phone playback does not need it.

## Why a flag is not enough

`EXPO_PUBLIC_*` values are inlined into the JS bundle. They can choose a code path. They cannot:

- Stop Gradle from resolving a dependency declared inside an Expo module's own `build.gradle`.
- Stop Metro from bundling a package that some file imports statically.
- Remove a proprietary AAR that a transitive dependency pulls in.

The Firebase JS boundary is already a function-scoped `require`. Keep new Play-only libraries
behind that kind of boundary, in a file the free-software graph does not import. A static
`import` of `@react-native-firebase/*` or `expo-iap` anywhere on the shared startup path is a
drift-file event, not a follow-up.

The notification library is the case the flag cannot fix. The later `foss-android-build` plan
tries, in order:

1. A patch or Gradle exclude that drops `firebase-messaging` from `expo-notifications` on this
   flavor, then a release build, then a check that a local notification still posts.
2. If that patch fails or local notifications die, a small Android notification path used only
   by this flavor, with `expo-notifications` unlinked the same way Firebase already is.
3. If both fail, stop. Record the user-visible loss in the drift file. Do not ship a binary
   that still links Firebase under a free-software name.

Do not delete the Play notification path from the branch. Play keeps FCM.

## What we give up on this binary

These are accepted. They do not need another product decision unless an override says so.

| Play / iOS capability | Free-software Android |
| --- | --- |
| FCM remote push | UnifiedPush. With no distributor app installed, remote push does not arrive. The rest of the app works. Copy should say that a distributor such as the user's own UnifiedPush app is required for push. |
| Play Billing | Unavailable. Membership is purchased on the website. No Play purchase sheet, no "get the other build" link. |
| Play in-app updates | None. Updates come from F-Droid or from the GitHub Release the user installed. The app does not download an APK. |
| `google-services.json` features | None. |

Not given up, unless the notification spike fails and the operator then accepts the loss:

- Local notifications and the notification permission prompt.
- Playback, subscriptions, downloads, add-by-RSS, the custom API screen, Android Auto's
  descriptor.

Anything else that shows up in the scan is **not** pre-approved. The drift file names it. The
default is to remove it. Sacrificing a feature (for example, dropping a wallet flow that cannot
be split from a proprietary SDK) is an operator override in the parent index, written before
publication.

## Cleartext

Podcast enclosures are still served over HTTP on the open web. A free-software release that
blocked all cleartext would break playback of those shows.

The release build does not set the blanket `usesCleartextTraffic` flag. It uses a network
security config that allows cleartext for media playback and refuses it for our API. Debug and
E2E builds may keep the blanket flag so `http://10.0.2.2:2111` still works. The scan checks the
**release** manifest.

## Later detailed-plan steps (`foss-android-build`)

1. Re-read the flavor skill and this brief.
2. Add a reproducible recipe script under `apps/mobile/fdroid/` that prebuilds with the two
   env vars above and assembles a release APK without EAS. No secrets in the script.
3. Add a Gradle or APK scan that fails the job when the forbidden libraries appear. Allow the
   Auto descriptor XML by path, not by turning the scan off.
4. Add a source check that fails when a static import of the Firebase packages or `expo-iap`
   appears outside the files that already gate them.
5. Do the notification spike in the order above. Keep local notifications working.
6. Split cleartext as described. Confirm a release manifest and an E2E manifest.
7. Create `apps/mobile/fdroid/DRIFT.md` using the layout in the source-layout brief. Seed it
   with the notification spike result and this accepted-loss table.
8. Boot the release APK on an emulator image **without** Play Services. Play an episode,
   subscribe, download, and open the UnifiedPush screen. That boot is part of the detailed
   plan's verification notes for the operator, not something this briefing runs.
9. Measure wall time and APK size. The size number is the input to the IzzyOnDroid brief. The
   time number is the input to whether F-Droid's builder can cope with this monorepo.

## Starting points

- `apps/mobile/fossNativeModules.js`
- `apps/mobile/app.config.ts`
- `apps/mobile/src/push/firebaseNativeModules.ts`
- `apps/mobile/src/push/fcmTransport.ts`
- `apps/mobile/modules/podverse-media-engine/android/src/main/AndroidManifest.xml`
- `.cursor/skills/mobile-fdroid-flavors/SKILL.md`

## Out of scope

Signing keys, GitHub upload, store accounts, and metadata text. Those are the other briefs.
