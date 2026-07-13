# 067-rule-feature-requires-e2e

**Master step:** 5.8
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Add or extend abcmemory (`.cursor/rules/` or skill) so new mobile feature PRs include matching
  Maestro flow + screenshot when UI behavior changes.
- Align with existing **mobile-e2e-screenshots** skill.

## Acceptance criteria

- Rule/skill text states feature PRs need e2e + screenshot for UI changes
- Cross-link mobile-e2e-screenshots and mobile-master-plan-phasing

## Verification

```bash
rg -n 'feature.*e2e|Maestro|screenshot' .cursor/rules/ .cursor/skills/mobile-e2e-screenshots/
```
