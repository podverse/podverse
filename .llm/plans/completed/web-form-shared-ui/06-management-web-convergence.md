# 06 — management-web convergence

## Prompt (Agent)

Execute **phase 06**: update `apps/management-web` so equivalent UX uses the **same** shared
components as web (e.g. labeled text fields → shared rich `TextInput` where appropriate); retain
`Input`/`Label` only when the simple primitive is intentionally correct; web styling already baked into
shared SCSS from earlier phases.

## Current patterns

Management-web already imports `Input`, `Label`, `FormStack`, `FormGroup`, `FormDropdown`, etc. from
`@podverse/ui`. Post-migration, prefer:

| Situation | Prefer |
| --- | --- |
| Single labeled field with helper/error text matching web | Shared **`TextInput`** (or **`FormTextArea`**) with props |
| Dense table cell boolean | Bare **`Checkbox`** or **`CheckboxField`** as today |
| Raw DB string field with minimal chrome | **`Input`** + **`Label`** acceptable if product agrees |

## Pages to review

- `apps/management-web/src/app/page.tsx` (login)
- Database create/edit row clients under `apps/management-web/src/app/(management)/database/`
- `apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx`
- New/edit user and admin flows using form stacks

## Styling rule

If a page’s layout fights shared components, **adjust management layout wrappers**, not the shared
component defaults — web baseline wins per product rule.

## i18n

All new labels/helpers continue to use management-web `t()` / `tc()` at call sites; never embed
management strings inside `packages/ui`.
