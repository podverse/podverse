# Shared Modal in `@podverse/ui`

## Outcome

Promote the Podverse web `Modal` primitive into [`packages/ui`](../../../../packages/ui), migrate `apps/web` to import it from `@podverse/ui`, and wrap management-web confirmation flows in the same overlay modal shell (replacing inline `role="dialog"` + `ConfirmPanel` patterns).

## Context

- **Modal** now lives in [`packages/ui/src/components/layout/Modal/Modal.tsx`](../../../../packages/ui/src/components/layout/Modal/Modal.tsx); apps pass localized close labels via props per shared-ui i18n policy.
- Management-web today: six pages use an in-flow bordered [`ConfirmPanel`](../../../../packages/ui/src/components/layout/ConfirmPanel/ConfirmPanel.tsx) inside `<div role="dialog">`—not a fullscreen overlay like web.

## Non-Goals

- Focus trap, Escape-to-close, or React portal (parity with current web `Modal` unless explicitly added later).

## Related Rules / Skills

- [`.cursor/rules/prefer-shared-ui-web-management.mdc`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc)
- [`.cursor/rules/shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc)
- [`.cursor/skills/ui-component-promotion/SKILL.md`](../../../../.cursor/skills/ui-component-promotion/SKILL.md)
