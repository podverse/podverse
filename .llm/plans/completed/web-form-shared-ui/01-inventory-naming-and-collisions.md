# 01 — Inventory, naming, and collisions

**Status:** Complete (inventory and naming locks recorded 2026-05-06).

## Prompt (Agent)

Execute **Web Form → shared UI — phase 01**: inventory every import of
`apps/web/src/components/Form/*`, document collisions with existing `@podverse/ui` exports (`Input`,
`TextArea`, `Checkbox`, `CheckboxField`), and lock export names for promoted components (especially the
rich textarea vs primitive `TextArea`). Deliver a short matrix in the phase file appendix; no product
behavior change unless documenting.

## Deliverables

- Grep-backed **import list** for all consumers (components, `app/`, modals, auth, boost, settings).
- **Export naming decisions** recorded below (adjust appendix after research if needed).
- **No code migration** in phase 01 unless fixing documentation only.

## Locked export names (`@podverse/ui`)

These names are fixed for phases 02–05 unless a later phase discovers a blocking conflict.

| Web file / symbol | Locked `@podverse/ui` export | Collision / note |
| --- | --- | --- |
| `TextInput.tsx` | **`TextInput`** | None — ui today exports `Input` only (bare primitive). |
| `TextArea.tsx` (rich) | **`FormTextArea`** | **Must not** reuse **`TextArea`** — that name stays the primitive `<textarea>` in `fieldPrimitives/TextArea.tsx`. |
| `Checkbox.tsx` | **`CheckboxField`** (preferred) | Extend **`CheckboxField`** with optional **`id`**, **`name`**, wrapper **`className`** so checkout/add-by-RSS explicit ids keep working; **`Checkbox`** stays the bare input for tables. If extension is incompatible with existing `CheckboxField` call sites, add **`LabeledCheckbox`** as the web markup export instead (phase 02 decides). |
| `RadioButton.tsx` | **`RadioButton`** | None. |
| `SwitchButton.tsx` | **`SwitchButton`** | None. |
| `InlineForm.tsx` | **`InlineForm`**, **`InlineFormInfo`**, **`InlineFormButtons`**, **`InlineFormFieldGroup`** | Four named exports from one module — promote together. |
| `SearchInput.tsx` | **`SearchInput`** | Composes **`TextInput`** internally; no naming clash. |
| `TextInputNumber.tsx` | **`TextInputNumber`** | None. |
| `TextInputNumberIncrements.tsx` | **`TextInputNumberIncrement`** (match existing component name) | Today exported as `TextInputNumberIncrement` from `TextInputNumberIncrements.tsx`; align export spelling with actual symbol when promoting. |
| `TextInputHHMMSS.tsx` | **`TextInputHHMMSS`** | None. |
| `TextCheckboxes.tsx` | **`TextCheckboxes`** | Keep identifier to reduce churn vs renaming to `CheckboxGroup`; distinct from **`CheckboxFieldList`** (layout-only stack). |

## Internal dependency graph (`components/Form/` only)

| Module | Imports sibling |
| --- | --- |
| `SearchInput.tsx` | `TextInput` |
| `TextInputNumber.tsx` | `TextInput` |
| `TextInput.tsx` | `TextInputNumberIncrement` from `TextInputNumberIncrements.tsx` |

## Naming collisions (reference vs `@podverse/ui`)

| Existing `@podverse/ui` | Web `components/Form/` | Resolution |
| --- | --- | --- |
| `Input` — bare `<input>` styling | `TextInput` — composite field | Keep both; add **`TextInput`** as new export (web implementation). |
| `TextArea` — bare `<textarea>` | `TextArea` — composite with eyebrow/info/spinner | Export rich component as **`FormTextArea`** only — do not overload primitive **`TextArea`**. |
| `Checkbox` — bare input | `Checkbox` — label + span label | See locked table: **`CheckboxField`** extension vs **`LabeledCheckbox`** fallback. |
| `CheckboxFieldList` — vertical stack layout | `TextCheckboxes` — multi-select values | Separate exports; **`TextCheckboxes`** kept as name. |

