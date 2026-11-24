# Other Android stores

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

## Purpose

Decide which Android distribution channels besides official F-Droid and a direct APK are worth
a Podverse listing. The test is: popular with the same audience as F-Droid, or clearly more
used than F-Droid **and** still a responsible place for this free-software build. A channel
that needs a proprietary billing SDK, or that would put the Play account at risk, is out.

## Decision

| Channel | What it is | This effort |
| --- | --- | --- |
| GitHub Releases | Our APK | Yes. The direct-APK brief. |
| Obtainium | A client that installs that APK | Yes. Documentation only. |
| Official F-Droid | They compile, or they republish our reproducible APK | Yes, after the build is clean. Stable tags only. |
| IzzyOnDroid | F-Droid-compatible repository. They do not compile. They take the developer's signed APK from a tagged GitHub, GitLab, or Codeberg release. Updates often land within a day. | Measure first. Include only if the arm64 APK fits, or they grant an exception. |
| Accrescent | Small security-focused store. Developer-signed `.apks` sets. | Not now. They are not taking new apps. |
| Amazon, Samsung Galaxy Store, Huawei, Xiaomi, OPPO, and the other OEM stores | Proprietary stores, several of them larger than F-Droid | No. |
| Aptoide and similar scrapers | Third parties republishing APKs | No. We do not submit. |

Droid-ify and Neo Store are F-Droid clients. A listing on F-Droid or IzzyOnDroid shows up
there without a separate submission.

## IzzyOnDroid

Read on 18 November 2026:

- [Inclusion policy](https://izzyondroid.org/docs/general/AppInclusionPolicy/)
- [New app inclusions](https://izzyondroid.org/contributing/NewAppInclusions/)
- [FAQ, including the size limit](https://izzyondroid.org/faq/)

What they ask of us:

- Free license, public source, no ads, no analytics. Proprietary pieces are generally
  rejected. A piece that is essential and not a tracker is sometimes tolerated. We will not
  rely on that tolerance. The free-software scan is the bar here too.
- Signed release APK, not debuggable, not `testOnly`, attached to a tagged GitHub Release.
  That is the same artifact as the direct-APK brief.
- Fastlane metadata in the repo: short description, full description, icon, screenshots.
  The F-Droid listing plan produces these once.
- **Size.** The policy calls 30 MB a rule of thumb per app, and the inclusion checklist says
  they cannot accept a file over 30 MB. The FAQ says exceptions exist and must be justified,
  and that React Native and Flutter apps are the usual reason a file is large. Their own notes
  say the cap has been raised before and may be raised again.
- `usesCleartextTraffic` should be off unless the app genuinely needs HTTP, with a network
  security config. The flavor brief already splits that.
- No self-updater. Same rule as F-Droid.
- Reproducible builds are preferred. Their builders rebuild and compare. A failed compare is
  not an automatic removal. A closed source tree is.

The `izzyondroid-size` plan measures `podverse-foss-arm64-v8a.apk` and writes one of:

- Under 30 MB: open an inclusion request, pointing at the stable or prerelease asset the
  operator chooses. Prereleases are a poor stable listing. Prefer the first **main** release
  if it exists; otherwise ask whether they will track staging prereleases and accept a no.
- Over 30 MB: ask once, with the size, the ABI split, and why the runtime is that large. If
  they decline, record "skipped" in the parent index and stop. Do not remove the media engine
  or Hermes to get under the cap.

## Accrescent

Read on 18 November 2026:

- [Submitting a new app](https://accrescent.app/docs/guide/getting-started/new-app/)
- [Publishing requirements](https://accrescent.app/docs/guide/appendix/requirements/)
- Their blog on a future publishing format, linked from the docs index

They accept a developer-signed APK set (`.apks` from bundletool), not a single APK. Signature
scheme v2 or newer. No debug cert, no debuggable, no test-only, no self-updater, target SDK
in line with Play. Reproducible builds are **not** part of their review. New submissions are
allowlisted GitHub accounts, and the page says they are **not accepting new allowlist
requests**.

When that page changes, a small follow-up can produce an `.apks` from the same key. No branch
and no new flavor. Until then, do not open an account.

## Stores we are not joining

Amazon Appstore, Samsung Galaxy Store, Huawei AppGallery, and the OEM stores in Google's
verification partner list are larger than F-Droid. They are not peers of it.

- Google allows publishing on more than one Android store. Joining them would not, by itself,
  violate the Play agreement. See the policy brief.
- They imply a second review process and, for digital goods, a second billing SDK. That SDK
  would fail the free-software scan and would have to live in yet another flavor.
- Several of them are the stores covered by the first wave of Android developer verification.
  That is a reason to register our own package, not a reason to open five more listings.
- Apple is uninvolved. An Android OEM store does not threaten the App Store account.

Reopen one of them only when the operator asks for that audience. The implementation would be
a Play-flavor listing, not the free-software APK, and it would be a new plan set.

We do not upload to Aptoide or any store that redistributes APKs we did not sign for that
purpose. People can still install our GitHub APK themselves.

## Later detailed-plan steps (`izzyondroid-size`)

1. Re-read the IzzyOnDroid inclusion page. Confirm the cap has not moved.
2. Read the size recorded by `foss-android-build`. If that number is stale, measure the current
   arm64 release APK again.
3. Write the result into this brief's folder as `RESULT.md`: size, ABI, include or skip, and
   the one message to the IzzyOnDroid maintainers if we ask.
4. Do not file the request from the agent. The operator sends it.

## Operator overrides

- Filing with IzzyOnDroid despite a size miss, without asking them, is not an option. Their
  checklist refuses the file.
- Adding an OEM store is a new index decision, not a quiet expansion of `foss-apk-release`.

## Out of scope

Accrescent account creation, OEM developer accounts, and any APK we do not sign.
