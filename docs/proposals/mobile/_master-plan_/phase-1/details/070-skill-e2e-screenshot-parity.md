# 070-skill-e2e-screenshot-parity

**Master step:** 5.11
**Model (author + implement):** Auto
**Status:** done

## Scope

- Update `.cursor/skills/mobile-e2e-screenshots/SKILL.md` to point at real Make targets and
  Maestro flows once 5.6 lands (replace "once Track 5 lands" placeholders).

## Acceptance criteria

- Skill references `make mobile_e2e_test_report_spec` and `.artifacts/mobile-e2e-reports/latest/`
- Still forbids Playwright / `make e2e_*` for mobile

## Verification

```bash
rg -n 'mobile_e2e_test_report_spec|mobile-e2e-reports' .cursor/skills/mobile-e2e-screenshots/SKILL.md
```
