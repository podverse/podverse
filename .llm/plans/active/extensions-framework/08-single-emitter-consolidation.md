# Phase 08 — Single-emitter consolidation

Establish and verify the invariant that exactly one path emits the Cloudflare beacon
`<script>` tag in production HTML: `<ExtensionHeadScripts />` rendered from the root
layout. The execution branches diverge based on whether the parallel env plan
(`cloudflare_web_analytics_env_6f142d3e`) has already shipped.

## Pick the branch

Check repository state before starting:

```bash
rg -n "static.cloudflareinsights.com|cloudflareWebAnalytics" \
  apps/web/src/app/layout.tsx apps/management-web/src/app/layout.tsx \
  apps/web/src/components apps/management-web/src/components \
  packages/helpers
```

- If matches exist in the layout files and/or `packages/helpers/...cloudflareWebAnalytics.*`,
  the env plan has shipped: follow **Branch A**.
- If no matches, the env plan has not shipped: follow **Branch B**.

`00-SUMMARY.md` carries the same branch description; this file is the executable form.

## Branch A (env plan shipped first)

Goal: move the env plan's direct `<script>` rendering under `<ExtensionHeadScripts />`
without breaking the env-only deployment mode.

### Edits

1. **Remove the env plan's direct `<script>` rendering** from
   `apps/web/src/app/layout.tsx` and `apps/management-web/src/app/layout.tsx`. Only
   the call sites change; the helper module(s) in `packages/helpers/` stay.
1. **Map the legacy env-var name** so existing operators do not have to rename
   anything. In `extensions/cloudflare-web-analytics/src/manifest.ts` (or a small
   adapter in `apps/web/src/lib/extensions/resolveActiveExtensions.ts`), accept
   `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` as an alias for
   `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN` when the latter is unset. Document the
   alias as a deprecation note pointing at the canonical form.
1. **Reuse helpers.** The Cloudflare extension's `web-client.ts` should already import
   `buildCloudflareBeaconPayload`, `CLOUDFLARE_BEACON_SCRIPT_SRC`, and
   `normalizeCloudflareWebAnalyticsToken` from `@podverse/helpers` per Branch A in
   phase `07`. Confirm no duplicate copies exist.

### Identical-HTML assertion

Add a unit-level test that asserts the rendered head `<script>` is byte-identical
between:

- The pre-consolidation env-only render (recreated via a small fixture that calls the
  former helper directly), and
- The post-consolidation render produced by `<ExtensionHeadScripts />` with the same
  token.

Place the test alongside the helpers (`packages/helpers/...cloudflareWebAnalytics.test.ts`)
or in `apps/web/src/components/Extensions/`, whichever houses the helper modules.
This is the regression guard for the consolidation.

### Documentation

Add a paragraph to `apps/web/ENV.md` (and the management-web equivalent if it exists)
that:

- Names `EXTENSIONS_ENABLED` and `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_*` as the
  preferred control surface.
- Notes that `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is supported as a legacy
  alias and will continue to work indefinitely.
- Cross-references `docs/proposals/EXTENSIONS.md` and the management-web
  `/extensions` page as the runtime-editable surface.

## Branch B (this plan set shipped first or alongside)

Goal: ensure the manifest's env-key declaration is correct and that env-only
deployments work, without ever introducing a parallel emitter.

### Edits

1. **Confirm no direct `<script>` rendering exists** in the layout files. If any was
   added during development, remove it; the only path is `<ExtensionHeadScripts />`.
1. **Confirm the manifest declares the canonical env keys**
   (`EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED`,
   `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN`) and that the alias for
   `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is **not** added (it is an artifact of
   the env plan that has not landed).
1. **Communicate to the env plan** that its layout-rendering step is unnecessary if
   it ships later. Add a note in `00-SUMMARY.md` under "Decisions taken during
   execution" if you discover anything that affects the env plan's scope.

### Smoke test

Add a smoke test that, with `EXTENSIONS_ENABLED=true` and the per-extension env vars
set, the rendered HTML contains exactly one `<script src="...cloudflareinsights...">`
tag. Place the test in `apps/web/src/components/Extensions/` next to the head-scripts
component.

### Documentation

Same paragraph in `apps/web/ENV.md` as Branch A, but **without** the legacy alias
sentence. Operators set the canonical env keys directly.

## Common verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
./scripts/nix/with-env make e2e_test_web_report_spec SPEC=e2e/extensions-cloudflare-head.spec.ts
```

The `e2e/extensions-cloudflare-head.spec.ts` file is added in phase `09`; this make
command becomes the user-facing verification target after phase `09` lands.