## Management-web baseline (for phase 06)

Today management-web uses `Input`, `Label`, `FormStack`, `FormGroup`, `FormDropdown` from
`@podverse/ui` (e.g. login page, database row create/edit). Note call sites for convergence: replace
manual `Label`+`Input` stacks with shared **`TextInput`** only where validation/helper UX should match
web.

## Appendix A — Consumer import inventory (grep 2026-05-06)

Counts are **apps/web** files importing from `components/Form/` (excluding self-imports inside `Form/`).

| Exported symbol | Consumers |
| --- | --- |
| **TextInput** | `AuthEmailChangeForm`, `AuthForgotPasswordForm`, `AuthResetPasswordForm`, `AuthSignUpForm`, `ModalAuthLogin`, `ModalClipCreated`, `ModalShare`, `ModalChangeEmail`, `ModalDeleteAccount`, `SettingsProfile`, `SettingsNotifications`, `ClipForm`, `PlaylistForm`, `BoostFormFields`, `AddByRSSAddFeedPageClient`, `SetPasswordPageClient` |
| **TextArea** | `BoostFormFields`, `PlaylistForm`, `SettingsProfile` |
| **Checkbox** | `CheckoutPageClient`, `AddByRSSAddFeedPageClient` |
| **RadioButton** | `CheckoutPageClient` |
| **SwitchButton** | `ListChannelSettings`, `SettingsNotifications` |
| **InlineForm** (+ **InlineFormInfo**, **InlineFormButtons**, **InlineFormFieldGroup**) | `SettingsNotifications` |
| **SearchInput** | `ItemTranscript`, `SearchPageListHeader` |
| **TextInputNumber** | `BoostFormFields` |
| **TextInputHHMMSS** | `ClipForm` |
| **TextCheckboxes** | `ModalDisclaimer` |

**Total external importing files:** 23 (plus 11 modules under `components/Form/`).

## Appendix B — SCSS modules (1:1 with components)

All under `apps/web/src/styles/components/Form/`:

`Checkbox.module.scss`, `InlineForm.module.scss`, `RadioButton.module.scss`, `SearchInput.module.scss`,
`SwitchButton.module.scss`, `TextArea.module.scss`, `TextCheckboxes.module.scss`, `TextInput.module.scss`,
`TextInputHHMMSS.module.scss`, `TextInputNumber.module.scss`,
`TextInputNumberIncrements.module.scss`.

Port alongside TSX in phases 02–04 (web visuals baseline).

## Appendix D — Promotion constraints (phase 02–03)

| Finding | Mitigation |
| --- | --- |
| `TextInputNumberIncrements.tsx` uses **`next-intl`** (`useTranslations('misc')`) for increment/decrement **`aria-label`**. | **`@podverse/ui` cannot import next-intl.** Replace with required props, e.g. `incrementAriaLabel` and `decrementAriaLabel`, wired at **`TextInput`** call sites (apps pass `t(...)`). |
| `TextInput.tsx` imports **`Button`** from `@podverse/ui`. | Inside `packages/ui`, use **relative** imports to `components/button/`, not the package self-alias. |

## Appendix C — web Form modules (source of truth paths)

| File | Role |
| --- | --- |
| `Checkbox.tsx` | Labeled single checkbox |
| `RadioButton.tsx` | Radio option row |
| `SwitchButton.tsx` | Toggle / switch pattern |
| `InlineForm.tsx` | Compact horizontal form row |
| `SearchInput.tsx` | Search field chrome |
| `TextInput.tsx` | Primary rich text field |
| `TextInputNumber.tsx` | Numeric field styling |
| `TextInputNumberIncrements.tsx` | +/- controls (used by TextInput when needed) |
| `TextInputHHMMSS.tsx` | Time segments |
| `TextArea.tsx` | Rich textarea |
| `TextCheckboxes.tsx` | Multi-checkbox list |
