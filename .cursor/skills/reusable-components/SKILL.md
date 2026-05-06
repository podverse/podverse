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

## Prefer this order

1. Reuse existing exports from `@podverse/ui` (`Button`, `ActionLink`, `CopyToClipboardButton`, `RestrictedNotice`, `Table`, `Pagination`, `FormPrimaryActions`, field primitives, `Alert`, `LoadingText`, `StatusBadge`, etc.).
2. If missing but generic, add a reusable component in `packages/ui/src/components/**` and export it from `packages/ui/src/index.ts`.
3. Use app-local components only for app shell or domain-specific behavior.

## Avoid

- One-line re-export wrappers in app code (for example `export { Button } from '@podverse/ui';`).
- New page-specific SCSS utility classes that duplicate existing `@podverse/ui` behavior.
- Creating a new component in app code when a `@podverse/ui` primitive can compose the same UI.

## management-web notes

- Forms should use `FormPrimaryActions` with cancel before primary in DOM order.
- Prefer `Alert`/`LoadingText` for state messaging.
- Prefer `Table` + `Pagination` for list pages instead of bespoke table shells.
- Prefer `ActionLink` for create/edit/cancel/back link patterns instead of page-local `createButton`, `editLink`, `cancelLink`, and `backLink` classes.
- Prefer `CopyToClipboardButton` for copy interactions instead of page-local copied-state button implementations.
- Prefer `RestrictedNotice` for read-only/superuser-only explanatory blocks.
