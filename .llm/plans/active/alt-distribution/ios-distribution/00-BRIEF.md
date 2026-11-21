# iOS — stay on TestFlight and the App Store

Briefing only. Parent: [../00-INDEX.md](../00-INDEX.md).

## Purpose

Answer whether any iOS distribution is comparable to F-Droid, and whether shipping one would
put the Apple developer account at risk. The operator's rule for this effort: if a channel
would violate Play or App Store policy, we do not use it.

## Decision

**No iOS binary outside TestFlight and the App Store.**

There is no iOS equivalent of F-Droid that we can publish to while remaining in good standing
with Apple. The free-software work in the other briefs is Android-only. iOS keeps FCM-or-APNs
push and StoreKit. We do not strip those modules out of the iOS target to mirror the Android
flavor.

## What exists, and why each one fails the test

Read on 18 November 2026:

- [Apps in the European Union](https://developer.apple.com/support/apps-in-the-eu/)
- [Web Distribution in the EU](https://developer.apple.com/support/web-distribution-eu/)
- [Operating an alternative app marketplace in the EU](https://developer.apple.com/support/alternative-app-marketplace-in-the-eu/)

| Channel | Policy |
| --- | --- |
| App Store | The production listing. Unchanged. |
| TestFlight | The beta we already use from `abcdeploysteps podverse alpha`. This is the only iOS beta. There is no second iOS tester channel to invent. |
| Enterprise / in-house certificates | For employees of the organization. Public distribution on an enterprise certificate gets the account revoked. Do not. |
| Ad-hoc and development signing | Device-limited developer installs. Not a public channel. |
| AltStore, SideStore, and similar tools outside Apple's notarization | These are not Apple distribution programs. Shipping a public IPA for them is outside the developer agreement. Do not. |
| EU alternative app marketplace | Legal **only** as an Apple-authorized marketplace of notarized apps. The operator would accept Apple's EU business terms. As of the August 2026 terms taking effect 1 October 2026, digital goods sold outside the App Store in the EU carry a Core Technology Commission. Marketplace operators also face eligibility, moderation, and fraud-monitoring duties. This is allowed when every step is inside that program. It is a different business. We are not starting it. |
| EU web distribution | The same notarization requirement, from a domain registered in App Store Connect, EU users only, iOS 17.5 or later. Same business terms. Same decision: not now. |

A notarized EU listing would not be "violating store policy." An IPA published past those
rules would be. The second one is the risk to the account, and the first one is enough
operational and commercial change that it does not belong in an Android free-software effort.

Nothing here is more popular than the App Store in a way that replaces it. TestFlight is
already the beta.

## What agents must not add later

- An `ios/` flavor that drops StoreKit so the tree looks like the Android free-software build.
- A GitHub Release asset that is an IPA, an unsigned payload, or a link telling App Store
  users to install outside Apple.
- A TestFlight-equivalent step in `abcdeploysteps podverse fdroid`. That checklist is Android.
- EAS Update. Already forbidden by `mobile-store-builds-on-demand`. This brief does not
  reopen it.

The Android free-software application id has no iOS twin. iOS stays
`com.podverse.app.next` until the existing production cutover.

## Later detailed-plan steps

None. If the operator later wants EU web distribution, that is a new plan set that starts by
re-reading the three Apple pages and the current developer agreement, and by stating the
business terms in the parent Overrides section before any entitlement is requested.

## Operator overrides

Adding EU web distribution or an alternative marketplace is an override. It includes an
explicit acceptance of the EU business terms. It is not implied by the F-Droid work.

## Out of scope

TestFlight notes, App Store review replies, and the production bundle-id cutover. Those stay
in the mobile release runbook and the v4-to-v5 migration docs.
