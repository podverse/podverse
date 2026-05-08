# Phase 03 — Host resolver and cache

Implement the resolution-order logic from
[docs/proposals/EXTENSIONS.md](../../../../docs/proposals/EXTENSIONS.md) section 5,
add a small Valkey cache layer, and stub empty registries in each host app so
phases `04`, `05`, and `06` have stable import paths.

## Resolver in the SDK

Replace the placeholder body in
`packages/extensions-sdk/src/config/resolveExtensionConfig.ts` from phase `01` with
the full implementation.

```ts
import type { ExtensionManifest } from '../types/manifest.js';
import { extensionEnabledEnvKey, extensionEnvKey } from '../lib/envKey.js';

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
  const { manifest, env, dbRow, masterSwitchEnabled } = inputs;

  if (masterSwitchEnabled !== true) {
    return { enabled: false, config: {} as TConfig };
  }

  if (dbRow !== null) {
    const validated = validateConfig<TConfig>(manifest, dbRow.config);
    return { enabled: dbRow.enabled === true, config: validated };
  }

  const envEnabledRaw = env[extensionEnabledEnvKey(manifest.id)];
  if (envEnabledRaw !== 'true') {
    return { enabled: false, config: {} as TConfig };
  }

  const envConfig = readEnvConfig(manifest, env);
  const validated = validateConfig<TConfig>(manifest, envConfig);
  return { enabled: true, config: validated };
}

function readEnvConfig(
  manifest: ExtensionManifest,
  env: Record<string, string | undefined>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const fieldName of Object.keys(manifest.configSchema.fields)) {
    const value = env[extensionEnvKey(manifest.id, fieldName)];
    if (value !== undefined) {
      result[fieldName] = value;
    }
  }
  return result;
}

function validateConfig<TConfig>(
  manifest: ExtensionManifest,
  raw: Record<string, unknown>
): TConfig {
  const { value, error } = manifest.configSchema.joi.validate(raw, {
    stripUnknown: true,
  });
  if (error !== undefined) {
    throw new Error(
      `Extension config invalid for '${manifest.id}': ${error.message}`
    );
  }
  return value as TConfig;
}
```

## Resolver tests

`packages/extensions-sdk/src/config/resolveExtensionConfig.test.ts` covers every
branch of the resolution flowchart in proposal section 5:

- Master switch off -> `{ enabled: false, config: {} }`, regardless of DB or env.
- Master switch on, DB row present, `dbRow.enabled = true` -> uses DB config.
- Master switch on, DB row present, `dbRow.enabled = false` -> `enabled: false` but
  config still validated against the schema.
- Master switch on, no DB row, env `..._ENABLED` missing -> inert.
- Master switch on, no DB row, env `..._ENABLED=false` -> inert.
- Master switch on, no DB row, env `..._ENABLED=true` -> uses env config.
- Joi validation failure throws with a helpful message that includes the manifest id.
- `stripUnknown: true` — extra keys on `dbRow.config` are dropped.

Reference manifest used in tests: a small in-test fixture with two fields
(`token: required string`, `beaconUrl: optional string`).

## Valkey cache helpers

Decide where the helpers live based on existing repo conventions:

- If `packages/orm` already exposes Valkey helpers, add `extensionSettingsCache.ts`
  alongside them.
- Otherwise, add a new module under `packages/orm/src/lib/extensionSettingsCache.ts`.

Helpers exposed:

```ts
export const EXTENSION_CACHE_TTL_SECONDS = 30;
export function extensionCacheKey(id: string): string;
export async function readCachedExtensionSetting(
  client: ValkeyClient,
  id: string
): Promise<{ enabled: boolean; config: Record<string, unknown> } | null>;
export async function writeCachedExtensionSetting(
  client: ValkeyClient,
  id: string,
  value: { enabled: boolean; config: Record<string, unknown> } | null
): Promise<void>;
export async function invalidateCachedExtensionSetting(
  client: ValkeyClient,
  id: string
): Promise<void>;
```

`null` is a valid cache value meaning "no DB row" — caching the absence prevents the
common case (no row) from hitting the DB on every render. Use a sentinel string in the
serialized payload (e.g. `__null__`) or two separate keys; pick whatever matches the
repo's existing cache patterns.

Unit tests for the cache helpers go alongside.

## Per-app empty registries

Stub the registries so phases `04`, `05`, and `06` can import a stable path:

- `apps/web/src/lib/extensions/registry.ts`
- `apps/management-web/src/lib/extensions/registry.ts`
- `apps/api/src/lib/extensions/registry.ts` (created here even though phase 1 does not
  use it; keeping all three symmetric simplifies the future Phase 2 work)

Each file:

```ts
import type { ExtensionManifest } from '@podverse/extensions-sdk';

export const extensionRegistry: ExtensionManifest[] = [];
```

Phase `07` adds the Cloudflare manifest to the web and management-web registries.

## Verification

```bash
./scripts/nix/with-env npm run test -w @podverse/extensions-sdk
./scripts/nix/with-env npm run test -w @podverse/orm
./scripts/nix/with-env npm run lint
```

The resolver test suite is the gating signal here — every branch of section 5 must
have a named test case.
