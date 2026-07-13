# 152-eas-pricing-note

**Master step:** 4.3
**Model (author + implement):** Auto
**Status:** ready

## Scope

- Document that EAS free tier may suffice for early internal builds; paid tier for higher concurrency
  / submit convenience — point to Expo pricing page (no hardcoded prices that rot).

## Acceptance criteria

- Short note in release docs with link to Expo EAS pricing
- Does not block free-tier local/dev-client work

## Verification

```bash
rg -n 'EAS|pricing|Expo' docs/operations/mobile/ apps/mobile/APPS-MOBILE.md 2>/dev/null || true
```
