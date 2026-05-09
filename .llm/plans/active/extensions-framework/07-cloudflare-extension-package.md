# Phase 07 — Cloudflare Web Analytics extension package

Create the first concrete extension and register it in the host app registries. This
phase exercises the SDK, the resolver, the storage path, and the management-web admin
UI end to end.

## Files

```
extensions/cloudflare-web-analytics/
  package.json
  tsconfig.json
  LICENSE
  README.md
  src/
    index.ts          # exports manifest
    manifest.ts
    web-client.ts
    mgmt.ts           # minimal; auto-form covers v1
```

## Package metadata

`extensions/cloudflare-web-analytics/package.json`:

- `"name": "@podverse/extension-cloudflare-web-analytics"`
- `"version": "0.0.1"`
- `"type": "module"`
- Workspace deps: `@podverse/extensions-sdk`, `joi`. If the parallel env plan has
  shipped helpers in `packages/helpers`, also depend on that package and reuse them
  (Branch A integration); otherwise the helpers live inside this extension's
  `web-client.ts` (Branch B).

`tsconfig.json` extends `tsconfig.base.json` and follows the convention used by other
workspace packages in `packages/`.

## Manifest

`src/manifest.ts`:

```ts
import Joi from 'joi';
import type { ExtensionManifest } from '@podverse/extensions-sdk';

import { webClient } from './web-client.js';

export type CloudflareWebAnalyticsConfig = {
  token: string;
  beaconUrl?: string;
};

export const manifest: ExtensionManifest = {
  id: 'cloudflare-web-analytics',
  name: 'Cloudflare Web Analytics',
  description:
    'Optional, opt-in Cloudflare Web Analytics. Collects rough page-view data ' +
    'for operators who run a Cloudflare Web Analytics site. Token is intentionally ' +
    'public; no operator credentials are stored.',
  kind: 'analytics',
  defaultEnabled: false,
  configSchema: {
    joi: Joi.object({
      token: Joi.string().trim().min(1).required(),
      beaconUrl: Joi.string().uri().optional(),
    }),
    fields: {
      token: {
        secret: false,
        userEditable: true,
        labelKey: 'extensions.cloudflare.token.label',
        helpKey: 'extensions.cloudflare.token.help',
      },
      beaconUrl: {
        secret: false,
        userEditable: true,
        labelKey: 'extensions.cloudflare.beaconUrl.label',
        helpKey: 'extensions.cloudflare.beaconUrl.help',
      },
    },
  },
  requires: { web: webClient },
  cspSources: ['https://static.cloudflareinsights.com'],
};
```

## Web client hook

`src/web-client.ts` builds the script descriptor that ends up in `<head>`:

```ts
import type { ScriptDescriptor, WebClientHook } from '@podverse/extensions-sdk';

import type { CloudflareWebAnalyticsConfig } from './manifest.js';

const DEFAULT_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';

export const webClient: WebClientHook<CloudflareWebAnalyticsConfig> = {
  headScripts: ({ config }): ScriptDescriptor[] => {
    const token = (config.token ?? '').trim();
    if (token === '') {
      return [];
    }
    return [
      {
        src: config.beaconUrl ?? DEFAULT_BEACON_URL,
        defer: true,
        dataAttrs: {
          'cf-beacon': JSON.stringify({ token }),
        },
      },
    ];
  },
};
```

### Branch A integration (env plan shipped first)

If the parallel env plan has already landed pure helpers in
`packages/helpers/cloudflareWebAnalytics.ts` (token normalize, beacon-payload builder,
beacon `src` constant), import and use them here so the extension and the env-only
layout share a single implementation:

```ts
import {
  buildCloudflareBeaconPayload,
  CLOUDFLARE_BEACON_SCRIPT_SRC,
  normalizeCloudflareWebAnalyticsToken,
} from '@podverse/helpers';
```

### Branch B integration (this plan ships first)

If the env plan has not landed, the helpers live inside this extension. When the env
plan later runs, it imports them from here (or, equivalently, the env plan extracts
them into `packages/helpers` and this extension is updated to consume the package
exports). Either ordering is mechanical; the test surface is the same.

`00-SUMMARY.md` documents which branch applies at execution time.

## Management hook

`src/mgmt.ts`:

```ts
import type { ManagementHook } from '@podverse/extensions-sdk';

export const mgmt: ManagementHook = {
  navSection: {
    label: 'Cloudflare Web Analytics',
    href: '/extensions/cloudflare-web-analytics',
  },
};
```

No custom `SettingsForm`; the management-web auto-form from phase `06` renders the
two-field config (`token`, `beaconUrl`) using the four `labelKey` / `helpKey` entries.

Add the matching strings to `apps/management-web/i18n/originals/en-US.json` (and sync
other locales per [`i18n`](../../../../.cursor/skills/i18n/SKILL.md)):

- `extensions.cloudflare.token.label`, `extensions.cloudflare.token.help`
- `extensions.cloudflare.beaconUrl.label`, `extensions.cloudflare.beaconUrl.help`

The **help** text for `token` should state the token is a public beacon identifier, not
an operator credential.

## Index

`src/index.ts`:

```ts
export { manifest } from './manifest.js';
export type { CloudflareWebAnalyticsConfig } from './manifest.js';
```

## README

`README.md` documents:

- One-paragraph summary of what Cloudflare Web Analytics collects and the public
  nature of the token.
- Env keys: `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED=true`,
  `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN=<beacon-token>`.
- Master switch dependency: `EXTENSIONS_ENABLED=true` is required.
- Management-web override path (`/extensions/cloudflare-web-analytics`) and the fact
  that DB rows take precedence over env per the proposal's resolution order.
- Privacy note: "Operator-convenience analytics. Collection may fail or be incomplete
  for many reasons; do not rely on this for billing, compliance, or critical
  operational decisions."
- License (matches the file beside it).

## LICENSE

Match the monorepo's primary license unless a deliberate exception applies. Per-file
licensing keeps any future extraction mechanical.

## Registry registration

Edit:

- `apps/web/src/lib/extensions/registry.ts`:

  ```ts
  import { manifest as cloudflareWebAnalytics } from '@podverse/extension-cloudflare-web-analytics';

  export const extensionRegistry: ExtensionManifest[] = [cloudflareWebAnalytics];
  ```

- `apps/management-web/src/lib/extensions/registry.ts`: same import and registration.

`apps/api/src/lib/extensions/registry.ts` stays empty for v1 (no api hook surface).

## Env-key declarations

The extension's manifest implies the following env keys; declare them in the
runtime-config pipeline so they flow through the sidecar:

- `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED`
- `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN`
- `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL` (optional)

Add them to `apps/web/src/config/runtime-config.ts` `optional` list, sidecar
`optionalKeys`, and the K8s `web-sidecar.env` per
[`env-defaults-match-code`](../../../../.cursor/skills/env-defaults-match-code/SKILL.md).
The `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN` env-name is the bootstrap default that
Branch A in phase `08` consolidates with the env plan's
`NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` (see phase `08` for the mapping).

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/extension-cloudflare-web-analytics
./scripts/nix/with-env npm run build -w @podverse/extension-cloudflare-web-analytics
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
```

After this phase, building apps/web with `EXTENSIONS_ENABLED=true` and
`EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED=true` plus a token should produce a
beacon `<script>` in the rendered HTML. Phase `09` adds an automated assertion for
this.
