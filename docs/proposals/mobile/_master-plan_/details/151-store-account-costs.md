# 151-store-account-costs

**Master step:** 4.2
**Model (author + implement):** Auto
**Status:** ready

## Scope

- Document Apple Developer Program (~$99/yr) and Google Play Console (~$25 one-time) in mobile
  release docs or APPS-MOBILE / runbook stub.

## Acceptance criteria

- Costs written once; linked from runbook (4.22) or APPS-MOBILE
- Notes separate `.next` app records still need these accounts

## Verification

```bash
rg -n 'Apple Developer|Google Play|\\$99|\\$25' docs/operations/mobile/ apps/mobile/APPS-MOBILE.md 2>/dev/null || true
```
