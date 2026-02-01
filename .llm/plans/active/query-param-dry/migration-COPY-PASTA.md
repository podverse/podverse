# Query Param DRY Refactor - Copy-Pasta Prompts

## Critical Execution Rules

- Phases are sequential. Wait for each phase to finish before starting the next.
- Agents within a phase can run in parallel.

## Phase 1: Helpers Foundation (Sequential)

### Agent 1

```
Read and execute .llm/plans/active/query-param-dry/migration-01-helpers-dedupe.md

Focus on shared query param arrays and generic types.

Verify: no duplicate value arrays remain in helpers.
```

## Phase 2: Dependent Updates (Parallel)

### Agent 2A: API Joi Refactor

```
Read and execute .llm/plans/active/query-param-dry/migration-02-api-joi-refactor.md

Core rule: use shared constants for all query param validation.
```

### Agent 2B: Web Updates

```
Read and execute .llm/plans/active/query-param-dry/migration-03-web-updates.md

Core rule: align imports and types with shared helpers.
```
