# Context, inventory, and principles

## Current inventory (Podverse monorepo)

### Main public API surface

- **`packages/helpers`:** DTOs and shared types — correct long-term SSOT for payloads shared across
  web and mobile.
- **`packages/helpers-requests`:** `request` / `requestWithHeaders`, `ApiRequestService`, and many
  `req*` functions targeting **main** API routes; uses `Cookie: jwt=...` when JWT passed for SSR.

### Management API surface

- **`apps/management-web/src/lib/requests/*`:** App-local modules wrapping
  `ManagementApiRequestService`.
- **`ManagementApiRequestService`:** Builds base URL from runtime config; injects
  `Cookie: pv_mgmt_auth=...` for SSR-style auth.
- **Duplicate `apps/management-web/src/lib/requests/_request.ts`:** Nearly mirrors
  `packages/helpers-requests/src/_request.ts` with **always-on `withCredentials`** and PATCH treated
  as JSON.

## High-value file inventory for extraction

- Main transport/client:
  - `packages/helpers-requests/src/_request.ts`
  - `packages/helpers-requests/src/api/_request.ts`
- Management transport/client (current app-local):
  - `apps/management-web/src/lib/requests/_request.ts`
  - `apps/management-web/src/lib/requests/apiRequestService.ts`
  - `apps/management-web/src/lib/requests/*.ts`
- Session/auth integration touchpoints:
  - `apps/web/src/lib/server-request.ts`
  - `apps/management-web/src/lib/auth/serverManagementSession.ts`
  - `apps/management-web/src/lib/requests/managementApiBaseUrl.ts`

### Tier discipline

Per [`.llm/context/architecture.md`](../../../context/architecture.md), new shared client packages
must sit in lower tiers than apps and must not create upward dependencies.

## Principles for shared helpers

1. **Transport vs domain:** Keep cookie parsing, SecureStore, and platform navigation **out** of
   the lowest HTTP helper; accept injected headers or an async `getAuthContext()` hook.
2. **Two API backends = two client entrypoints:** Main API and management API remain **separate**
   packages or clearly separated factories inside one package — avoid one mega-client that obscures
   security boundaries.
3. **Types follow helpers:** Request/response TypeScript types should derive from or re-export
   `@podverse/helpers` DTOs where possible; avoid duplicating JSON field names in three places.
4. **Web stays incremental:** Refactors should allow **apps/web** and **management-web** to migrate
   module-by-module without a flag day.
5. **Mobile is a consumer, not a driver for premature abstraction:** Do not build speculative RN
   wrappers until there is a repo or submodule for the mobile app; **do** tighten boundaries so the
   first mobile spike imports packages instead of copying axios snippets.
6. **Bearer-first mobile compatibility:** API client constructors must support a first-class bearer
   auth path that does not require browser cookie semantics.
7. **Back-compat first:** during migration, old app-local imports may re-export from new packages to
   reduce PR blast radius.

## Non-goals

- Sharing React components between web and React Native via `packages/ui` (different styling and
  a11y models).
- Moving management-api Express routes into packages (servers stay in `apps/`).

## Minimum architecture constraints

- No `packages/*` client package imports from `apps/*`
- No Next.js-specific imports in shared client packages
- Shared client packages expose framework-agnostic factory/constructor APIs
- Cookie names are configuration, not hardcoded in request-core internals
