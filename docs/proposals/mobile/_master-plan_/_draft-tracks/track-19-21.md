# Draft: Tracks 19, 20, 21 — membership, F-Droid, deferrals

Reference:
[DOCS-MOBILE-PROCESS-MEMBERSHIP-FDROID.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MEMBERSHIP-FDROID.md),
[DOCS-MOBILE-PROCESS-DEFERRALS.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-DEFERRALS.md)

## Track 19 — Membership / IAP / V4V

19.1. Document store IAP vs web PayPal parity matrix (what mobile can sell). Model: Opus 4.8. Detail: [560-iap-parity-matrix](/docs/proposals/mobile/_master-plan_/phase-1/details/560-iap-parity-matrix.md) — _TBD_
19.2. Integrate RevenueCat or native StoreKit/Billing for subscription SKUs. Model: Opus 4.8. Detail: [561-iap-sdk-integration](/docs/proposals/mobile/_master-plan_/phase-1/details/561-iap-sdk-integration.md) — _TBD_
19.3. Server receipt validation endpoint contract (reuse or extend API). Model: Opus 4.8. Detail: [562-receipt-validation-api](/docs/proposals/mobile/_master-plan_/phase-1/details/562-receipt-validation-api.md) — _TBD_
19.4. Membership gating UI mirrors web entitlement checks via `@podverse/helpers`. Model: Codex 5.3. Detail: [563-membership-gating-ui](/docs/proposals/mobile/_master-plan_/phase-1/details/563-membership-gating-ui.md) — _TBD_
19.5. Restore purchases flow and account linking on login. Model: Opus 4.8. Detail: [564-restore-purchases](/docs/proposals/mobile/_master-plan_/phase-1/details/564-restore-purchases.md) — _TBD_
19.6. V4V boost entry on full player (Track 11.14) with LNURL flow from web parity. Model: Opus 4.8. Detail: [565-v4v-lnurl-flow](/docs/proposals/mobile/_master-plan_/phase-1/details/565-v4v-lnurl-flow.md) — _TBD_
19.7. Document alpha/beta: IAP disabled or sandbox-only per Track 4 alpha app id. Model: Auto. Detail: [566-iap-alpha-sandbox](/docs/proposals/mobile/_master-plan_/phase-1/details/566-iap-alpha-sandbox.md) — _TBD_
19.8. E2E: membership gate screenshot for locked content (mock entitlement). Model: Codex 5.3. Detail: [567-e2e-membership-gate](/docs/proposals/mobile/_master-plan_/phase-1/details/567-e2e-membership-gate.md) — _TBD_

## Track 20 — F-Droid / FOSS flavor

20.1. Define FOSS product flavor: no Google Play Services, no Firebase, no proprietary blobs. Model: Opus 4.8. Detail: [570-foss-flavor-definition](/docs/proposals/mobile/_master-plan_/phase-1/details/570-foss-flavor-definition.md) — _TBD_
20.2. UnifiedPush replaces FCM in FOSS flavor (cross-ref Track 14.6). Model: Opus 4.8. Detail: [571-foss-unifiedpush](/docs/proposals/mobile/_master-plan_/phase-1/details/571-foss-unifiedpush.md) — _TBD_
20.3. FOSS build reproducibility: document dependency audit checklist. Model: Codex 5.3. Detail: [572-foss-reproducibility-audit](/docs/proposals/mobile/_master-plan_/phase-1/details/572-foss-reproducibility-audit.md) — _TBD_
20.4. Prepare F-Droid metadata: summary, license, source URL, build recipe draft. Model: Codex 5.3. Detail: [573-fdroid-metadata-draft](/docs/proposals/mobile/_master-plan_/phase-1/details/573-fdroid-metadata-draft.md) — _TBD_
20.5. FOSS signing key policy separate from Play upload key. Model: Auto. Detail: [574-foss-signing-policy](/docs/proposals/mobile/_master-plan_/phase-1/details/574-foss-signing-policy.md) — _TBD_
20.6. Document IAP unavailable in FOSS flavor; link to web membership instead. Model: Auto. Detail: [575-foss-iap-unavailable](/docs/proposals/mobile/_master-plan_/phase-1/details/575-foss-iap-unavailable.md) — _TBD_
20.7. Submit to metaboost-registry or F-Droid request issue (operator step). Model: Auto. Detail: [576-fdroid-submission-operator](/docs/proposals/mobile/_master-plan_/phase-1/details/576-fdroid-submission-operator.md) — _TBD_

## Track 21 — Explicit deferrals and post-v1 backlog

21.1. Defer: Apple Watch standalone app (if Wear-only v1). Model: Auto. Detail: [580-defer-apple-watch](/docs/proposals/mobile/_master-plan_/phase-1/details/580-defer-apple-watch.md) — _TBD_
21.2. Defer: tvOS native app (Android TV first). Model: Auto. Detail: [581-defer-tvos](/docs/proposals/mobile/_master-plan_/phase-1/details/581-defer-tvos.md) — _TBD_
21.3. Defer: full management-web parity on mobile. Model: Auto. Detail: [582-defer-management-parity](/docs/proposals/mobile/_master-plan_/phase-1/details/582-defer-management-parity.md) — _TBD_
21.4. Defer: clip authoring / upload from mobile. Model: Auto. Detail: [583-defer-clip-authoring](/docs/proposals/mobile/_master-plan_/phase-1/details/583-defer-clip-authoring.md) — _TBD_
21.5. Defer: social features beyond share links. Model: Auto. Detail: [584-defer-social](/docs/proposals/mobile/_master-plan_/phase-1/details/584-defer-social.md) — _TBD_
21.6. Defer: offline playlist sync conflict resolution advanced cases. Model: Auto. Detail: [585-defer-offline-sync-advanced](/docs/proposals/mobile/_master-plan_/phase-1/details/585-defer-offline-sync-advanced.md) — _TBD_
21.7. Defer: widget / Live Activities / Dynamic Island v1. Model: Auto. Detail: [586-defer-widgets](/docs/proposals/mobile/_master-plan_/phase-1/details/586-defer-widgets.md) — _TBD_
21.8. Defer: CarPlay video (audio-only in car v1). Model: Auto. Detail: [587-defer-carplay-video](/docs/proposals/mobile/_master-plan_/phase-1/details/587-defer-carplay-video.md) — _TBD_
21.9. Link each deferral to GitHub issue placeholder `_TBD_` issue number. Model: Auto. Detail: [588-deferral-issue-links](/docs/proposals/mobile/_master-plan_/phase-1/details/588-deferral-issue-links.md) — _TBD_
21.10. Master plan appendix: deferrals table with rationale and revisit trigger. Model: Auto. Detail: [589-deferrals-appendix](/docs/proposals/mobile/_master-plan_/phase-1/details/589-deferrals-appendix.md) — _TBD_
