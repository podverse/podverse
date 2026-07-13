# 065-makefile-mobile-e2e-targets

**Master step:** 5.6
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Add root Make targets: `mobile_e2e_test` and `mobile_e2e_test_report_spec` (SPEC=flow name).
- Targets wrap Maestro; do **not** reuse Playwright `e2e_test_*` web targets.
- Prefer `makefiles/` include pattern used by existing Make files.

## Acceptance criteria

- `make mobile_e2e_test` and `make mobile_e2e_test_report_spec SPEC=hello-world` documented
- Failures print clear Maestro install / simulator boot hints
- Never suggest `make e2e_*` for mobile

## Web parity references

- Web: `make e2e_test_web_report_spec` (do not conflate)
- [e2e-run-with-make-only](/.cursor/rules/e2e-run-with-make-only.mdc) — web only

## Verification

```bash
rg -n 'mobile_e2e_test' Makefile makefiles/ 2>/dev/null || rg -n 'mobile_e2e_test' makefiles
```
