# Podverse Mobile — Master Plan (Phase 5, native store IAP)

> **Not started.** Detail docs are authored just-in-time when the operator starts this phase.
> Phase index: [PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md)

## Scope

Native in-app purchase for membership on iOS and Android. Deliberately last: it is the step most
coupled to store review, and Phase 1 already shipped a working interim path.

**What already works (Phase 1, done):** membership gating UI shared with web via
`parseMembershipGateError` (19.4, 19.11), a real Membership screen (19.9), web-link checkout through
an in-app browser behind an isolated swap seam (19.10), an alpha/sandbox policy (19.7), and an E2E
membership-gate flow (19.8). Users can pay today — through the web checkout, not through the stores.

## Carried from Phase 1

| Step | Carried from | What                                                                         | Model  |
| ---- | ------------ | ---------------------------------------------------------------------------- | ------ |
| P5.1 | 19.2         | Integrate RevenueCat or native StoreKit / Play Billing for subscription SKUs | Opus 5 |
| P5.2 | 19.3         | Server receipt validation endpoint contract (reuse or extend API)            | Opus 5 |
| P5.3 | 19.5         | Restore purchases flow and account linking on login                          | Opus 5 |

The swap seam from 19.10 is the intended integration point — native IAP should replace the web-link
checkout behind that seam rather than adding a parallel path.

## Constraints carried forward

- **FOSS flavor has no IAP.** Phase 1 step 20.6 documented that the F-Droid build links to web
  membership instead; that must stay true.
- **Store parity matrix** (19.1, done) defines what mobile is allowed to sell.
- **Alpha/sandbox policy** (19.7, done) keeps IAP disabled or sandbox-only on the alpha app id.
- Interacts with [Phase 3 V4V](/docs/proposals/mobile/_master-plan_/phase-3/001-MASTER-PLAN-PHASE-3.md) —
  store policy treats boosts and subscriptions differently, so resolve both together.

## Detail ID band

**970–999.** Phase 1 IDs 561, 562, 564 were never written as files; reuse them only if you want
continuity with the Phase 1 step tables.

## Open questions to resolve before detailing

- RevenueCat versus direct StoreKit 2 / Play Billing — is a third-party dependency acceptable?
- Do store subscriptions and web PayPal subscriptions share one entitlement record server-side?
- What happens when a user has both an active store subscription and an active web subscription?
