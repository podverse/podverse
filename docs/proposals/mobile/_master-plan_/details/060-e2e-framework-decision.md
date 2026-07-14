# 060-e2e-framework-decision

**Master step:** 5.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Lock mobile E2E framework for next-gen app: **Maestro** (chosen) vs Detox.
- Update master plan Open decisions table to record the choice.
- Detox remains documented as rejected for v1 (higher native wiring cost; Maestro YAML fits Expo).

## Acceptance criteria

- Open decision row "E2E framework" shows Maestro as **chosen** (not only default)
- Detail and phase `00-SUMMARY.md` state Maestro
- No Detox dependencies added to `apps/mobile/package.json` in this phase

## Web parity references

- [DOCS-MOBILE-PROCESS-ROADMAP.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-ROADMAP.md)
- [mobile-e2e-screenshots](/.cursor/skills/mobile-e2e-screenshots/SKILL.md)

## Verification

```bash
rg -n 'Maestro|Detox|E2E framework' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md .llm/plans/active/mobile-pg3-ci-e2e/00-SUMMARY.md
```
