import { extensionEnabledEnvKey, extensionEnvKey } from '../lib/envKey.js';
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
    throw new Error(`Extension config invalid for '${manifest.id}': ${error.message}`);
  }
  return value as TConfig;
}
