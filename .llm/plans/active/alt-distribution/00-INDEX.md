# Alternate distribution — planning briefs

Status: briefing only. These files are the input for a later planning pass. They are not a
plan-runner set. There is no `COPY-PASTA.md`. Do not implement from this folder in one pass.

Research date: 18 November 2026. Store rules change. The first step of every later detailed plan
is to re-read the pages linked in [fdroid-policy](fdroid-policy/00-BRIEF.md).

## What this is

Podverse Next stays on Google Play and the Apple App Store. These briefs add a free-software
Android build, a downloadable APK on the GitHub Release we already create, and the storefronts
that can share that APK. They also record the distributions we will not ship, because a mistake
there can put the Play or App Store account at risk.

## Read in this order

| Folder | Question it answers |
| --- | --- |
| [fdroid-policy](fdroid-policy/00-BRIEF.md) | What F-Droid requires, which flags exist, and the AI disclosure. |
| [fdroid-flavor](fdroid-flavor/00-BRIEF.md) | What leaves the free-software binary, and what we accept losing. |
| [fdroid-source-layout](fdroid-source-layout/00-BRIEF.md) | Branches, and the scratchpad agents must keep current. |
| [fdroid-release-tracks](fdroid-release-tracks/00-BRIEF.md) | Application id, signing, and the stand-in for a beta track. |
| [direct-apk](direct-apk/00-BRIEF.md) | GitHub Release APKs on staging now, and on main when production exists. |
| [other-android-stores](other-android-stores/00-BRIEF.md) | IzzyOnDroid, Accrescent, Obtainium, and the stores we skip. |
| [ios-distribution](ios-distribution/00-BRIEF.md) | Why iOS stays on TestFlight and the App Store. |
| [deploy-checklist](deploy-checklist/00-BRIEF.md) | How `abcdeploysteps` learns these lanes. |

## Decisions these briefs take

A later planning pass uses these as settled. The operator overrides one by editing the
Overrides section below. Until then, do not reopen them.

1. **One monorepo, the existing branches.** No `fdroid/develop`, `fdroid/staging`, or
   `fdroid/main`. A long-lived second line will drift under an agent workflow. The free-software
   binary is a build of the same commit Play uses.
2. **Play and App Store identity stay `com.podverse.app.next`.** That is the alpha app. Do not
   point a free-software build at the live v4 F-Droid id `com.podverse.fdroid` until the
   production cutover. Alpha free-software builds use `com.podverse.app.next.foss`, so they
   install beside the Play build and cannot replace a v4 F-Droid install by accident.
3. **One free-software signing key**, held by the operator, distinct from the Play upload key.
   GitHub, Obtainium, IzzyOnDroid, and F-Droid reproducible publication all ship that same APK.
   The key is never committed.
4. **Official F-Droid is the stable listing only.** F-Droid has no internal-test track and no
   Play-style beta track. Tester builds are the staging GitHub prerelease. Obtainium users who
   opt into prereleases follow that file. The official repo's recommended version follows stable
   tags only, once production mobile exists.
5. **The free-software binary links no Firebase, no Play Services, and no Play Billing.**
   Feature flags and autolinking already drop some of this. They are not sufficient.
   `expo-notifications` still pulls `firebase-messaging` into every Android build. That
   dependency is removed or replaced before any binary is called free-software or uploaded
   anywhere. Remote push on that build is UnifiedPush. Membership purchase opens the website.
6. **A binary that still contains a proprietary library is not published.** The drift file
   records what broke and what the operator would lose. Publication stays blocked until the
   library is gone or the operator writes an override in this file.
7. **AI disclosure is a sentence in the listing, not an anti-feature flag.** F-Droid has no such
   flag as of this research. Their contributor policy allows AI-assisted code when a person
   reviews it. We disclose anyway, and we re-read the policy before each F-Droid release.
8. **Aim for no anti-feature flags.** Declare one only after the audit shows it applies. Do not
   pre-declare flags to look cautious.
9. **The APK is built from source on GitHub Actions, not by EAS.** It attaches to the prerelease
   `publish-staging.yml` already creates, and later to the release `publish-main.yml` already
   creates. It does not call `eas build` or `eas submit`. It does not block the server image
   jobs. The store-build rule is amended so this exception is explicit.
10. **Obtainium is the same APK**, with a stable asset name. It is not a second build.
11. **IzzyOnDroid is attempted after we measure the APK.** Their rule of thumb is 30 MB. A
    React Native app often misses that. If they decline an exception, we stop. We do not gut
    playback to chase the cap.
12. **Accrescent waits** until they accept new apps. Same signing key, later.
13. **No Amazon, Samsung, Huawei, Xiaomi, OPPO, or similar OEM store in this effort.** Google
    allows those stores. They are a different product (proprietary review and billing), not a
    F-Droid peer. Revisit only if the operator asks for non-free reach.
14. **No iOS build outside TestFlight and the App Store.** Unofficial sideloading violates the
    Apple developer agreement. EU web distribution and EU alternative marketplaces are legal
    only inside Apple's notarization and change the business terms. We do not start that.
15. **`abcdeploysteps podverse alpha` grows a free-software APK lane** when mobile changed.
    `abcdeploysteps podverse fdroid` is a later checklist for a stable F-Droid submission. It
    is not a cluster deploy. Until the workflow exists, that word explains that it is not ready.

## Later detailed plan sets

Write these only after the operator has had a chance to edit Overrides. Each set is its own
folder under `.llm/plans/active/`, small enough for one planning pass, then an implementation
run. Order:

| Set | Ships | Depends on |
| --- | --- | --- |
| `foss-android-build` | Free-software prebuild, Gradle scan, notification replacement, drift file, cursor rule | nothing |
| `foss-apk-release` | Non-blocking APK job on the staging prerelease, stable asset name, main job present and switched off | `foss-android-build` produces an APK |
| `foss-listing` | Fastlane metadata, anti-feature audit notes, AI sentence, signing runbook | a clean APK exists |
| `abcdeploysteps-foss` | Skill text for the alpha lane and the future `fdroid` checklist | the workflow name from `foss-apk-release` |
| `izzyondroid-size` | Measure the arm64 APK and write the include-or-stop result | a release-sized APK |

No implementation set for Accrescent, OEM stores, or iOS alternative distribution.

## Already in the repo

- Flavor policy and the known blocker: `.cursor/skills/mobile-fdroid-flavors/SKILL.md`
- Autolinking switch: `apps/mobile/fossNativeModules.js` (`unifiedpush` drops Firebase and
  `expo-iap`)
- UnifiedPush UI and API already exist. FCM remains the Play path.
- Custom API screen: `apps/mobile/src/screens/more/MoreCustomApiScreen.tsx`
- License: AGPL-3.0, named in the root `README.md`, with the AGPL v3 text in `LICENSE`
- Alpha application id: `com.podverse.app.next` in `apps/mobile/app.config.ts`
- v4 F-Droid id, not to be reused yet: `com.podverse.fdroid`
  (`docs/proposals/v4-to-v5-migration/14-fdroid.md`)
- Staging already creates a GitHub prerelease: job `github-prerelease-create` in
  `.github/workflows/publish-staging.yml`
- Main already creates a GitHub release: job `create-release` in
  `.github/workflows/publish-main.yml`
- Store binaries stay on demand: `.cursor/rules/mobile-store-builds-on-demand.mdc`
- Deploy checklist command: `.cursor/skills/abcdeploysteps/SKILL.md` (alpha only today)

## Overrides

None yet. When the operator returns, add dated notes here. A later planning pass treats a note
in this section as newer than the decision list above.
