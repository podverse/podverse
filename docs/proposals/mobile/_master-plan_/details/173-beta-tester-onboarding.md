# 173-beta-tester-onboarding

**Master step:** 4.24
**Model (author + implement):** Auto
**Status:** ready

## Scope

- Short doc for next-gen beta testers: TestFlight / Play internal links placeholders, what app
  name to install ("Podverse Next"), not production Podverse.

## Acceptance criteria

- Doc exists under docs/operations/mobile/ or APPS-MOBILE
- Placeholders for links clearly marked

## Verification

```bash
rg -n 'TestFlight|beta|Podverse Next' docs/operations/mobile/ apps/mobile/APPS-MOBILE.md
```
