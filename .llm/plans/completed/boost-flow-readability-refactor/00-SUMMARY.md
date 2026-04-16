# Boost Flow Readability Refactor

## Goal

Refactor Podverse boost flow code so developers can read a clear step-by-step flow, while preserving current behavior and keeping standards extensible beyond MB1.

## Core Invariants

- When MB1 MetaBoost is available/supported, MB1 flow is used instead of bLIP-0010 fallback.
- When MetaBoost is absent/unsupported, non-MB1 fallback behavior remains safe and functional.
- Unknown future standards do not crash the flow.

## Scope

- Decompose `useBoostSelection` and `useBoostPayments` into focused helper modules.
- Keep `BoostFormBase` as orchestrator, not the home of heavy branch logic.
- Keep `@podverse/v4v-metaboost` as the standard strategy boundary.
- Add a monorepo helper-consolidation track for repeated generic helpers (type guards and primitive parsers).
- Add explicit package-boundary review to determine whether reusable boost/metaboost logic should be moved between existing packages or split into a new shared core package.
- Add deployment-readiness checks for:
  - local + npm
  - local Docker only
  - local k8s
  - remote k8s

## Out of Scope

- Implementing new non-MB1 standards.
- Broad UI redesign.
- Metaboost backend contract changes.

## Deliverables

- Multi-phase implementation plan files.
- COPY-PASTA orchestration prompts.
- Explicit deployment validation phase and checklist.
- Dedicated helper-consolidation phase files under this same plan set, with migration waves and architecture-safe shared-module targets.
- Dedicated package-boundary/move decision files that evaluate and, if needed, plan package relocation/splitting for future React Native reuse.
