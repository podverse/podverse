# Direct APK on GitHub Releases

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

## Purpose

Publish a downloadable free-software APK from the pipeline we already run, so a listener can
install Podverse without F-Droid and without Play. Obtainium users get the same file.

## Decision

Attach one signed release APK to the GitHub Release the publish workflows already create.

| Pipeline | Workflow today | Release it already creates | APK |
| --- | --- | --- | --- |
| Staging / alpha | `.github/workflows/publish-staging.yml` | Job `github-prerelease-create`, prerelease, tag `X.Y.Z-staging.N` | Yes, once the flavor build is clean. This is the tester build. |
| Main / production | `.github/workflows/publish-main.yml` | Job `create-release`, tag `X.Y.Z`, not a prerelease | Same job shape, **switched off** until the first production mobile release. The hook is added now so the production pipeline is not a blank page later. |

The APK job:

- Runs **after** the release exists (`needs` the release job). Server image jobs do not `needs`
  the APK job. A failed APK build still leaves images and the release in place.
- Builds with the free-software recipe from the flavor brief. Not `eas build`. Not `eas submit`.
- Uploads even when the release job took the "already exists" path, so a re-run can attach a
  missing asset.
- Uses a stable asset name: `podverse-foss-arm64-v8a.apk`. One ABI is enough for Obtainium's
  filename filter and gives IzzyOnDroid a smaller file to judge. A universal APK is a later
  option if arm64-only draws a real complaint. The name does not include the version. The
  release tag is the version.
- Signs with the free-software key from GitHub Actions secrets. The recipe without secrets
  still builds an unsigned APK for the scan. Only the publish job signs.

`.cursor/rules/mobile-store-builds-on-demand.mdc` says a push to `staging` or `main` must not
start an EAS build or store submit, and must not `needs:` a mobile store job from the image
publish. This APK is neither. The implementation amends that rule in the same change, in plain
language: a source-built free-software APK may attach to the GitHub Release; EAS stays
on-demand; image publish does not wait on the APK.

A repository variable gates the job. It stays off until the operator has run the flavor
verification once and has stored the keystore secret. After that, staging turns it on, so
alpha and the prerelease stay paired. Main's variable stays off.

## Obtainium

[Obtainium's GitHub source](https://wiki.obtainium.imranr.dev/sources/) reads GitHub Releases
and installs `.apk` assets. It can ignore prereleases. That is the tester-versus-stable switch:

- Testers turn prereleases on and follow `podverse-foss-arm64-v8a.apk`.
- Everyone else leaves prereleases off and, once main publishes, follows the stable release
  of the same filename.

Do not also upload the source zip as the thing we tell people to install. Obtainium can see
those archives. The asset filter we document is the APK name.

Document, in the listing plan, the exact repository URL and the filter regular expression.
Do not run a separate Obtainium release.

A floating URL such as `https://example.com/app-latest.apk` is a deprecated IzzyOnDroid source
and a bad Obtainium source. The GitHub Release asset is the address.

## What the release notes should say

The existing release body is `release-notes/<X.Y.Z>.md`, shared with the server release. The
APK job does not rewrite that file. The listing plan adds a short free-software section the
operator can keep in the mobile release notes: UnifiedPush instead of FCM, membership on the
website, and the install file name. No claim that the file is on F-Droid until it is.

## Play policy

A GitHub Release of an APK is an allowed distribution channel. See the policy brief. The Play
app does not link to this file from inside a purchase flow.

## Later detailed-plan steps (`foss-apk-release`)

1. Re-read `mobile-store-builds-on-demand` and both publish workflows so the new job matches
   their release-creation behavior, including the "release already exists" skip.
2. Add the APK job to `publish-staging.yml` with its own `contents: write` permission. Image
   jobs stay independent.
3. Add the same job to `publish-main.yml` behind the off switch.
4. Amend the store-build rule with the exception above.
5. Document the secret names the operator creates. Do not create the keystore in the plan, and
   do not print it.
6. Document the Obtainium settings: source URL, prerelease toggle, APK name filter.
7. Operator verification is a staging prerelease that contains the asset, an install on a
   device without Play Services, and a second staging run that does not start EAS.

## Operator overrides

Turning the staging job on for every alpha is the decision in the index. Leaving it as
`workflow_dispatch` only is the override, if the build minutes are too expensive after the
first measurements. The dispatch button should exist either way so a broken asset can be
rebuilt without a new server release.

## Out of scope

F-Droid metadata, IzzyOnDroid inclusion, and Play submit.
