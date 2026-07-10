# 477-e2e-locale-switch

**Master step:** 17.8
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro/Detox flow: open settings, switch locale (e.g. en-US → es), navigate to Home, capture
  screenshot with localized string visible.
- Depends on Track 16 settings + Track 17 runtime.
- Interim implementation: `apps/mobile/e2e/locale-switch-home-smoke.yaml` relaunches with locale
  override and asserts localized Home copy until Track 16 settings picker lands.

## Acceptance criteria

- E2E spec under `apps/mobile/e2e/`
- Screenshot artifact path documented in **mobile-e2e-screenshots** skill

## Verification

```bash
make mobile_e2e_smoke
```
