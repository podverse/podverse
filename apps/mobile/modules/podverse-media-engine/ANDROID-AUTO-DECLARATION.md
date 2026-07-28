# Android Auto — Play Console declaration (operator)

**Master step:** 12.16 (Android portion). **Audience:** operator / release owner.
**Detail:** [395-car-entitlements-declarations](/docs/proposals/mobile/_master-plan_/details/395-car-entitlements-declarations.md).

Android Auto has **no Apple-style entitlement gate** — no portal approval is required to build and
test with the Desktop Head Unit (DHU). What Google requires is a **Play Console declaration** plus
adherence to the media-app quality guidelines before the Android Auto experience is visible to users
in production. This doc lists what is already wired in code vs. what the **operator** submits.

> iOS CarPlay entitlement + App Group provisioning is a **separate slice** (12.7–12.10 / 12.16 iOS
> portion). Operator runbook:
> [`CARPLAY-ENTITLEMENT.md`](./CARPLAY-ENTITLEMENT.md). Simulator browse+play gate:
> [`CARPLAY-SIMULATOR-CHECKLIST.md`](./CARPLAY-SIMULATOR-CHECKLIST.md).

## Already wired in code (no operator action)

- **Media-app descriptor** — `com.google.android.gms.car.application` `<meta-data>` in
  `android/src/main/AndroidManifest.xml` (this module) pointing at
  `android/src/main/res/xml/automotive_app_desc.xml` (`<automotiveApp><uses name="media"/></automotiveApp>`).
  The module manifest + resources merge into the app manifest at `expo prebuild`, so no hand-edit of
  the generated app manifest is needed.
- **Media browse service** — `PodverseMediaLibraryService` (Media3 `MediaLibraryService`) with the
  `androidx.media3.session.MediaLibraryService` + `android.media.browse.MediaBrowserService` intent
  filters and `foregroundServiceType="mediaPlayback"`. Android Auto binds to the **service, not the
  Activity** (browse + play with the phone app force-stopped — 12.11–12.15).
- **Allowed callers** — `onConnect` trusts Media3's signature-checked Auto / Automotive / media
  notification controllers; unknown callers get no commands.

## Operator / portal steps (Play Console)

Do these when the Android Auto experience is ready to ship to users:

1. **App content → Android Auto / cars declaration.** In Play Console, complete the declaration that
   the app includes **Android Auto** functionality and is a **media** app.
2. **Confirm the media app category** matches the manifest descriptor (`media`).
3. **Review against the media-app quality guidelines** before submitting: browse tree depth, playable
   vs. browsable nodes, now-playing metadata, and content that works while driving. See:
   - Android for Cars media apps: <https://developer.android.com/training/cars/media>
   - Quality guidelines: <https://developer.android.com/docs/quality-guidelines/car-app-quality>
4. **Submit** the declaration with a release that contains the media service, and note the review
   outcome in the release ticket.

## Verify (operator)

Before submitting, confirm the descriptor merged into the built app manifest and DHU works:

```bash
npm run mobile:prebuild
rg -n 'car.application|automotive_app_desc|MediaLibraryService' apps/mobile/android/app/src/main/AndroidManifest.xml
```

Then run the DHU browse+play acceptance — see
[`ANDROID-AUTO-DHU-CHECKLIST.md`](./ANDROID-AUTO-DHU-CHECKLIST.md).

## Cross-links

- DHU checklist: [`ANDROID-AUTO-DHU-CHECKLIST.md`](./ANDROID-AUTO-DHU-CHECKLIST.md)
- App-closed cache read spike: [`NATIVE-CACHE-SPIKE-ANDROID.md`](./NATIVE-CACHE-SPIKE-ANDROID.md)
- Engine gate: [`GO-NO-GO.md`](./GO-NO-GO.md)
- Car rule: [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)
