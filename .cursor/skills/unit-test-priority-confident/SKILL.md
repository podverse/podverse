---
name: unit-test-priority-confident
description: Prioritize unit-test investments for confident (not bulletproof) coverage. Use when planning or implementing tests in Podverse.
version: 1.0.0
---

# Unit Test Priority - Confident Coverage

## Goal

Direct test effort to the highest-risk behavior first so coverage gains are meaningful and maintainable.

## Priority Order

1. Logic that a device flow is currently the only proof of. Extract it; the flow is both the least
   reliable coverage and the most expensive, so a unit test buys confidence and refunds time.
2. Auth/security logic (`apps/api/src/lib/auth`, rate-limit and token checks)
3. Parser/ingestion guardrails (`packages/parser`, feed spam/parse policy)
4. ORM business rules (`packages/orm/src/services`, especially membership/dedupe/stats constraints)
5. Value-transfer math (`packages/v4v-helpers`, `packages/v4v-metaboost`)
6. High-impact web utilities/hooks (`apps/web/src/utils`, non-trivial business hooks)

## Selection Rules

- Prefer pure/near-pure modules first.
- Prioritize modules with branchy business behavior over simple pass-through code.
- Cover invariants and boundary behavior before broad expansion.
- Add tests near changed code when touching critical logic.

## Confidence Target

"Confident" means:

- Happy path covered
- Key failure path covered
- Risky edge/boundary cases covered

It does not require full branch-permutation exhaustion.
