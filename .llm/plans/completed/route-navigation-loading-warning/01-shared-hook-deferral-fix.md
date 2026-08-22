# Shared Hook Deferral Fix

## Scope

- Fix the warning source in shared `packages/ui` hook logic:
  `useRouteNavigationLoading`.
- Keep current route-loading semantics (click/popstate/history triggers) to
  avoid broader behavior drift.
- Update hook unit tests to match deferred start timing.

## Why this step exists

- `startNavigating` currently sets state synchronously from callbacks that can
  run while React is processing insertion effects.
- Deferring the state start to a microtask removes the scheduling conflict
  without changing the route key reset logic.

## Steps

1. Edit [`/packages/ui/src/hooks/useRouteNavigationLoading.ts`](/packages/ui/src/hooks/useRouteNavigationLoading.ts):
   - Keep initial-load gate (`hasCompletedInitialLoadRef`) as-is.
   - Replace synchronous `setIsNavigating(true)` with a deferred microtask
     update.
   - Ensure deferred update remains inside the existing callback path so all
     current triggers still work.
2. Review route-key reset effect in the same file:
   - Keep `setIsNavigating(false)` on route key change.
   - Avoid introducing duplicate start/stop races.
3. Update [`/packages/ui/src/hooks/useRouteNavigationLoading.test.tsx`](/packages/ui/src/hooks/useRouteNavigationLoading.test.tsx):
   - For the internal-link-start test, await microtask timing before asserting
     `true`.
   - Keep coverage for external-link no-op and route-key clear behavior.
4. Confirm no additional synchronous setter path in this hook can trigger the
   same warning.

## Key files

- [`/packages/ui/src/hooks/useRouteNavigationLoading.ts`](/packages/ui/src/hooks/useRouteNavigationLoading.ts)
- [`/packages/ui/src/hooks/useRouteNavigationLoading.test.tsx`](/packages/ui/src/hooks/useRouteNavigationLoading.test.tsx)

## Expected outcome

- No `useInsertionEffect must not schedule updates` warning during route
  navigation in local web/management-web dev logs.
- Existing global route-loading overlay UX remains unchanged to end users.
