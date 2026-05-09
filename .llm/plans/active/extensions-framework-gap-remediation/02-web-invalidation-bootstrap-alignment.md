# Phase 02 - web invalidation bootstrap alignment

Ensure extension cache invalidation subscriber startup uses the same effective env source as extension resolution.

## Problem

- Subscriber startup currently gates on process.env.EXTENSIONS_ENABLED.
- Resolver gates on merged runtime config env.
- This can disable invalidation subscriptions even when extensions are effectively enabled via runtime config.

## Required changes

- Update apps/web/instrumentation.ts and apps/web/src/lib/extensions/cacheSubscriber.ts so startup decision is based on effective runtime config, not only raw process env.
- Keep best-effort behavior:
  - Do not crash app startup if subscriber setup fails.
- Keep existing no-op behavior when keyval client is unavailable.
- Add or update tests to cover:
  - Extensions enabled through runtime config path leads to subscriber startup attempt.
  - Disabled state does not start subscriber.

## Validation

Run at minimum:

```bash
./scripts/nix/with-env npm run test -w apps/web -- ExtensionHeadScripts
./scripts/nix/with-env npm run build -w apps/web
```

If dedicated unit tests are added for cache subscriber bootstrap, run them explicitly too.

## Exit criteria

- Subscriber startup gate matches resolver enablement semantics.
- No startup crash regression.
