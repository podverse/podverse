---
description: "Converted from no-runtime-change-schema-phase.mdc"
---
# No Runtime Changes During Schema-Only Trust Phase

When implementing a **schema-only** trust/entitlement foundation:

## Required

- Add forward-only migrations, constraints, and backfill rows.
- Add ORM entities/relations and helper constants/types.
- Update migration bundle wiring and expected migration markers.

## Prohibited

- Do not add or modify runtime auth/capability gating behavior.
- Do not add controller/route allow-deny checks.
- Do not expose new trust/override fields in API responses.
- Do not alter web UX flows for blocked actions in schema-only phase.

## Intent

Schema-only phases are for data-model groundwork. Runtime behavior must be introduced only in a
separate rollout phase with dedicated tests.
