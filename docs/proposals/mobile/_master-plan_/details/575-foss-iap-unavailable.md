# 575-foss-iap-unavailable

**Master step:** 20.6
**Model (author + implement):** Auto
**Status:** done

## Scope

Document that **in-app purchases are unavailable in the FOSS flavor**. FOSS users manage membership
via the **web** instead; no store-billing code ships in FOSS artifacts.

## Policy

- Store billing / IAP SDK code (Track 19) is gated to the **playstore** flavor and must **not** ship
  in the FOSS artifact (keeps it free of proprietary billing SDKs).
- In the FOSS flavor, membership UI **links to web membership** rather than offering an in-app
  purchase.
- Entitlement **reading** (showing member status, gating content) may still work via the API in both
  flavors; only the **purchase** path is FOSS-unavailable.

## Acceptance criteria

- FOSS flavor has no IAP/billing SDK; membership CTA routes to web.
- Cross-linked from the flavor definition (570) and the IAP parity matrix (560).

## Related

- Deferrals appendix (589); **mobile-fdroid-flavors** skill § IAP.

## Verification

- Doc-only; enforced when the FOSS variant + billing gating are wired (Track 19 / 20).
