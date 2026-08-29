# 560-iap-parity-matrix

**Master step:** 19.1
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

Document the **store-IAP vs web-PayPal parity matrix**: what the mobile app is allowed to sell
in-app per store policy, and what stays web-only. This frames Track 19 (19.2–19.8) and the FOSS
IAP-unavailable position (575).

## Parity matrix

| Capability                            | Web (PayPal) | iOS (App Store)                                                       | Android (Play)               | FOSS flavor          |
| ------------------------------------- | ------------ | --------------------------------------------------------------------- | ---------------------------- | -------------------- |
| Buy/renew membership                  | ✅ PayPal    | ⚠️ **must** use StoreKit IAP for digital membership                   | ⚠️ **must** use Play Billing | ❌ link to web (575) |
| Read entitlement / show member status | ✅           | ✅ (API)                                                              | ✅ (API)                     | ✅ (API)             |
| Restore purchases                     | n/a          | ✅ StoreKit restore (564)                                             | ✅ Play restore (564)        | n/a                  |
| V4V boost (LNURL)                     | ✅           | policy-dependent (not a "digital good" sale) — track separately (565) | policy-dependent (565)       | ✅ if enabled        |

## Architecture / policy notes

- Apple and Google require **their** billing for in-app digital membership; PayPal cannot be used
  in-app for that. Server receipt validation (562) reconciles store purchases with the account.
- Entitlement **reading** uses the shared API/`@podverse/helpers` checks — available in all flavors.
- **V4V boosts** are value-for-value payments, not a store "digital good" sale; treat their store
  compliance separately (565) and do not assume they can be an in-app IAP.
- **Publish hold:** IAP is disabled/sandbox-only until the operator finishes manual polish and the
  app leaves the internal test track (see 566 and master plan **Ship bar** § Publish hold).

## Acceptance criteria

- Matrix states, per surface, what can be sold in-app vs web-only, including FOSS.
- Cross-links: SDK integration (561), receipt validation (562), gating UI (563), restore (564),
  V4V (565), alpha sandbox (566), FOSS unavailability (575).

## Web parity references

- Web membership / PayPal flow; `@podverse/helpers` entitlement checks.

## Verification

- Doc-only.
