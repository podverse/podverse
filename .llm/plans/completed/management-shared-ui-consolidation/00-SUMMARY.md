# Management Shared UI Consolidation

## Outcome

Consolidate additional management-web and web UI overlap beyond the prior IconButton/dropdown-hook plan.

The audit found management-web already uses `@podverse/ui` for most page chrome (`ManagementPageShell`, `Table`, `Button`, `ActionLink`, `FormGroup`, `Select`, `Alert`, `LoadingText`, etc.). The remaining worthwhile overlap is concentrated in:

- Settings locale/theme selector controls and web `FormDropdown`.
- Account/user menu composition and menu item/link support.
- Raw/local form wrappers (`apps/management-web/src/app/page.tsx`, `apps/web/src/components/Form/Form.tsx`) versus `@podverse/ui` form primitives.
- A narrower nav brand/shell spike; full web NavBar migration is not yet clearly worth the blast radius.
- **Follow-up:** Destructive-action UX standardized on `ConfirmPanel` (replace `window.confirm` / `confirm()` where still used).
- **Follow-up:** Shared client session guard hook for repeated `getCurrentUser` + redirect in management-web clients.

## Recommended Priority

1. **High:** Shared settings selector/form dropdown primitive.
2. **High:** Shared account menu composition on top of `@podverse/ui` menu primitives.
3. **Medium:** Form stack/login form cleanup.
4. **Medium spike / low full migration:** Nav brand/shell convergence.
5. **High (management-web UX consistency):** `ConfirmPanel` for destructive actions (`06`).
6. **Medium (DRY):** Shared client session guard hook (`07`).

## Non-Goals

- Do not re-plan the already completed/active IconButton and dropdown keyboard hook work.
- Do not force web’s full product NavBar into `@podverse/ui` in one pass.
- Do not remove app-specific request/session logic; shared UI should expose primitives and hooks, while each app keeps its API side effects.
