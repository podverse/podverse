# Phase 07 - Skill Files and Maintenance Loop

## Targets

- `.cursor/skills/unit-test-priority-confident/SKILL.md`
- `.cursor/skills/unit-test-design-no-overgranularity/SKILL.md`
- `.cursor/skills/unit-test-new-code-gate/SKILL.md`

## Intent

Create explicit local guidance so future unit-test work consistently targets important behavior with practical depth.

## Skill Content Requirements

1. **Priority skill**
   - Domain order for test investment (auth/security, parser, ORM, value-transfer logic, web business helpers).
   - How to decide first test targets in changed files.

2. **Design skill**
   - Behavior-first patterns.
   - Test-depth guardrails to avoid excessive matrix explosion.
   - Determinism requirements.

3. **New-code gate skill**
   - Expect tests for changed critical logic.
   - Define acceptable exceptions and required rationale.

## Verification

- Confirm skills exist and are readable.
- Confirm they do not conflict with existing repo rules.
