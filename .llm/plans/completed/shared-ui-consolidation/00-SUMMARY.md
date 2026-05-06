# Summary — Shared UI consolidation (Podverse web + management-web)

## Objective

Align **generic React UI** across `apps/web` and `apps/management-web` by promoting reusable
components into `@podverse/ui`, while keeping **product-specific UX** (podcast, track, media
player, etc.) in `apps/web`.

## Background

- **Tokens** already live in `packages/ui` SCSS; both apps consume them (web often via `@forward`
  shims under `apps/web/src/styles/`).
- **Components** are fragmented: `apps/web` hosts rich local primitives (`Button`, `Form/*`);
  `management-web` duplicates thinner versions under `src/components/ui/` and repeats many
  patterns in `page.module.scss` (breadcrumbs, dl/key-value grids).

## Scope of this plan set

- Inventory duplication and map candidates to shared components.
- Extract low-coupling layout/presentation pieces first (breadcrumbs, description lists).
- Unify `Button` by lifting the canonical implementation into `packages/ui`.
- Decide and execute a **form primitive strategy** (thin primitives vs gradual lift of web inputs).
- Consolidate generic shells (card/alert/loading) where naming and styling align.

## Explicit non-goals

- Moving podcast/track/player or other domain-specific UI from `apps/web`.
- Rewriting every management page in one PR—work is phased with verification gates.

## Planned outputs

- Written inventory (patterns → files → proposed component): [00-INVENTORY.md](./00-INVENTORY.md).
- New or relocated components in `packages/ui` with exports from `packages/ui/src/index.ts`.
- `apps/web` gains an explicit `@podverse/ui` workspace dependency when it imports React exports.
- Reduced duplicated SCSS under `apps/management-web` app routes.
- Targeted E2E/report commands documented per phase.

## Plan files

1. [01-phase0-inventory-sweep.md](./01-phase0-inventory-sweep.md)
2. [02-phase1-breadcrumbs-keyvalue.md](./02-phase1-breadcrumbs-keyvalue.md)
3. [03-phase2-button-unification.md](./03-phase2-button-unification.md)
4. [04-phase3-form-strategy.md](./04-phase3-form-strategy.md)
5. [05-phase4-card-alert-shells.md](./05-phase4-card-alert-shells.md)
