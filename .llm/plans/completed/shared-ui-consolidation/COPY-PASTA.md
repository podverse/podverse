# COPY-PASTA prompts — Shared UI consolidation (Podverse)

Use these prompts **one at a time** in order. After each phase completes, mark it done here and
move the completed numbered file per **plan-completion** / **plan-execution-completion-tracking**
rules.

## Prompt 1 — Phase 0 inventory

**Completed.** Artifact: [00-INVENTORY.md](./00-INVENTORY.md). Archived plan:
[01-phase0-inventory-sweep.md](./01-phase0-inventory-sweep.md).

## Prompt 2 — Phase 1 breadcrumbs + key-value

**Completed.** Added `Breadcrumbs`, `DescriptionList`, and `DescriptionListRow` in `@podverse/ui` and
migrated management-web routes. Archived plan:
[02-phase1-breadcrumbs-keyvalue.md](./02-phase1-breadcrumbs-keyvalue.md).

## Prompt 3 — Phase 2 Button unification

**Completed.** Canonical `Button` lives in `@podverse/ui`; web re-exports from `apps/web` shim;
management-web imports `@podverse/ui` (removed local `components/ui/Button`). Archived plan:
[03-phase2-button-unification.md](./03-phase2-button-unification.md).

## Prompt 4 — Phase 3 Form strategy

**Completed.** **Strategy A:** thin primitives (`Input`, `Select`, `TextArea`, `Label`, `FieldError`,
`fieldPrimitiveClasses`) in `@podverse/ui`; management-web migrated on login, settings, and feed
flag-status; `FormInput` / `FormLabel` are re-exports. Documented in [00-INVENTORY.md](./00-INVENTORY.md).
Archived plan:
[04-phase3-form-strategy.md](./04-phase3-form-strategy.md).

## Prompt 5 — Phase 4 Card / Alert / shells

**Completed.** Added `Card`, `Alert`, `CenterContainer`, and `LoadingText` to `@podverse/ui`; migrated
management-web (`page.tsx`, flag-status, workers, settings); removed local `components/ui` copies.
Archived plan:
[05-phase4-card-alert-shells.md](./05-phase4-card-alert-shells.md).
