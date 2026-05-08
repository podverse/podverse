# Phase 01 — Extension SDK package

Create the new workspace package that defines the typed contract every extension and
host implements. This package is **types and pure helpers only** — no runtime side
effects, no React, no Express, no DB.

## Why this is first

The SDK has zero internal dependencies and is the first thing every later phase
imports. Building it first lets phases `02–07` reference stable type names (e.g.
`ExtensionManifest`, `ScriptDescriptor`) without forward references.

## Files to create

```
packages/extensions-sdk/
  package.json
  tsconfig.json
  src/
    index.ts
    types/
      manifest.ts
      hooks.ts
      configSchema.ts
    config/
      resolveExtensionConfig.ts        # signature only here; logic lands in 03
      resolveExtensionConfig.test.ts   # placeholder; full tests in 03
    lib/
      envKey.ts                        # extensionEnvKey('id', 'token') -> 'EXTENSION_ID_TOKEN'
      envKey.test.ts
```

## Package metadata

`packages/extensions-sdk/package.json`:

- `"name": "@podverse/extensions-sdk"`
- `"version": "0.0.1"`
- `"type": "module"`
- `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`
- Workspace deps: `joi` (peer-dep also acceptable; pick the convention used by other
  pure-helper packages in `packages/` and follow it).
- `scripts`: `build`, `lint`, `test` matching sibling packages.

`tsconfig.json` extends `tsconfig.base.json` and matches the build output paths used by
`packages/helpers` and similar.

## Type definitions

### `src/types/manifest.ts`

```ts
import type Joi from 'joi';

import type { ApiServerHook, ManagementHook, WebClientHook } from './hooks.js';
import type { ExtensionConfigSchema } from './configSchema.js';

export type ExtensionKind =
  | 'analytics'
  | 'observability'
  | 'integration'
  | 'webhook'
  | 'other';

export type ExtensionManifest = {
  id: string;
  name: string;
  description: string;
  kind: ExtensionKind;
  defaultEnabled: false;
  configSchema: ExtensionConfigSchema;
  requires: {
    web?: WebClientHook;
    api?: ApiServerHook;
    mgmt?: ManagementHook;
  };
  cspSources?: string[];
};
```

### `src/types/configSchema.ts`

```ts
import type Joi from 'joi';

export type ExtensionConfigFieldMeta = {
  secret: boolean;
  userEditable: boolean;
};

export type ExtensionConfigSchema = {
  joi: Joi.ObjectSchema;
  fields: Record<string, ExtensionConfigFieldMeta>;
};
```

The runtime cost of carrying field metadata next to the Joi schema is zero, and it
lets the management-web auto-form (phase `06`) and the SSR secret stripper (phase `04`)
make decisions without re-parsing Joi internals.

### `src/types/hooks.ts`

```ts
import type { ReactNode } from 'react';

export type ScriptDescriptor = {
  src: string;
  defer?: boolean;
  async?: boolean;
  dataAttrs?: Record<string, string>;
};

export type WebClientContext<TConfig = unknown> = {
  config: TConfig;
};

export type WebClientHook<TConfig = unknown> = {
  headScripts?: (ctx: WebClientContext<TConfig>) => ScriptDescriptor[];
  bodyProviders?: (ctx: WebClientContext<TConfig>) => ReactNode[];
};

export type ApiServerHook<TConfig = unknown> = {
  registerMiddleware?: (app: unknown) => void;
  registerEventHandlers?: (bus: unknown) => void;
  contextFactory?: () => TConfig;
};

export type ManagementNavSectionMeta = {
  label: string;
  href: string;
  icon?: string;
};

export type ManagementHook = {
  navSection?: ManagementNavSectionMeta;
  SettingsForm?: unknown;
};
```

The `unknown` placeholders for `app`, `bus`, and `SettingsForm` keep the SDK free of
concrete framework imports. Hosts narrow these via their own wiring code.

## Pure helper: `extensionEnvKey`

`src/lib/envKey.ts` exports a pure function that turns a manifest id and a config key
into the canonical env-var name used by section 5 of the proposal:

```ts
export function extensionEnvKey(id: string, configKey: string): string {
  const normalizedId = id.toUpperCase().replace(/-/g, '_');
  const normalizedKey = configKey.toUpperCase().replace(/-/g, '_');
  return `EXTENSION_${normalizedId}_${normalizedKey}`;
}

export function extensionEnabledEnvKey(id: string): string {
  return `${extensionEnvKey(id, 'enabled').replace(/_ENABLED$/, '_ENABLED')}`;
}
```

Tests in `src/lib/envKey.test.ts` cover:

- `id: 'cloudflare-web-analytics'`, `key: 'token'` ->
  `'EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN'`.
- `extensionEnabledEnvKey('cloudflare-web-analytics')` ->
  `'EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED'`.
- Hyphens, underscores, and mixed case in `id` all normalize identically.

## Resolver placeholder

`src/config/resolveExtensionConfig.ts` exports the signature only:

```ts
import type { ExtensionManifest } from '../types/manifest.js';

export type ResolvedExtension<TConfig = unknown> = {
  enabled: boolean;
  config: TConfig;
};

export type ResolveInputs = {
  manifest: ExtensionManifest;
  env: Record<string, string | undefined>;
  dbRow: { enabled: boolean; config: Record<string, unknown> } | null;
  masterSwitchEnabled: boolean;
};

export function resolveExtensionConfig<TConfig = unknown>(
  inputs: ResolveInputs
): ResolvedExtension<TConfig> {
  // Phase 03 implements this.
  throw new Error('resolveExtensionConfig: not implemented (see phase 03)');
}
```

The placeholder lets `02` and `03` import the signature without circular dependency
work. `03` replaces the body and adds a full test suite.

## Index

`src/index.ts` re-exports types and helpers:

```ts
export * from './types/manifest.js';
export * from './types/hooks.js';
export * from './types/configSchema.js';
export * from './config/resolveExtensionConfig.js';
export * from './lib/envKey.js';
```

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/extensions-sdk
./scripts/nix/with-env npm run build -w @podverse/extensions-sdk
./scripts/nix/with-env npm run test -w @podverse/extensions-sdk
```

The unit tests at this stage only cover `envKey.ts`; the resolver placeholder
intentionally throws and has a single "throws as expected" test that phase `03`
replaces.
