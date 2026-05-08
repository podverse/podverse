# 03 — Medium-risk convergence

## Prompt (Agent)

Execute **phase 03**: reconcile web implementations with existing `@podverse/ui` navigation and
button primitives. Prefer **web visual baseline** in shared SCSS (`appearance` / `variant`).

## Dropdown

- **Today**: web `Dropdown.tsx` composes `@podverse/ui` keyboard hook + local menu surface;
  `packages/ui` exposes `DropdownMenu`, items, link items.
- **Goal**: one of:
  1. Migrate web `Dropdown` to compose `DropdownMenu` from ui with the same external API for
     callers, or
  2. Add `SelectDropdown` (name TBD) in ui for “label + options + onChange” without embedding
     copy.
- **i18n**: option labels always from app.

## MoreButton

- **Goal**: shared `MoreActionsButton` (ellipsis) built on `DropdownMenu` + `IconButton`.
- **Web**: pass `menuItems` built with localized labels and handlers.

## NavArrowButton

- **Goal**: implement with `IconButton` from `@podverse/ui` + chevron icons; `ariaLabel` prop
  required (app passes `t(...)`).
- **Pagination**: web `Pagination.tsx` should import shared nav arrows once unified.

## NavBar

- **Management** already uses `@podverse/ui` `NavBar` with `appearance="web"`.
- **Web**: migrate from bespoke `NavBar.tsx` SCSS to ui `NavBar` slots (`brand`, `left`,
  `right`) while preserving:
  - search entry, account menu, media routes, feature flags.
- **Strategy**: incremental—first match dimensions/tokens, then move children into slots without
  behavior change.

## Pagination

- **Risk**: web numeric strip + arrow UX vs `packages/ui` `Pagination` API differs.
- **Steps**:
  1. Document prop mapping (`prevLabel` / `nextLabel` / `pageIndicatorLabel` / children slot).
  2. Extend ui `Pagination` to support web layout **or** document that web keeps local
     implementation and management adopts web layout via props—**pick one product story**.
  3. Update E2E if visible labels or roles change.

## Completion criteria

- No duplicate keyboard-navigation logic in web once ui composition covers it.
- Management-web pagination/database pages evaluated for using the same component as web after
  API alignment (see phase 05).
