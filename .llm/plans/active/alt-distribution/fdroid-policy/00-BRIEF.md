# F-Droid policy, flags, and AI disclosure

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

Research date: 18 November 2026. Re-fetch every URL in this file at the start of the detailed
plan, and again before any submission. The inclusion policy and the anti-feature list move.

## Purpose

State what "good standing" means for the official F-Droid repository, which flags exist, and
what we will say about AI-assisted code. This brief does not write the metadata file.

## Decision

- Submit to the **main F-Droid repository** only after a clean free-software build exists. A
  private binary repository is the fallback if their builder cannot compile this monorepo. It
  is not the goal.
- **Declare no anti-features** unless the audit in the later `foss-listing` plan proves one.
  The expected honest result is an empty list. A wrong declaration is worse than a slow review.
- **AI:** there is no metadata flag to set. Put one sentence in the full description. Keep a
  human review of what we ship. Re-read the policy before each F-Droid release and record the
  date in `apps/mobile/fdroid/DRIFT.md` (created by the flavor plan).

Suggested description sentence, to edit before submission:

```text
Some of this app's source code is written with the assistance of AI tools. A maintainer reviews
the changes before each release.
```

## What F-Droid requires

Sources read on 18 November 2026:

- [Inclusion Policy](https://f-droid.org/docs/Inclusion_Policy/)
- [Submitting quick start](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/)
- [Build metadata reference](https://f-droid.org/docs/Build_Metadata_Reference/)
- [Reproducible builds](https://f-droid.org/docs/Reproducible_Builds/)
- [App developer FAQ](https://f-droid.org/docs/FAQ_-_App_Developers/)

The bar that matters for this app:

1. **Free license on the app and on what the binary links.** The root `README.md` names
   AGPL-3.0, and `LICENSE` is the AGPL v3 text. The listing plan confirms the SPDX identifier
   against that grant before it is written into metadata. Every JAR, AAR, and native library
   in the built flavor must be free software too.
   Firebase and Play Services are named examples of libraries they reject.
2. **They compile from public source** with a free toolchain. Debian-packaged tools. No Oracle
   JDK. No proprietary IDE. Prebuilt binaries are allowed only from a short list: Debian main,
   specific Maven repositories when the artifacts themselves are free, the Android SDK, the
   Flutter SDK, **Hermes**, current **Node.js**, and a few language toolchains. "It is on Google
   Maven" does not make `com.google.android.gms` acceptable.
3. **No API keys that F-Droid would have to sign up for.** Keys that do ship are present in
   source as well as the binary. The free-software build ships no `google-services.json`.
4. **No silent download of further executables.** An update check may open the F-Droid listing
   or the GitHub Release page. It may not download an APK. Consent has to be opt-in and as easy
   to refuse as to accept.
5. **Application id** comes from a domain we control, and it is unique. Forks need a new id.
   See the tracks brief for the id we will use before production cutover.
6. **Fastlane-style text and images** live in the app repo before inclusion: short description,
   full description, icon, screenshots.
7. **The app must do what the description says**, be useful to end users, and be maintained.
   The three-month activity rule has exceptions for apps that already have users. Podverse has
   users. Do not describe Play-only features (FCM, Play Billing) as available in this build.
8. **Reproducible builds are not required for inclusion.** They are the recommended path for a
   new listing, because Android will not update an install onto a different signing key. We
   take that path so the GitHub APK and the F-Droid APK are the same file. Details are in the
   tracks brief.
9. **Donation links** are verified from `FUNDING.yml`, the README, or the project site. Add
   nothing until the operator points at the link they want verified.

## Flags that exist today

The public [Anti-Features](https://f-droid.org/docs/Anti-Features/) page and the metadata
reference do not match word for word. The metadata reference is what a packager can set.
`DisabledAlgorithm` is applied by their scanner when the signature algorithm is unsafe. It is
not a flag we choose.

| Flag | Meaning | What we expect |
| --- | --- | --- |
| `Ads` | Advertising in the app | Absent. Do not add an ad SDK. |
| `Tracking` | Activity reported somewhere by default, including crash uploads | Absent. No analytics SDK in the mobile app today. The listing plan confirms first-launch network calls. Signed-in sync to our API is the product. A phone-home on a signed-out launch would force this flag. |
| `NonFreeNet` | Promotes or depends entirely on a proprietary network service | Absent, once Firebase is out. Our API is AGPL. Podcast RSS is not a proprietary service. |
| `TetheredNet` | Usable only with one server instance, and the user cannot point elsewhere | Absent if the custom API screen stays in this build. Playback of an arbitrary RSS feed is the other reason. The listing plan quotes both in the description. |
| `NonFreeDep` | Needs a non-free app installed to be useful | Absent. UnifiedPush distributors are free software, and the app works without one. Android Auto's host app is proprietary and optional. Do not make Auto required. |
| `NonFreeAdd` | Promotes non-free apps or plugins | Absent. No Play Store links, no "install Google app" prompts. Membership opens our website. |
| `NonFreeAssets` | Artwork, fonts, or sound under a non-commercial or no-derivatives license | Unknown until the asset audit. `@expo/vector-icons` ships several icon fonts. The listing plan records each license. |
| `NSFW` | In the metadata reference | Does not apply. |
| `NoSourceSince` | Upstream source disappeared | Does not apply. |
| `KnownVuln` | Scanner finding | Keep dependencies current. A finding blocks a proud "no flags" claim until it is fixed or disclosed. |
| Disabled algorithm | Unsafe APK signature | Sign with apksigner, scheme v2 or v3. Not jarsigner alone. |

Anti-features are warnings, not an automatic ban, except where the inclusion policy already
forbids the library (proprietary tracking and ads are forbidden outright, so those apps never
reach the flag).

## AI

Read on 18 November 2026:

- [Interim policy on generative AI](https://gitlab.com/fdroid/admin/-/work_items/699)
  (fdroid/admin 699). F-Droid neither endorses nor bans generative AI. The person who submits
  is responsible. They must understand, review, test, and where needed change the output.
  Uploading unreviewed AI output conflicts with their practice. The same licensing and freedom
  rules apply. Do not send private keys, credentials, or embargoed vulnerabilities to a
  third-party model while preparing a submission. That last point is already our
  public-repo rule.
- Proposed flags that are **not** in the metadata reference:
  [client issue 3211](https://gitlab.com/fdroid/fdroidclient/-/work_items/3211) (AI-generated
  assets, AI dependencies, AI-generated code) and
  [client issue 3403](https://gitlab.com/fdroid/fdroidclient/-/work_items/3403).
  Do not invent an `AntiFeatures:` value for these. An unknown value can fail their parser.

If a later re-read shows a real flag, the drift file's "re-read policy" line is what makes the
next release pick it up. Add the flag and keep the description sentence.

## Play and Apple standing, as it touches this policy

Google's own docs allow distributing the same product through other stores and as an APK.
[Alternative distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution)
and the [app-bundle FAQ](https://developer.android.com/guide/app-bundle/faq). The Play
developer agreement forbids using **Google Play** to distribute a product whose purpose is
installing Android apps outside Play (agreement section 4.5). Podverse is a podcast app. A
download link on our website and in the GitHub Release is fine.

The line we will not cross: the **Play binary** must not send people to the free-software build
or to a website checkout in order to avoid Play Billing for digital goods. The free-software
binary, under its own application id, may open the membership website. The two binaries stay
separate. The iOS brief covers Apple.

## Later detailed-plan steps (`foss-listing`)

1. Re-read the five F-Droid URLs and the AI policy issue.
2. Inventory licenses for icons, fonts, splash art, and sounds under `apps/mobile/assets` and
   the icon packages the release binary embeds.
3. Inventory first-launch and background network calls in the free-software build. Decide
   `Tracking`, `NonFreeNet`, and `TetheredNet` from that inventory, in writing.
4. Add Fastlane metadata under the mobile app: title, short description, full description
   (including the AI sentence and the UnifiedPush / website-membership limits), and a contact.
5. Confirm screenshots exist and show this build, not the Play build's billing sheet.
6. Write the `fdroiddata` recipe outline: public repo, tag pattern, build script, no secrets.
   Do not open the inclusion issue until the flavor plan's scan is clean and a builder outside
   EAS has produced the APK.

## Operator overrides

- Drop the AI sentence only if a re-read shows F-Droid asking submitters not to add it.
- Accept a named anti-feature only by adding it here in the parent Overrides section, with the
  reason.

## Out of scope

Metadata YAML in `fdroiddata`, screenshots, and the inclusion issue itself. Those wait for a
clean APK.
