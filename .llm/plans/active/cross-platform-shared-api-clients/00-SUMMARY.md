# Cross-platform shared API clients — summary

## Decision snapshot (confirmed)

- **Mobile auth direction:** Bearer-token-first for mobile clients.
- **Extraction scope:** Aggressive two-client formalization now.
- **Package naming:** use explicit API naming.
  - `@podverse/management-api-requests`
  - `@podverse/http-request-core`
- **Token scope:** include mobile token endpoint work in this initiative.
- **Refresh strategy:** rotating refresh tokens (security-first).
- **Token model policy:** shared core token model with explicit per-API overrides.
- **Web behavior:** Browser cookie/session behavior remains supported for web and SSR.

## Trigger

Podverse is expected to support four client surfaces over time:

- App website (`apps/web`) against `apps/api`
- App mobile (future) against `apps/api`
- Management website (`apps/management-web`) against `apps/management-api`
- Management mobile (future) against `apps/management-api`

## Strategic outcome

Establish two explicit shared API client packages with a shared transport/auth foundation:

1. **Main API client:** `@podverse/helpers-requests` (refined and stabilized public API)
2. **Management API client:** new package `@podverse/management-api-requests`
3. **Shared core behavior:** one canonical transport + auth injection model consumed by both
   clients

This avoids duplicated axios wrappers and cookie-injected service classes scattered in app code.

## In scope

- Consolidate request transport behavior (JSON methods, timeout, abort, `withCredentials`,
  `requestWithHeaders`, error normalization)
- Introduce auth injection contract supporting:
  - Cookie injection for web/SSR
  - Bearer/header injection for mobile
- Add explicit API support for mobile bearer-token issuance/refresh semantics
  (rotating refresh token lifecycle)
- Move management request modules from app-local code into a package
- Define migration and compatibility contract so app code can migrate incrementally

## Out of scope

- React Native UI/component sharing
- Server route rewrites unrelated to request client boundaries
- Full OpenAPI codegen migration unless explicitly approved in a later phase
- Full mobile app implementation (this initiative stops at API + client readiness)

## Definition of done for this initiative

- `apps/web` and `apps/management-web` no longer own divergent low-level request transport logic
- Both app families consume package-level API clients, not app-local ad hoc wrappers
- Both web apps preserve existing auth/session behavior after migration
- Mobile consumers can instantiate both clients with bearer-token auth without web-only dependencies
- Rotating refresh token contract is implemented and integration-tested in both APIs
