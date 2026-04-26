---
name: unit-test-priority-confident
description: Prioritize unit-test investments for confident (not bulletproof) coverage. Use when planning or implementing tests in Podverse.
version: 1.0.0
---


# Unit Test Priority - Confident Coverage

## Goal

Direct test effort to the highest-risk behavior first so coverage gains are meaningful and maintainable.

## Priority Order

1. Auth/security logic (`apps/api/src/lib/auth`, rate-limit and token checks)
2. Parser/ingestion guardrails (`packages/parser`, feed spam/parse policy)
3. ORM business rules (`packages/orm/src/services`, especially membership/dedupe/stats constraints)
4. Value-transfer math (`packages/v4v-helpers`, `packages/v4v-metaboost`)
5. High-impact web utilities/hooks (`apps/web/src/utils`, non-trivial business hooks)

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
