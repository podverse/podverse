# Route Navigation Loading Warning

This plan set is saved for later implementation.

## Context

- In local dev for both `apps/web` and `apps/management-web`, route changes
  emit: `useInsertionEffect must not schedule updates`.
- Stack traces point to `useRouteNavigationLoading` in `packages/ui`.
- The warning is caused by synchronous `setIsNavigating(true)` during history
  patch callbacks (`pushState` / `replaceState`) while React commit timing is
  still sensitive.

## Goal

- Remove the runtime warning in both apps without changing user-visible
  navigation-loading behavior.
- Apply a minimal-risk fix first (defer state start), then add durable E2E
  coverage for this shared behavior.

## Saved plan documents

- `01-shared-hook-deferral-fix.md`
- `02-navigation-loading-e2e-coverage.md`
- `00-EXECUTION-ORDER.md`
- `COPY-PASTA.md`

## Implementation status

- Deferred by request.
- No product code changes for this warning have been implemented yet.
