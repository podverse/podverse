# 063-e2e-screenshot-capture-config

**Master step:** 5.4
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Configure Maestro `takeScreenshot` (or equivalent) on key hello-world steps.
- Screenshots land under `.artifacts/mobile-e2e-reports/` (wired with 5.5).

## Acceptance criteria

- Hello-world flow captures ≥1 screenshot
- Output path documented; not web `.artifacts/e2e-reports/`

## Web parity references

- [ui-e2e-screenshot-report](/.cursor/skills/ui-e2e-screenshot-report/SKILL.md)
- [mobile-e2e-screenshots](/.cursor/skills/mobile-e2e-screenshots/SKILL.md)

## Verification

```bash
rg -n 'takeScreenshot|screenshot' apps/mobile/e2e/
```
