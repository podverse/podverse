# 07 - Shared Client Session Guard Hook

## Assessment

Several management-web client pages repeat a pattern: call `getCurrentUser()` in `useEffect`, then `router.replace('/')` (or equivalent) when the session is invalid or missing. This duplicates logic and can drift on error handling.

This hook lives in **management-web** (`apps/management-web/src/lib/` or `hooks/`), not in `@podverse/ui`, because it couples to app routing and auth requests.

## Scope (initial)

Introduce a shared hook and migrate these clients first:

- `apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx`
- `apps/management-web/src/app/(management)/dashboard/DashboardPageClient.tsx`
- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`

Expand to other `getCurrentUser` + redirect patterns in a follow-up if the hook API is stable.

## Prompt

1. Implement something like `useManagementClientSessionGuard` (exact name per repo conventions) that:
   - Accepts options for redirect path (default `/`), optional `onValid`/`onInvalid` callbacks, and whether to skip until a dependency is ready.
   - Handles loading vs unauthenticated states without flash of protected content where the current pages already avoid it.
   - Uses strict equality and avoids type assertions; type `getCurrentUser` results explicitly.
2. Replace duplicated `useEffect` blocks in the three files above with the hook.
3. Add a small unit test in `management-web` if there is an existing Vitest pattern for hooks; otherwise document manual verification in the PR.
4. Do not change server-side `getManagementSessionUser` layout protection; this hook is for client-side consistency only.

## Acceptance Criteria

- The three listed page clients use the shared hook for session re-check + redirect.
- No duplicate copy-paste of the same redirect logic across those files.
- Lint and type-check pass.

## Implementation notes (completed)

- Hook: `apps/management-web/src/hooks/useManagementClientSessionGuard.ts` — options `redirectPath` (default `/`), `enabled`, `onValid` / `onInvalid` (stored in refs to avoid effect dependency churn).
- **Unit tests:** Not added — workspace has Vitest but no `@testing-library/react` / `renderHook` setup; verify via lint, type-check, and E2E commands below.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/management-web
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts,e2e/settings-page.spec.ts
```
