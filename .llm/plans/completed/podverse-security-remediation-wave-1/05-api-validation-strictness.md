# 05 - API Validation Strictness (`PVSA-007`)

## Goal

Enforce explicit unknown-key handling and tighten mutation input validation behavior.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/apps/api/src/lib/validation/index.ts`
- high-risk mutation controllers under
  `/Users/mitcheldowney/repos/pv/podverse/apps/api/src/controllers`
- API validation tests

## Plan

1. Define global validation policy for body/params/query:
   - reject unknown keys or strip unknown keys consistently.
2. Update validation helper wrappers to enforce policy by default.
3. Audit high-risk mutation schemas to ensure required keys and constraints are explicit.
4. Add regression tests showing:
   - unexpected keys are handled as intended.
   - valid payloads continue to pass.
5. Document any intentional schema exceptions.

## Verification

```bash
npm run test -w apps/api
npm run lint -w apps/api
```

## Done Criteria

- Request validation has deterministic unknown-key behavior.
- Mutation endpoints are covered by tests for over-posting style payloads.
