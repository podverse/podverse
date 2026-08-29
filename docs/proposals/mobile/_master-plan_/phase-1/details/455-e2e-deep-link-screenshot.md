# 455-e2e-deep-link-screenshot

**Master step:** 15.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Maestro E2E flow that opens the app via a **test deep link** and screenshots the target screen,
  proving the 452 path map + 453 cold-start replay work on device.
- Use a custom-scheme URL (`podverse-next://podcast/<id_text>` or `.../more/settings`) for
  determinism; universal-link domain verification is operator/store-side and not asserted in E2E.
- Add `apps/mobile/e2e/deep-link-*.yaml` and register in the Maestro area/report list.

## Acceptance criteria

- Flow launches app from closed/backgrounded state via a deep link and lands on the expected screen
  (assert a stable testID from the target screen).
- Screenshot captured into the mobile E2E report (ios-phone + android-phone slots).
- Uses seeded/E2E-safe `id_text` (hermetic — no dependence on prod data).

## Web parity references

- `apps/mobile/e2e/locale-switch-home-smoke.yaml` (existing Maestro flow pattern).
- `apps/mobile/e2e/HOW-TO-RUN.md`.
- Skills: **mobile-e2e-screenshots**, **mobile-maestro-timeouts**.

## Verification

```bash
ls apps/mobile/e2e/deep-link-*.yaml
npm run mobile:e2e:test -- deep-link
```
