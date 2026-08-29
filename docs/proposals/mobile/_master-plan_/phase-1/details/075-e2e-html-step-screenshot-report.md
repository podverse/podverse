# 075-e2e-html-step-screenshot-report

**Master step:** 5.16
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Post-process Maestro screenshots into step/image HTML similar to web
  `scripts/e2e-html-steps-reporter.ts` operator UX.
- Canonical open path: `.artifacts/mobile-e2e-reports/latest/index.html`.

## Acceptance criteria

- `scripts/mobile/e2e-html-report.mjs` exists and is invoked from Make
- Flows keep `takeScreenshot` steps
- Skill documents latest index path

## Verification

```bash
test -f scripts/mobile/e2e-html-report.mjs
rg -n 'e2e-html-report|mobile-e2e-reports/latest' makefiles/local/Makefile.local.e2e.mk .cursor/skills/mobile-e2e-screenshots/SKILL.md
```
