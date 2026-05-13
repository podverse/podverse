# API Client Boundaries (Web, SSR, and Mobile)

This document defines shared API client boundaries for Podverse app and management surfaces.

## APIs and base URL env ownership

- Main API (`apps/api`):
  - web client base comes from web runtime config (`public.api.client`)
  - SSR base comes from web runtime config (`public.api.ssr`)
  - route prefix/version is `config.api.prefix + config.api.version`
- Management API (`apps/management-api`):
  - management-web client base comes from management-web runtime config (`public.api.client`)
  - management-web SSR base comes from management-web runtime config (`public.api.ssr`)
  - route prefix/version is `config.api.prefix + config.api.version`

## Cookie names and auth channels

- Main API auth cookie: `jwt` (via `AuthCookieName` from `@podverse/helpers`)
- Management API auth cookie: `pv_mgmt_auth`

Both APIs support:

- browser cookie/session auth for web and SSR
- bearer auth for programmatic clients

## Shared auth context contract

Shared request clients accept one of these auth context modes:

- `none`
- `cookie`: `{ cookieName, token }`
- `bearer`: `{ token, headerName? }` (`Authorization: Bearer <token>` by default)
- `headers`: `{ headers: Record<string, string> }`

Rules:

- request-core remains framework agnostic (no Next.js, no browser globals required)
- cookie name is caller-provided config, never hardcoded in request-core internals
- both client packages must support cookie and bearer contexts

## Mobile bearer-first strategy

Bearer token auth is the baseline for mobile clients for both APIs.

- Mobile clients should call mobile token endpoints to receive `access_token` + `refresh_token`
- Web/SSR cookie flow remains unchanged and fully supported

## Mobile token endpoint contract

Both APIs expose mobile token endpoints under `/auth/mobile/*`:

- `POST /auth/mobile/token`: issue access + refresh token pair from credentials
- `POST /auth/mobile/refresh`: rotate refresh token and issue new pair
- `POST /auth/mobile/revoke`: revoke refresh token family (logout/revoke)

Security contract:

- rotating refresh tokens per token family
- refresh token reuse detection revokes the family and denies subsequent refreshes
- revocation is family-wide
- shared token model shape, with explicit per-API overrides for claim names, scope, and TTLs

## Migration guardrails

- `packages/*` API clients must not import from `apps/*`
- app-local request modules may temporarily re-export package modules for migration safety
- new management-api routes must add/update matching typed request wrappers in `@podverse/management-api-requests`
- new main API routes intended for app/mobile clients must add/update matching typed wrappers in `@podverse/helpers-requests`

## Deferred decisions

- Cross-repo reuse with Metaboost: deferred; keep implementation Podverse-local for now
- OpenAPI codegen for client wrappers: deferred; maintain manual typed wrappers with CI checks
