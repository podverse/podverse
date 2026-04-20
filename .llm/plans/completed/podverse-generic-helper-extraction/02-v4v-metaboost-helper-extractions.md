# Podverse Generic Helper Extraction - 02 V4V Metaboost

## Scope
Extract high-confidence generic helpers from `packages/v4v-metaboost/src` into shared helper packages introduced in Phase 1.

## Primary Files
- `packages/v4v-metaboost/src/publicConversion.ts`
- `packages/v4v-metaboost/src/mbV1FetchCapability.ts`
- `packages/v4v-metaboost/src/mbrssV1FetchCapability.ts`
- `packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.ts`

## Extraction Mapping

### 1) `publicConversion.ts`
Move generic helpers to shared packages:
- `parseNonEmptyString` -> `@podverse/helpers`
- `parseRequiredNumber` -> `@podverse/helpers` (`parseFiniteNumber` or assert equivalent)
- URL `normalizeUrl` core validation path -> `@podverse/helpers-validation` primitive
- Keep request/result-specific orchestration local.

Keep local:
- Error message construction and API response interpretation that is specific to public conversion endpoint.

### 2) `mbV1FetchCapability.ts` and `mbrssV1FetchCapability.ts`
Unify duplicate URL helper logic:
- `isValidHttpUrlString`
- `normalizeCapabilityUrl`

Action:
- Replace both with imports from shared URL primitive.
- Keep endpoint-specific parse logic local.

### 3) `metaBoostCapabilityParseThresholdContext.ts`
Move generic parse helpers where generic:
- `parseOptionalNonEmptyString` -> shared primitive.
- `parseOptionalHttpUrl` -> URL parse primitive + local formatting if needed.
- `parseOptionalNonNegativeInteger` can remain local unless used elsewhere.

## Candidate Follow-up (Only If Zero Risk)
- Normalize uppercase currency code helper to shared primitive if all callsites preserve semantics.

## Detailed Steps
1. Replace local helper declarations with imports from shared packages.
2. Update imports using package boundaries:
   - isomorphic primitives from `@podverse/helpers`
   - URL validation parse from `@podverse/helpers-validation`
3. Remove unused local helper code.
4. Ensure error strings and branching semantics remain unchanged.

## Risks
- URL normalization behavior (trailing slash/canonicalization) must stay equivalent.
- Do not accidentally loosen strict endpoint schema checks.
- Currency normalization has subtle semantic differences; avoid forcing one behavior across contexts without proof.

## Acceptance Criteria
- Duplicate URL helper implementations are removed from mb-v1 and mbrss-v1 capability files.
- `publicConversion.ts` no longer defines generic parse primitives inline.
- All touched `v4v-metaboost` unit tests continue to pass.

## Verification
Run from monorepo root:

```bash
npm run build -w packages/v4v-metaboost
```

```bash
npm run lint -w packages/v4v-metaboost
```

```bash
npm run test -w packages/v4v-metaboost
```
