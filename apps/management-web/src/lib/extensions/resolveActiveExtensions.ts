import type { ExtensionManifest, ResolvedExtension } from '@podverse/extensions-sdk';
import { resolveExtensionConfig } from '@podverse/extensions-sdk';

import { getRuntimeConfig } from '../../config/runtime-config-store';
import { extensionRegistry } from './registry';

import 'server-only';

export type ActiveExtension = {
  manifest: ExtensionManifest;
  resolved: ResolvedExtension<Record<string, unknown>>;
};

function mergeEnvWithRuntimeConfig(): Record<string, string | undefined> {
  const runtimeEnv = getRuntimeConfig().env;
  const runtimeRecord: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(runtimeEnv)) {
    runtimeRecord[key] = value;
  }

  return {
    ...process.env,
    ...runtimeRecord,
  };
}

function stripSecrets(
  manifest: ExtensionManifest,
  resolved: ResolvedExtension<Record<string, unknown>>
): ResolvedExtension<Record<string, unknown>> {
  const strippedConfig = { ...resolved.config };

  for (const [fieldName, fieldMeta] of Object.entries(manifest.configSchema.fields)) {
    if (fieldMeta.secret === true) {
      delete strippedConfig[fieldName];
    }
  }

  return {
    ...resolved,
    config: strippedConfig,
  };
}

export async function resolveActiveExtensions(): Promise<ActiveExtension[]> {
  const env = mergeEnvWithRuntimeConfig();
  const masterSwitchEnabled = env.EXTENSIONS_ENABLED === 'true';
  if (masterSwitchEnabled === false) {
    return [];
  }

  const results: ActiveExtension[] = [];
  for (const manifest of extensionRegistry) {
    const resolved = resolveExtensionConfig<Record<string, unknown>>({
      manifest,
      env,
      dbRow: null,
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
