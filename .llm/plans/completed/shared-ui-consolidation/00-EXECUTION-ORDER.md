# Execution order — Shared UI consolidation (Podverse)

## Phase order

1. [01-phase0-inventory-sweep.md](./01-phase0-inventory-sweep.md)
   — artifact: [00-INVENTORY.md](./00-INVENTORY.md)
2. [02-phase1-breadcrumbs-keyvalue.md](./02-phase1-breadcrumbs-keyvalue.md)
3. [03-phase2-button-unification.md](./03-phase2-button-unification.md)
4. [04-phase3-form-strategy.md](./04-phase3-form-strategy.md)
5. [05-phase4-card-alert-shells.md](./05-phase4-card-alert-shells.md)

## Why this order

- Inventory locks the map of duplication and prevents rework before extractions.
- Breadcrumbs and key-value layouts remove the most **page SCSS** churn with minimal API risk.
- Button unification establishes the pattern for **lifting web primitives** into `packages/ui`
  (including adding `@podverse/ui` to `apps/web` when needed).
- Form work is sequenced after Button because it is the largest API and regression surface.
- Card/alert shells come after primitives are settled so naming matches the shared design language.
