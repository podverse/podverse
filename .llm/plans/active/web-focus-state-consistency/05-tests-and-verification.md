# 05 — E2E

## Deliverables

- `apps/web/e2e/focus-states.spec.ts`: navigate to an episode (via `/episodes` first link), dismiss dev
  modal, keyboard-focus checks / screenshots for key chrome.
- `makefiles/local/e2e-spec-order-web.txt`: add spec path.

## Verify

```bash
make e2e_test_web_report_spec SPEC=e2e/focus-states.spec.ts
```
