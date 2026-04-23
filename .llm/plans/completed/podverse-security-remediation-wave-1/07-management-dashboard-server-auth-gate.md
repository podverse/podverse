# 07 - Management Dashboard Server Auth Gate (`PVSA-010`)

## Goal

Move management dashboard access control from client-only redirect behavior to server-enforced
route protection.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/apps/management-web/src/app/dashboard/page.tsx`
- management-web auth utilities/middleware (as needed)
- management-web auth flow tests

## Plan

1. Add server-side auth check before dashboard render.
2. Keep existing client-side handling as fallback UX only, not primary security gate.
3. Ensure unauthorized requests are redirected before protected content render.
4. Add test coverage for:
   - unauthenticated dashboard request -> redirect.
   - authenticated dashboard request -> page renders.

## Verification

```bash
npm run test -w apps/management-web
npm run lint -w apps/management-web
```

## Done Criteria

- Dashboard security boundary is server-enforced.
- Tests verify no unauthenticated render path remains.
