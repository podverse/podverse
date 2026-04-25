---
name: e2e-report-order
description: Maintain E2E spec order for full reports and respect parameter order for specified runs.
version: 1.0.0
---


# E2E Report Order

Use this skill when working with E2E report ordering.

## Full report

The full E2E report (`make e2e_test_report`) produces HTML reports in `.artifacts/e2e-reports/<timestamp>/` with subdirectories `web/` and `management-web/`.

## Spec order files

- `makefiles/local/e2e-spec-order-web.txt` — one spec path per line for apps/web.
- `makefiles/local/e2e-spec-order-management-web.txt` — one spec path per line for apps/management-web.

**When adding a new E2E spec:** Add it to the appropriate order file in the **right conceptual place** (e.g. home specs first, then lists, then detail pages). Do not append at the end unless that is the right place.

**When removing a spec:** Remove its line from the order file.

## Specified runs

When running scoped reports via `SPEC` / `WEB_SPEC` / `MGMT_SPEC`, the Makefile sets `E2E_SPEC_ORDER` so the reporter reorders display to match parameter order. Do not sort or reorder spec lists in make commands.
