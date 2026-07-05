# Authoring: Tracks 19–21 — membership, F-Droid, deferrals

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-19-21.md`

**Detail ID range:** 560–609

Reference:
[DOCS-MOBILE-PROCESS-MEMBERSHIP-FDROID.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MEMBERSHIP-FDROID.md),
[DOCS-MOBILE-PROCESS-DEFERRALS.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-DEFERRALS.md)

Emit master-plan lines with **Model** on each step (see 01-authoring file).

## Track 19 — Membership / IAP / V4V

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 19.1 | Document store IAP vs web PayPal parity matrix (what mobile can sell). | Opus 4.8 | 560-iap-parity-matrix |
| 19.2 | Integrate RevenueCat or native StoreKit/Billing for subscription SKUs. | Opus 4.8 | 561-iap-sdk-integration |
| 19.3 | Server receipt validation endpoint contract (reuse or extend API). | Opus 4.8 | 562-receipt-validation-api |
| 19.4 | Membership gating UI mirrors web entitlement checks via `@podverse/helpers`. | Codex 5.3 | 563-membership-gating-ui |
| 19.5 | Restore purchases flow and account linking on login. | Opus 4.8 | 564-restore-purchases |
| 19.6 | V4V boost entry on full player (Track 11.14) with LNURL flow from web parity. | Opus 4.8 | 565-v4v-lnurl-flow |
| 19.7 | Document alpha/beta: IAP disabled or sandbox-only per Track 4 alpha app id. | Auto | 566-iap-alpha-sandbox |
| 19.8 | E2E: membership gate screenshot for locked content (mock entitlement). | Codex 5.3 | 567-e2e-membership-gate |

## Track 20 — F-Droid / FOSS flavor

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 20.1 | Define FOSS product flavor: no Google Play Services, no Firebase, no proprietary blobs. | Opus 4.8 | 570-foss-flavor-definition |
| 20.2 | UnifiedPush replaces FCM in FOSS flavor (cross-ref Track 14.6). | Opus 4.8 | 571-foss-unifiedpush |
| 20.3 | FOSS build reproducibility: document dependency audit checklist. | Codex 5.3 | 572-foss-reproducibility-audit |
| 20.4 | Prepare F-Droid metadata: summary, license, source URL, build recipe draft. | Codex 5.3 | 573-fdroid-metadata-draft |
| 20.5 | FOSS signing key policy separate from Play upload key. | Auto | 574-foss-signing-policy |
| 20.6 | Document IAP unavailable in FOSS flavor; link to web membership instead. | Auto | 575-foss-iap-unavailable |
| 20.7 | Submit to metaboost-registry or F-Droid request issue (operator step). | Auto | 576-fdroid-submission-operator |

## Track 21 — Explicit deferrals and post-v1 backlog

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 21.1 | Defer: Apple Watch standalone app (if Wear-only v1). | Auto | 580-defer-apple-watch |
| 21.2 | Defer: tvOS native app (Android TV first). | Auto | 581-defer-tvos |
| 21.3 | Defer: full management-web parity on mobile. | Auto | 582-defer-management-parity |
| 21.4 | Defer: clip authoring / upload from mobile. | Auto | 583-defer-clip-authoring |
| 21.5 | Defer: social features beyond share links. | Auto | 584-defer-social |
| 21.6 | Defer: offline playlist sync conflict resolution advanced cases. | Auto | 585-defer-offline-sync-advanced |
| 21.7 | Defer: widget / Live Activities / Dynamic Island v1. | Auto | 586-defer-widgets |
| 21.8 | Defer: CarPlay video (audio-only in car v1). | Auto | 587-defer-carplay-video |
| 21.9 | Link each deferral to GitHub issue placeholder `_TBD_` issue number. | Auto | 588-deferral-issue-links |
| 21.10 | Master plan appendix: deferrals table with rationale and revisit trigger. | Auto | 589-deferrals-appendix |

## Verification

- Tracks 19–21 complete; Detail IDs 560–589; Model on every step.
- FOSS flavor cross-references Tracks 14 and 20 consistently.
- Deferrals are explicit one-liners, not hidden scope cuts.
