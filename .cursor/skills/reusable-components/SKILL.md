---
name: reusable-components
description: Prefer shared UI components from @podverse/ui over app-local one-off components or page-specific SCSS wrappers when behavior is generic.
version: 1.0.0
---

# reusable-components

## When to use

- Building or refactoring UI in `apps/web` or `apps/management-web`.
- You see repeated `page.module.scss` patterns for headers, forms, table shells, badges, loading/error text, or action rows.

## Core rule

Use `@podverse/ui` first for generic UI behavior. Add app-local components only when the behavior is truly product-specific.

## Web-first convergence

When **web** (`apps/web`) and **management-web** both have a similar generic control (icon button, menu, table chrome, etc.):

- **Implement one shared primitive** in `@podverse/ui` instead of maintaining parallel app-local copies.
- When reconciling visual differences, **default to the web app’s existing style baseline** (tokens, spacing, borders) unless accessibility or product requirements dictate otherwise. Express differences via props (`appearance`, `variant`) on the shared component.

## i18n (shared UI)

- **Do not** bake user-visible strings (including `aria-label`, `title`, empty/loading copy)
  into `packages/ui`. Apps own localization (`next-intl`) and pass strings in via props or
  `children`.
- When you add or extend a shared component that needs copy, add the corresponding keys in
  `apps/web` / `apps/management-web` `i18n/originals/en-US.json` (and keep locales aligned per
  **`i18n-management`**).
- Follow the **`shared-ui-i18n`** workspace rule for details and review expectations.

## Prefer this order

1. Reuse existing exports from `@podverse/ui` (`Button`, `ActionLink`, `CopyToClipboardButton`, `RestrictedNotice`, `Table`, `Pagination`, `FormPrimaryActions`, **`Modal`** / **`Modal.Actions`** / **`Modal.Body`** (see **`modal-layout-contract`**), field primitives, `Alert`, `LoadingSpinner`, `StatusBadge`, `IconButton`, `DropdownMenu`, etc.).
2. If missing but generic, add a reusable component in `packages/ui/src/components/**` (or a shared hook in `packages/ui/src/hooks/**`) and export it from `packages/ui/src/index.ts`.
3. Use app-local components only for app shell or domain-specific behavior.

## Promotion rubric

| Question                                            | If yes →                           |
| --------------------------------------------------- | ---------------------------------- |
| Used in two apps or a foreseeable second consumer?  | `packages/ui`                      |
| Only strings or router differ?                      | App wrapper around a ui primitive  |
| Imports `next/*` or app-only config?                | App wrapper                        |
| Duplicates a ui component with a small style tweak? | Extend ui `variant` / `appearance` |

For cross-app extraction steps, use **`ui-component-promotion`**.

## App-local configured wrappers (same app, 2+ callsites)

When the **same** `@podverse/ui` usage appears in **two or more** places **within one app** (same props, same `next-intl` keys for `aria-label` / visible copy), extract a thin **client** component under `apps/<app>/src/components/**` that:

- Owns **`useTranslations`** (or other app-only wiring) and fixed conventions (e.g. `misc.loading` for list overlays).
- **Forwards** the remaining props to the shared primitive (`isLoading`, `message`, `className`, `size`, etc.).
- Does **not** embed strings in `packages/ui`; the wrapper stays in the app.

Prefer feature files importing that wrapper over repeating identical JSX at many callsites.

## Avoid

- **Bare** one-line re-exports in app code (for example `export { Button } from '@podverse/ui';`) with no i18n or behavior — those add no value.
- New page-specific SCSS utility classes that duplicate existing `@podverse/ui` behavior.
- Creating a new component in app code when a `@podverse/ui` primitive can compose the same UI **without** repeated identical configuration.
- Raw `<details>` / custom flex stacks with tight `gap` for collapsible **form** sections — use **`Accordion`** plus nested **`FormStack`** (`gap: var(--spacing-3xl)`) and `contentClassName` with `margin-top: var(--spacing-3xl)` on the accordion content panel so spacing matches sibling fields.

## Collapsible form sections

When a form has an optional or advanced block (embed builder, settings panels, etc.):

1. Use **`Accordion`** from `@podverse/ui` for the disclosure header and chevron.
2. Wrap fields inside **`FormStack`** so vertical rhythm matches the parent form.
3. Set **`contentClassName`** on the accordion to add `margin-top: var(--spacing-3xl)` between the summary and the first field.
4. Prefer **`FormGroup layout="inStack"`** or zero field margins when a control’s built-in bottom margin would stack with **`FormStack`** gap.
5. For compact numeric/text fields, use **`CompactNumericInput`** / **`CompactTextInput`** with **`eyebrowPlacement="field"`** so the label sits above the control (same rhythm as **`RadioButton`**), not inside the bordered input.

## management-web notes

- Forms should use `FormPrimaryActions` with cancel before primary in DOM order.
- Prefer `Alert`/`LoadingSpinner` for state messaging.
- Prefer `Table` + `Pagination` for list pages instead of bespoke table shells.
- Prefer `ActionLink` for create/edit/cancel/back link patterns instead of page-local `createButton`, `editLink`, `cancelLink`, and `backLink` classes.
- Prefer `CopyToClipboardButton` for copy interactions instead of page-local copied-state button implementations.
- Prefer `RestrictedNotice` for read-only/superuser-only explanatory blocks.
