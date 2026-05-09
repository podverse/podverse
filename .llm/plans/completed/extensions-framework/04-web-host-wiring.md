# Phase 04 — apps/web host wiring

Wire the framework into `apps/web` so an active extension's `headScripts` and
`bodyProviders` are rendered server-side from the root layout. This is the surface the
Cloudflare extension consumes.

## Components

`apps/web/src/components/Extensions/ExtensionHeadScripts.tsx` (server component):

- Reads runtime config + DB rows (via `resolveActiveExtensions` below).
- For each active extension that has `requires.web?.headScripts`, calls it with the
  resolved (secret-stripped) config and renders a `<script>` element per descriptor.
- Returns `null` when the master switch is off.

`apps/web/src/components/Extensions/ExtensionProviders.tsx` (server component):

- Same active-extension flow.
- Wraps `children` with each extension's `bodyProviders` output.
- Returns `<>{children}</>` when no provider is contributed.

Both files are app-local (not in `@podverse/ui`) because they wire app-specific
runtime config into the SDK contract — see
[`reusable-components`](../../../../.cursor/skills/reusable-components/SKILL.md).

## Active-extension resolver

`apps/web/src/lib/extensions/resolveActiveExtensions.ts`:

```ts
import { resolveExtensionConfig } from '@podverse/extensions-sdk';
import type { ExtensionManifest, ResolvedExtension } from '@podverse/extensions-sdk';

import { extensionRegistry } from './registry';

export type ActiveExtension = {
  manifest: ExtensionManifest;
  resolved: ResolvedExtension;
};

export async function resolveActiveExtensions(): Promise<ActiveExtension[]> {
  const masterSwitchEnabled = process.env.EXTENSIONS_ENABLED === 'true';
  if (masterSwitchEnabled === false) {
    return [];
  }

  const results: ActiveExtension[] = [];
  for (const manifest of extensionRegistry) {
    const dbRow = await readDbRow(manifest.id); // hits cache then DB; see below
    const resolved = resolveExtensionConfig({
      manifest,
      env: process.env,
      dbRow,
      masterSwitchEnabled: true,
    });
    if (resolved.enabled === true) {
      results.push({
        manifest,
        resolved: stripSecrets(manifest, resolved),
      });
    }
  }
  return results;
}
```

`readDbRow` consults the Valkey cache helpers from phase `03`, falling through to the
ORM service from phase `02`. `stripSecrets` walks `manifest.configSchema.fields` and
removes any field whose `secret: true`. Secret fields stay available to `headScripts`
on the server but are stripped before any data crosses the SSR boundary into client
code.

## Subscriber bootstrap (Valkey pub/sub)

Per proposal §6 / §14: after a management-api `PUT`, replicas must drop cached
`extension:<id>` entries within ~1s via **`PUBLISH extension:invalidated:<id>`** and
**`SUBSCRIBE`** on each process that reads the cache.

- Add `apps/web/src/lib/extensions/cacheSubscriber.ts` (name flexible) that calls
  `subscribeToExtensionInvalidations` from phase `03` with an `onInvalidate` that
  `DEL`s the Valkey key and clears any in-process memo map used by `readDbRow`.
- Start the subscriber **once per Node process** on the same cold-start path where the
  app obtains its Valkey client (e.g. `instrumentation.ts` if the stack supports it, or
  a lazy singleton initializer invoked before the first `resolveActiveExtensions`
  call). Register shutdown hooks to unsubscribe / close the subscriber connection on
  process exit where the runtime allows.
- **Do not** start the subscriber when `process.env.EXTENSIONS_ENABLED !== 'true'`.
  When the master switch is off, extension reads are inert and pub/sub would add noise.
- **management-web:** If server components in this phase read extension settings from
  Valkey (same `readDbRow` pattern as apps/web), start the same subscriber in that
  process. If management-web only calls management-api over HTTP and never touches
  Valkey for extensions in Phase 1, skip the subscriber there and rely on the API +
  apps/web path — document which branch you chose in the PR.

## Runtime-config and sidecar additions

The web app's runtime-config pipeline is the canonical place to expose env values to
the browser. Required additions:

- `apps/web/src/config/runtime-config.ts`: add `EXTENSIONS_ENABLED` and any
  per-extension keys the registry needs. The Cloudflare extension's keys
  (`EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED`,
  `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN`) land in phase `07`; this phase only adds
  the master switch and supporting plumbing.
- `apps/web/sidecar/src/server.ts`: add `EXTENSIONS_ENABLED` to `optionalKeys` and the
  appropriate `getCategory` mapping.
- `apps/web/.env.example`, `apps/web/sidecar/.env.example`,
  `infra/k8s/base/web/source/web-sidecar.env`, and the management-web equivalents:
  add the new key per
  [`env-file-formatting`](../../../../.cursor/rules/env-file-formatting.mdc) and
  [`env-defaults-match-code`](../../../../.cursor/skills/env-defaults-match-code/SKILL.md).
- `apps/web/ENV.md`: document `EXTENSIONS_ENABLED` and reference
  `docs/proposals/EXTENSIONS.md` for the full design.

## CSP merging in the sidecar

`apps/web/sidecar/src/server.ts` merges per-extension `cspSources` into the
`Content-Security-Policy` header.

- The sidecar already serves runtime config; extend the same handler to read the
  registry (statically imported, not from DB at sidecar-request time) and emit a CSP
  that includes every registered extension's `cspSources` whose master switch is on.
- For v1, sidecar inspection of the master switch only is sufficient — extensions
  that are in the registry but disabled at runtime still have their CSP sources
  declared. This is conservative and safe; tightening this to per-extension state is
  Phase 2 work.
- Document the CSP behavior in `apps/web/sidecar/ENV.md` if such a file exists, or
  inline-comment the merging code with a pointer to `docs/proposals/EXTENSIONS.md`.

## Layout integration

Edit `apps/web/src/app/layout.tsx`:

- Inside `<head>`, after `<RuntimeConfigScript />`, insert
  `<ExtensionHeadScripts />`.
- Wrap the existing `<Providers>` in `<ExtensionProviders>`. Order matters — provider
  contributions must be inside the existing `<Providers>` so they have access to
  `RuntimeConfigContext`.

The same edits apply to `apps/management-web/src/app/layout.tsx` so the
management-web app can host extensions too. Most extensions will only target apps/web,
but the contract is symmetric.

## App-local UI rules

Both new components follow
[`app-local-ui-wrappers`](../../../../.cursor/rules/app-local-ui-wrappers.mdc) and
[`prefer-shared-ui-web-management`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc):
they wire app-specific data fetching and stay in the app, not `@podverse/ui`.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
```

E2E coverage lands in phase `09`. At this point the registry is empty so a build with
`EXTENSIONS_ENABLED=true` should succeed and produce no extra `<script>` tags or
providers — the master switch turns the system on, but with zero registered
extensions there is nothing to render.
