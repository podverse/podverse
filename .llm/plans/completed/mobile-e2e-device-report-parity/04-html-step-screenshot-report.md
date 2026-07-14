# Plan 04 — Web-parity HTML step/screenshot report

Read detail [075-e2e-html-step-screenshot-report](/docs/proposals/mobile/_master-plan_/details/075-e2e-html-step-screenshot-report.md).

## Work

1. Add `scripts/mobile/e2e-html-report.mjs` to assemble step/screenshot `index.html`.
2. Wire Make to run post-processor after Maestro; keep `latest` symlink.
3. Update `mobile-e2e-screenshots` skill + e2e README.

## Done when

```bash
test -f scripts/mobile/e2e-html-report.mjs
rg -n 'e2e-html-report' makefiles/local/Makefile.local.e2e.mk
```
