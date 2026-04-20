# Podverse Generic Helper Extraction - 05 Parser Parser Mapping ORM

## Scope
Evaluate and extract only high-confidence generic helpers from parser, parser-mapping, and orm runtime paths.

## Primary Files
- `packages/parser-mapping/src/addByRSS/cacheMaps.ts`
- `packages/orm/src/lib/redactForLog.ts`
- `packages/orm/src/lib/filterImageDtosByHighestWidth.ts`

## Extraction Policy For This Area
- Move helpers only when they are generic and not tightly coupled to parser/orm domain types.
- If a helper is domain-specific, keep it local and document as intentionally local.

## Candidate Decisions

### 1) `buildCacheMaps` (`parser-mapping`)
Decision:
- Keep local unless immediate cross-package consumers exist.

Reason:
- Strongly tied to Add-by-RSS mapping structures.

### 2) `redactForLog` (`orm`)
Decision:
- Candidate for move to `@podverse/helpers-backend` if shape remains generic key redaction.

Guardrail:
- Preserve existing redaction key behavior and output format.

### 3) `filterImageDtosByHighestWidth` (`orm`)
Decision:
- Keep local unless a second clear non-ORM consumer appears.

Reason:
- Depends on DTO-specific semantics despite generic-looking reduction logic.

## Detailed Steps
1. Review helper signatures for hidden domain coupling.
2. Move only approved generic helper(s) with minimal API surface.
3. Update imports and remove local duplicate declarations when moved.
4. Record intentionally-local decisions in comments or plan notes.

## Risks
- Over-generalizing domain helpers increases abstraction cost and weakens local readability.
- Moving DTO-bound transforms may create leaky helper APIs.

## Acceptance Criteria
- At least one clear generic backend helper is extracted if zero-risk (`redactForLog` preferred).
- Domain-heavy parser/mapping helpers remain local with explicit rationale.
- No behavior changes in parser/orm runtime logic.

## Verification
Run from monorepo root:

```bash
npm run build -w packages/parser-mapping
```

```bash
npm run build -w packages/orm
```

```bash
npm run lint -w packages/parser-mapping && npm run lint -w packages/orm
```
