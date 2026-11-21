# Tracks, application id, and signing

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

## Purpose

Map Play's internal, beta, and production ideas onto what F-Droid and a direct APK can actually
do. Fix the application id and the signing key before the first public install, because Android
will not move an existing install onto a new id or a new key without an uninstall.

## Decision

### There is no internal track

F-Droid does not have Play's internal-testing track. We will not invent a private F-Droid
repository for alpha testers. Alpha testers who want this build install the GitHub prerelease
APK, or add that release in Obtainium with prereleases included.

### There is no beta track to keep in sync

F-Droid can mark a build unstable: `CurrentVersionCode` stays on the stable version, and a
higher version code is installable only when the user turns on unstable updates. That is a
manual metadata feature. It is a poor mirror of Play's open testing, and a staging tag every
alpha would push the stable build into their archive (the default archive policy keeps a
handful of versions).

So:

| Play, today and later | Free-software Android |
| --- | --- |
| Internal testing (what alpha's EAS `beta` profile uploads now) | Staging GitHub **prerelease** APK of the same commit. Not uploaded to the official F-Droid repo. |
| A future Play open-testing or closed beta | The same prerelease APK. Still not the official F-Droid recommended version. |
| Production, when `main` ships a mobile release | Official F-Droid recommended version, plus the GitHub **release** (not prerelease) of the same APK. |

`UpdateCheckMode` for the official repo, when we get there, matches stable tags only
(`X.Y.Z` with no `-staging` suffix). Staging tags never become `CurrentVersionCode`.

Play internal rollout stays a separate operator step. Shipping the free-software APK does not
roll out the Play draft, and rolling out Play does not submit anything to F-Droid.

### Application id

| Build | Id | When |
| --- | --- | --- |
| Play alpha, and the future Play production app until cutover | `com.podverse.app.next` | Unchanged. `.cursor/rules/mobile-next-store-identity.mdc` |
| Free-software alpha and the GitHub APK | `com.podverse.app.next.foss` | From the first APK. Side by side with Play. Cannot overwrite v4. |
| v4 F-Droid, already in the wild | `com.podverse.fdroid` | Do not publish NextGen under this id yet. |
| Production cutover | `com.podverse.fdroid`, version code above v4 | A later migration step, together with the Play id move to `com.podverse`. Not this effort. |

The cutover has a signing choice that this brief does not settle, because no one is installing
the new id yet:

- Keep publishing with **our** free-software key. v4 F-Droid users reinstall once. GitHub,
  IzzyOnDroid, and F-Droid stay one file. This is the default we will recommend at cutover.
- Or keep F-Droid's historical key for `com.podverse.fdroid` so v4 installs update in place.
  The GitHub APK would have to be that same F-Droid-signed file, or the two channels could
  not update each other.

Write that choice into the parent Overrides section when production mobile is real. Do not
block alpha on it.

### Signing key

- One key for every free-software APK we publish. Operator-held. Not the Play upload key.
  Not in git. Matches `.cursor` signing notes in the master-plan detail `574` in spirit: a
  separate key, secrets stay with the operator.
- Generate it before the first APK that leaves the machine. Rotating it later means every
  user uninstalls.
- Sign with apksigner, signature scheme v2 or v3, so F-Droid's disabled-algorithm scanner
  stays quiet and Accrescent's rules are already met if we go there later.
- Reproducible builds: F-Droid rebuilds from the tag and, on a match, publishes **our** signed
  APK. That is "publishing with the upstream signature" in their
  [reproducible builds](https://f-droid.org/docs/Reproducible_Builds/) doc. It is the only way
  one install can move between GitHub and F-Droid without an uninstall.
- If reproducibility fails, F-Droid can still list a build they sign. We would then be
  maintaining two signatures. Do not start that way. Fix the recipe, or ship only the GitHub
  APK until the rebuild matches.

### Android developer verification

Google is requiring verified developers for installs on certified devices. As of the pages
read on 18 November 2026:

- [Developer verification guide](https://developer.android.com/developer-verification/guides)
- [F-Droid open letter, 24 February 2026](https://f-droid.org/2026/02/24/open-letter-opposing-developer-verification.html)
- [fdroid/admin 665](https://gitlab.com/fdroid/admin/-/work_items/665), on registering a package
  whose key is also held by a store

The early enforcement named on the guide is Brazil, Indonesia, Singapore, and Thailand from
30 September 2026, and at first the partner stores (Play, Samsung, and several OEM stores).
Web APKs were described as still installable in that first phase. F-Droid's letter treats a
wider requirement, including stores and direct downloads, as the direction for 2027.

We are already Play developers, so the account exists. Before the free-software APK is offered
to the public, register `com.podverse.app.next.foss` and this signing certificate in that
console. If F-Droid also signs a copy, add their certificate as an additional key on that
package. The registration properties file Google asks apps to embed is added by the operator
at build time. Do not commit it until we know it is not a credential. The public-repo rule
wins over a convenient default.

Re-read the verification guide in the listing plan. The dates moved during 2026.

## Later detailed-plan steps

Split across `foss-android-build` (the id and the release build type) and `foss-listing`
(the key ceremony, the verification registration, the reproducible-build recipe):

1. Set the free-software `applicationId` only on that build. Leave `app.config.ts`'s Play
   package on `com.podverse.app.next`.
2. Document the key ceremony for the operator: where the keystore lives, which GitHub Actions
   secret names receive it, and the confirmation that it differs from Play. No secret values
   in the doc.
3. Pin JDK, SDK, NDK, Gradle, and Node in the recipe so a second machine can match the APK.
4. Add `AllowedAPKSigningKeys` to the future metadata notes, using the certificate fingerprint
   the operator computes locally. Do not paste a private key.
5. Leave `com.podverse.fdroid` untouched.

## Operator overrides

- Using `com.podverse.fdroid` for alpha is an override. It would offer NextGen as an update to
  current v4 F-Droid users. Do not do that from this briefing.
- A second application id for "beta" is an override. One id plus GitHub prereleases is the
  simpler tester story.

## Out of scope

The Play internal rollout command, TestFlight, and the v4-to-v5 data migration. The migration
doc stays the owner of the production id change.
