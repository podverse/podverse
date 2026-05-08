# 02 — Low-risk extractions

## Prompt (Agent)

Execute **phase 02**: add or extend `@podverse/ui` primitives for Accordion, Callout, CTA message
shell, PopoverIcon, VirtualizedList, and loading overlay foundation. Wire `apps/web` through thin
wrappers only where Next or copy is required. Export new symbols from
[`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts).

## Accordion (fix spelling at API boundary: `Accordion`)

- **Source**: `apps/web/src/components/Accordian/*`
- **Shared**: presentational `<details>` / disclosure with optional controlled mode.
- **Props**: `header: ReactNode`, `children`, `className`, optional `defaultOpen`, `onToggle`.
- **Tests**: `packages/ui` Vitest for open/close and keyboard if applicable.
- **Web**: re-export or import from `@podverse/ui`; keep domain variants in web if they embed
  product copy.

## Callout

- **Source**: `apps/web/src/components/Callout/Callout.tsx` + SCSS.
- **Shared**: bordered/toned container; children only.
- **i18n**: none inside ui.

## CallToActionMessage (shell)

- **Source**: `apps/web/src/components/CallToActionMessage/*`
- **Shared**: layout for message + primary action slot (not membership-specific).
- **Web wrapper**: supplies `t(...)`, router navigation, feature flags.

## PopoverIcon

- **Source**: `apps/web/src/components/PopoverIcon/*`
- **Shared**: icon trigger + popover/tooltip positioning; `ariaLabel` and body text via props
  from app (see `shared-ui-i18n`).

## VirtualizedList

- **Source**: `apps/web/src/components/VirtualizedList/VirtualizedList.tsx`
- **Shared**: thin wrapper around `react-virtuoso` (document peer dependency in `packages/ui`
  `package.json` if not already present).
- **Do not** import web helpers inside ui.

## Loading — InlineSpinner + overlay

- **Existing**: `packages/ui/src/components/layout/InlineSpinner/`
- **Add** (if product needs): `LoadingOverlay` — fixed/absolute overlay, optional message prop
  (string from app), focus management policy documented (trap vs none).

## Completion criteria

- No English defaults for user-visible strings in new ui components.
- Storybook or unit tests added per [`storybook-component-docs`](../../../../packages/ui) if
  that is the repo norm for new primitives (follow existing package patterns).
