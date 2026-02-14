# Subplan 02 - Sidecar Endpoint and Bootstrap

## Objective

Add a **sidecar-only runtime-config service** and a server-side bootstrap flow
so both apps consume runtime values without exposing a public endpoint.

## Tasks

1. Build a tiny Node sidecar service that reads `.env.production` at runtime
   and serves `GET /runtime-config` on an internal port.
2. Add server-side fetch in both apps to read runtime config from the sidecar
   (no app-exposed `/api/runtime-config` route).
3. Inject runtime config into HTML (head script) and hydrate client store.
4. Make SSR paths read runtime config without relying on build-time envs.
5. Replace direct `process.env.NEXT_PUBLIC_*` usage in client code.

## Target Files (expected)

- `apps/web/src/config/runtime-config.server.ts`
- `apps/management-web/src/config/runtime-config.server.ts`
- `apps/web/src/app/*` (bootstrap integration)
- `apps/management-web/src/app/*` (bootstrap integration)
- `apps/web/sidecar/*` (new sidecar service)
- `apps/management-web/sidecar/*` (new sidecar service)
- `apps/web/src/app/*` (bootstrap integration)
- `apps/management-web/src/app/*` (bootstrap integration)
- `apps/web/src/config/index.ts`
- `apps/management-web/src/config/index.ts`

## Notes

- Keep the payload minimal and stable to avoid cache busting.
- Fail fast if sidecar is unreachable in SSR (explicit error).
- Ensure the sidecar port is internal-only (no published port).
