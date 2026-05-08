# Execution order — extensions-framework

This plan set executes Phase 1 of
[docs/proposals/EXTENSIONS.md](../../../../docs/proposals/EXTENSIONS.md). Run the
numbered files in the order below. Most steps depend on prior ones; a few groups can
run in parallel within a phase if you are dispatching to multiple agents.

## Phases

### Phase 1 — Foundation (sequential)

1. [01-sdk-package.md](./01-sdk-package.md)
1. [02-storage-migration-and-orm-service.md](./02-storage-migration-and-orm-service.md)
1. [03-host-resolver-and-cache.md](./03-host-resolver-and-cache.md)

### Phase 2 — Host surfaces (parallel after Phase 1)

Steps `04` and `05` can run in parallel after `03` completes. They touch different
apps (`apps/web` vs `apps/management-api`) and do not share files.

1. [04-web-host-wiring.md](./04-web-host-wiring.md)
1. [05-mgmt-api-extensions-routes.md](./05-mgmt-api-extensions-routes.md)

### Phase 3 — Management UI (sequential after Phase 2)

`06` depends on `05` (it consumes the new management-api routes).

1. [06-mgmt-web-extensions-pages.md](./06-mgmt-web-extensions-pages.md)

### Phase 4 — First extension and consolidation (sequential after Phase 3)

`07` depends on `01` (uses SDK types) and the host wiring from `04` and `06`.
`08` depends on `04`, `06`, and `07`.

1. [07-cloudflare-extension-package.md](./07-cloudflare-extension-package.md)
1. [08-single-emitter-consolidation.md](./08-single-emitter-consolidation.md)

### Phase 5 — Verification (after everything)

1. [09-tests-and-verification.md](./09-tests-and-verification.md)

## Why this order

- The SDK is types-only and unblocks every later step that imports a manifest type.
- Storage and the resolver are the foundation that both host apps consume; building
  them before host wiring keeps host changes mechanical.
- Web and management-api host wiring touch independent files and can be parallelized,
  cutting wall-clock time when more than one agent is available.
- Management-web depends on management-api routes existing; building the UI against a
  non-existent endpoint creates churn.
- The Cloudflare extension lands after host wiring is complete so the registry has a
  place to register it and the management-web auto-form has a real schema to render.
- The single-emitter consolidation must come last (other than tests) because it
  asserts the final invariant across web layout, management-web layout, and the new
  extension.
- Verification runs last so it exercises the integrated system rather than partial
  surfaces.

## Branching note (Cloudflare env plan)

If the parallel Cursor env plan `cloudflare_web_analytics_env_6f142d3e` has already
shipped, step `08` follows **Branch A** (consolidates the env plan's direct `<script>`
rendering under `<ExtensionHeadScripts />`). If it has not shipped, step `08` follows
**Branch B** (no-op beyond confirming the manifest's env-key declaration). See
[00-SUMMARY.md](./00-SUMMARY.md) for the full branch description.
