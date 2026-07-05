# Plan 04 — Cursor rules and skills (standard tier)

**Steps:** 0.8, 0.11, 0.12, 0.15, 0.16
**Model:** Codex 5.3

## Detail references

- [008-rule-mobile-react-native](/docs/proposals/mobile/_master-plan_/details/008-rule-mobile-react-native.md)
- [011-skill-mobile-e2e-screenshots](/docs/proposals/mobile/_master-plan_/details/011-skill-mobile-e2e-screenshots.md)
- [012-skill-mobile-fdroid-flavors](/docs/proposals/mobile/_master-plan_/details/012-skill-mobile-fdroid-flavors.md)
- [015-skill-mobile-worktree-scope](/docs/proposals/mobile/_master-plan_/details/015-skill-mobile-worktree-scope.md)
- [016-abcmemory-update-checklist](/docs/proposals/mobile/_master-plan_/details/016-abcmemory-update-checklist.md)

## Tasks

1. **`.cursor/rules/mobile-react-native.mdc`** — Glob `apps/mobile/**`. RN boundaries: no Next, no
   `@podverse/ui`, no ORM; tier-5 consumer; link API client boundaries and playback skill.

2. **`.cursor/skills/mobile-e2e-screenshots/SKILL.md`** — Maestro/Detox screenshot reports under
   `.artifacts/mobile-e2e-reports/latest/`; not make Playwright targets; agent does not run tests.

3. **`.cursor/skills/mobile-fdroid-flavors/SKILL.md`** — FOSS vs playstore flavors, UnifiedPush vs FCM,
   deferral pointer to Track 20.

4. **`.cursor/skills/mobile-worktree-scope/SKILL.md`** — Parallel sessions per Track; use
   git-worktree-sibling; which tracks can run in parallel vs sequential (native vs JS).

5. **Abcmemory checklist (0.16)** — Add `.cursor/skills/mobile-abcmemory-checklist/SKILL.md` OR extend
   abcmemory skill with mobile section: when to update `.cursor/` vs `.llm/plans/`; abcremember vocabulary.

## Acceptance

- All five abcmemory artifacts committed under `.cursor/`.

## On completion

Mark steps **0.8, 0.11, 0.12, 0.15, 0.16** as `done`.
