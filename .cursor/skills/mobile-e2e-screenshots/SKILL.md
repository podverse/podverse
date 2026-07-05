---
name: mobile-e2e-screenshots
description: After React Native mobile UI changes, instruct the operator to run Maestro or Detox E2E with screenshot reports under .artifacts/mobile-e2e-reports/latest/. Not Playwright or make e2e_* targets.
---

# Mobile E2E screenshot reports

Use when you modify **visual or interactive UI** in `apps/mobile/src/**` or mobile E2E specs under
`apps/mobile/e2e/**`.

Mobile E2E uses **Maestro** or **Detox** — not Playwright. Do **not** suggest `make e2e_*` targets;
those are web and management-web only (see **e2e-run-with-make-only** rule).

## Operator verification (mobile UI changes)

Agents do **not** run E2E during implementation (same policy as web). Instruct the operator:

1. Pick the **narrowest** flow/spec that covers the changed screen (add or update specs when behavior
   changed).
2. Run the mobile E2E harness command defined in `apps/mobile` once Track 5 lands (e.g. Maestro
   `maestro test apps/mobile/e2e/<flow>.yaml` or Detox `npm run test:e2e -w apps/mobile`).
3. Tell the operator where to review screenshots **after they run the command**:
   - Primary: `.artifacts/mobile-e2e-reports/latest/index.html` (or platform subfolder when the
     harness defines one)
   - Also mention any timestamped path printed by the runner.

Report output lives under **`.artifacts/mobile-e2e-reports/`** — parallel to web
`.artifacts/e2e-reports/` but separate so mobile and web runs do not collide.

## Parity with web screenshot workflow

Mirror the operator-facing pattern from **ui-e2e-screenshot-report**:

- Narrowest scoped spec
- Fenced `bash` block at end of implementation response
- Expected report path under `.artifacts/mobile-e2e-reports/latest/`
- Agents write/update specs; operators run verification

## Response format

End mobile UI implementation responses with:

1. A fenced `bash` block with the exact Maestro/Detox command for the operator (from repo root when
   possible; use `-w apps/mobile` for npm scripts).
2. The expected report path under `.artifacts/mobile-e2e-reports/latest/`.

## When this skill does not apply

- Docs-only changes under `apps/mobile/*.md` with no RN source.
- Shared package-only changes with no mobile UI impact: follow **response-ending-make-verify**.
- Web or management-web UI: use **ui-e2e-screenshot-report** instead.

## Related

- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md) — testing section
- **mobile-master-plan-phasing** — Track 5 E2E harness (steps 060–072)
