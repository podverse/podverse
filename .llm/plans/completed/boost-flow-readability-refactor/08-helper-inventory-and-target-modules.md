# 08 - Helper Inventory and Target Modules

## Objective

Create a concrete inventory of duplicate generic helper patterns and map each to a target shared module.

## Initial Pattern Buckets

1. Object/record guards:
   - `isObject`, `isRecord`, and inline `typeof value === 'object' && value !== null`.
2. Unknown-property reads:
   - `Object.getOwnPropertyDescriptor(...)?` patterns.
3. String coercion/parsing:
   - non-empty trimmed string helpers with `null`/`undefined` variants.
4. Number coercion/parsing:
   - positive finite checks and unknown-to-number guards.

## Candidate Target Modules

- Primary target: `packages/helpers/src/lib/` in `@podverse/helpers`.
- Candidate files (new or expanded):
  - `packages/helpers/src/lib/guards.ts`
  - `packages/helpers/src/lib/record.ts` (expanded for unknown-safe own-property read)
  - `packages/helpers/src/lib/primitives.ts` (string/number coercion helpers)
- Export through `packages/helpers/src/index.ts`.

## Migration Safety Notes

- Keep separate helpers where semantics differ:
  - plain object vs object-like (array-inclusive) guard
  - strict string-only vs `String(value)` coercion
  - finite-number check vs non-NaN check
- Do not force semantic unification when call sites intentionally differ.

## Scope of Audit Pass

- Scan `packages/*` and `apps/*` source (excluding dist/build output).
- Focus on helper patterns that are generic and repeated, not domain-specific validation.

## Acceptance Criteria

- Inventory file (or section in implementation PR/notes) lists each migrated pattern and mapped destination helper.
- Each destination helper has clear naming that communicates semantics.
