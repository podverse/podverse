# Web Form components → `@podverse/ui` — summary

**Status:** Active (plan only — execution is follow-on work).

## Objective

Move **all** components under [`apps/web/src/components/Form/`](../../../../apps/web/src/components/Form/)
into [`packages/ui`](../../../../packages/ui) so both **web** and **management-web** share one
implementation for the same control types. When visuals differ, **use the web app baseline**
(colors, spacing, borders, interaction) per
[`.cursor/rules/prefer-shared-ui-web-management.mdc`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc).

## In scope

| Source (web) | Notes |
| --- | --- |
| `Checkbox.tsx` | Labeled checkbox — reconcile with existing `CheckboxField` / bare `Checkbox` in ui |
| `RadioButton.tsx` | |
| `SwitchButton.tsx` | |
| `InlineForm.tsx` | |
| `SearchInput.tsx` | |
| `TextInput.tsx` | Rich field (eyebrow, info, errors, suffix/prefix, buttons) — not the same as ui `Input` |
| `TextInputNumber.tsx` | |
| `TextInputNumberIncrements.tsx` | |
| `TextInputHHMMSS.tsx` | |
| `TextArea.tsx` | Rich composite — **name collision** with ui primitive `TextArea` (see phase 01) |
| `TextCheckboxes.tsx` | Multi-checkbox group with optional eyebrow |

Associated SCSS today under `apps/web/src/styles/components/Form/*.module.scss` moves with components
into `packages/ui` (web visuals win).

## Out of scope (this plan set)

- **Feature-level forms** outside `components/Form/` (e.g. `AuthSignUpForm`, `PlaylistForm`,
  `BoostFormFields`) stay in apps; they **import** shared controls from `@podverse/ui` after
  migration.
- Implementing code in this directory — these files are the **plan**; execution uses the numbered
  prompts in [`COPY-PASTA.md`](./COPY-PASTA.md).

## Guardrails

- [`.cursor/rules/shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc) — no embedded
  user-facing copy in `packages/ui`; pass labels, `aria-*`, and helper text from apps.
- [`.cursor/skills/ui-component-promotion/SKILL.md`](../../../../.cursor/skills/ui-component-promotion/SKILL.md)
  — inventory → API → `packages/ui` → export → thin app usage.

## Related prior work

- [`.llm/plans/completed/shared-ui-component-consolidation/`](../../completed/shared-ui-component-consolidation/)
  — umbrella consolidation; phase notes already flagged web `Form/*.tsx` as medium-tier gaps.
