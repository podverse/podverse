export function extensionEnvKey(id: string, configKey: string): string {
  const normalizedId = id.toUpperCase().replace(/-/g, '_');
  const normalizedKey = configKey.toUpperCase().replace(/-/g, '_');
  return `EXTENSION_${normalizedId}_${normalizedKey}`;
}

export function extensionEnabledEnvKey(id: string): string {
  return `${extensionEnvKey(id, 'enabled')}`;
}
