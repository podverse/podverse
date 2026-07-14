# 168-ota-update-policy

**Master step:** 4.19
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Document OTA: EAS Update for **JS-only** fixes; native/module changes (including media engine,
  CarPlay) require store build.
- Policy lives in runbook + APPS-MOBILE.

## Acceptance criteria

- Clear JS vs native boundary
- No OTA for native ABI / module changes

## Verification

```bash
rg -n 'EAS Update|OTA|JS-only' docs/operations/mobile/ apps/mobile/APPS-MOBILE.md
```
