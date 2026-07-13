# 062-e2e-hello-world-flow

**Master step:** 5.3
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Add Maestro flow `apps/mobile/e2e/hello-world.yaml` that launches the app and asserts the hello-world
  title / visible branded text from Track 3.
- Target canonical devices: iOS `"iPhone 17 Pro"`, Android `Pixel_6_Pro_API_33` (document in flow
  comments / APPS-MOBILE).

## Acceptance criteria

- Flow asserts app launch + hello-world visible content
- Runnable via Makefile / documented Maestro CLI from monorepo root
- No Playwright

## Web parity references

- Hello-world screen under `apps/mobile/src/screens/`
- [mobile-ios-simulator](/.cursor/rules/mobile-ios-simulator.mdc)

## Verification

```bash
test -f apps/mobile/e2e/hello-world.yaml
# Operator: make mobile_e2e_test_report_spec SPEC=hello-world (after 5.6)
```
