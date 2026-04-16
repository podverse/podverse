# 11 - Package Boundary Review and Move Decisions

## Objective

Review all existing packages related to boost/metaboost logic and decide whether any logic should be moved/split to better support cross-app reuse (including future React Native).

## Packages In Scope

- `packages/v4v-metaboost`
- `packages/v4v-btc-ln`
- `packages/v4v-helpers`
- `packages/helpers`
- `packages/helpers-validation`
- `packages/helpers-requests`
- current web-layer boost logic under `apps/web/src/components/Boost/**`

## Architecture Constraints

- Respect documented dependency tiers in `docs/architecture/ARCHITECTURE.md`.
- Avoid introducing lower-tier imports from higher-tier packages.
- Keep framework-agnostic core logic separate from React/UI adapters.

## Decision Areas

1. What stays in `v4v-metaboost` as protocol/standard domain logic.
2. What stays in `v4v-btc-ln` as Lightning transport/domain logic.
3. What belongs in `helpers` as generic utilities.
4. Whether to introduce a new shared package (for example `@podverse/boost-core`) vs extending existing packages.
5. Which app-layer logic remains in hooks as adapter-only behavior.

## Required Output

- A package-boundary decision matrix:
  - current location
  - recommended location
  - rationale
  - migration priority
- Explicit "move now" vs "defer" calls for each major logic area.
- Save/update the matrix at:
  - `.llm/plans/active/boost-flow-readability-refactor/DECISION-MATRIX.md`

## Acceptance Criteria

- Reuse-oriented package map is explicit and actionable.
- Decisions account for future React Native consumption.
- No proposed move violates tiering or build-order constraints.
