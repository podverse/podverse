# Proposed packages and layering

This document proposes a target shape; exact naming should be confirmed before implementation.

## Layer A — HTTP primitive (shared)

**Goal:** Remove duplicated `_request.ts` behavior (PATCH JSON, `withCredentials`, `userAgent`
stripping, abort timeouts).

**Chosen direction:** Introduce a dedicated shared core package.

- **New package:** `packages/http-request-core`
- Core exports:
  - `request()`
  - `requestWithHeaders()`
  - `createRequestClient(config)`
  - shared error normalization helpers
- Config surface includes:
  - `jsonMethods` (default includes `POST`, `PUT`, `PATCH`)
  - `withCredentials` policy
  - abort/timeout defaults
  - optional user-agent policy

**Rule:** both app and management client packages consume this core; no app keeps a forked transport.

## Layer B — Auth injection interface

**Goal:** Replace hardcoded `Cookie: jwt=` vs `Cookie: pv_mgmt_auth=` constructors with injected
behavior.

Sketch (conceptual, not prescriptive TypeScript):

```typescript
type AuthContext =
  | { mode: 'none' }
  | { mode: 'cookie'; cookieName: string; token: string }
  | { mode: 'bearer'; token: string; headerName?: string }
  | { mode: 'headers'; headers: Record<string, string> };
```

Call sites:

- **Browser client:** session cookies via `withCredentials` or explicit cookie header from document.
- **SSR (Next):** pass JWT from server session into cookie header (today’s pattern), generalized.
- **Mobile:** bearer mode is first-class and documented as the default mobile integration path.

## Layer C — API client classes

### Main API

- Continue exporting **`ApiRequestService`** + `req*` from `@podverse/helpers-requests`.
- Refactor implementation to consume Layer A + B contracts.
- Preserve current public exports to minimize app-web churn.

### Management API

- Introduce **`@podverse/management-api-requests`** exporting:

  - `ManagementApiClient` (name target) backed by Layer A + B.
  - typed request functions migrated from
    `apps/management-web/src/lib/requests/*.ts`.
  - `createManagementApiClientFromConfig(...)` helper for app shells.

**apps/management-web** becomes a thin consumer: imports from the package, passes Next-specific
config only at the shell.

## Layer D — Contract verification (required for this initiative)

- Require request-type drift checks during migration:
  - DTO import hygiene (`@podverse/helpers` over app-local duplicates)
  - route-path consistency checks for moved management request modules
- OpenAPI codegen remains optional and explicitly deferred unless separately approved.

## Layer E — Mobile token endpoint support (in scope)

This initiative includes backend support for mobile bearer flows, not just client-side transport.

- Define endpoint contract(s) in `apps/api` and `apps/management-api` for mobile token issuance and
  lifecycle operations with rotating refresh tokens.
- Ensure endpoint design is explicit about:
  - token rotation and expiration
  - refresh token family tracking and reuse detection behavior
  - revocation/logout behavior
  - compatibility with existing web cookie/session flows
- Update request client packages with typed request modules for these mobile token endpoints.

## Dependency graph (target)

```text
helpers (DTOs)
    ↑
http-request-core (Layer A)  ←  no app imports
    ↑
helpers-requests (main)    management-api-requests (mgmt)
    ↑                           ↑
apps/web                   apps/management-web
(future app mobile)        (future mgmt mobile)
```

No package under `packages/` should import from `apps/`.

## Migration compatibility contract

- During transition, these files may remain as pass-through re-exports only:
  - `apps/management-web/src/lib/requests/_request.ts`
  - `apps/management-web/src/lib/requests/apiRequestService.ts`
  - `apps/management-web/src/lib/requests/*.ts`
- Final state: app-local request modules are either deleted or reduced to explicit app-shell adapters
  (base URL + auth context sourcing), not HTTP logic owners.
