# 09 - Web Safe URL Policy (P2 Follow-up)

## Goal

Prevent unsafe or unexpected URL scheme usage in caller-provided link props.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Link/Link.tsx`
- any shared URL utility location used by web components

## Plan

1. Introduce a safe URL normalization/allowlist helper:
   - allow internal routes.
   - allow `http`, `https`, `mailto`, and `tel` as needed.
   - reject unsafe schemes like `javascript:`.
2. Apply helper in shared `Link` component so all call sites inherit policy.
3. Add tests for accepted and rejected URL forms.
4. Verify no valid current links regress.

## Verification

```bash
npm run test -w apps/web
npm run lint -w apps/web
```

## Done Criteria

- Shared link rendering path enforces safe URL scheme policy.
