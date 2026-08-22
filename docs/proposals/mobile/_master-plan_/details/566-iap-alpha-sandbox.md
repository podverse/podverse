# 566-iap-alpha-sandbox

**Master step:** 19.7
**Model (author + implement):** Auto
**Status:** done

## Scope

Document that during **alpha / internal / pre-beta** testing, in-app purchases are **disabled or
sandbox-only** on the isolated `.next` app id (Track 4). No real charges occur on test tracks.

## Policy

- On the `.next` alpha/internal build, IAP is either **hidden** or wired to **store sandbox** only
  (StoreKit sandbox / Play license-tester), never live billing.
- Real membership purchase is enabled only when the app is promoted beyond internal testing — which,
  per the **publish hold**, does not happen until the operator finishes manual visual polish
  (master plan **Ship bar** § Publish hold, Track 4 store-safety, Track 22).
- Entitlement reading (member status, gating) may still be exercised against test/sandbox accounts.

## Acceptance criteria

- Alpha/internal builds never take real payment; IAP is disabled or sandbox-only.
- Explicitly tied to the publish hold and the `.next` app id isolation.

## Related

- IAP parity matrix (560); FOSS IAP-unavailable (575); Track 4 alpha app id; Track 22 release.

## Verification

- Doc-only; enforced by build/flavor config when IAP is wired (Track 19 implementation).
