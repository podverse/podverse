# 01 — Contract, rules, and skill

## Rules

- Add [`.cursor/rules/shared-ui-i18n.mdc`](../../../.cursor/rules/shared-ui-i18n.mdc) (globs
  `packages/ui/**`, shared UI app paths) stating: no user-facing English defaults; apps pass
  localized strings; a11y labels are localized like visible text.
- Extend [`.cursor/rules/prefer-shared-ui-web-management.mdc`](../../../.cursor/rules/prefer-shared-ui-web-management.mdc)
  with a short i18n bullet pointing to that rule.
- Optional: one-line cross-link in [`.cursor/rules/i18n-management.mdc`](../../../.cursor/rules/i18n-management.mdc)
  under a “Shared UI” note.

## Skill

- Update [`.cursor/skills/reusable-components/SKILL.md`](../../../.cursor/skills/reusable-components/SKILL.md):
  - New section “i18n (shared UI)”: never hardcode user strings in `packages/ui`; use props;
    add keys in `apps/*/i18n/originals/en-US.json` when introducing copy.

## Done when

- Rules and skill render the contract obvious to future PRs.
