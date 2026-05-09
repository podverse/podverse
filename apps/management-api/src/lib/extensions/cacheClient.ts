import type { ExtensionCacheClient } from '@podverse/orm';

let extensionCacheClient: ExtensionCacheClient | null = null;
let isInitialized = false;

export async function getExtensionCacheClient(): Promise<ExtensionCacheClient | null> {
  if (isInitialized) {
    return extensionCacheClient;
  }

  isInitialized = true;

  const host = process.env.KEYVALDB_HOST;
  const portRaw = process.env.KEYVALDB_PORT;
  if (!host || !portRaw) {
    extensionCacheClient = null;
    return extensionCacheClient;
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    extensionCacheClient = null;
    return extensionCacheClient;
  }

  try {
    const { Redis } = await import('ioredis');
    extensionCacheClient = new Redis({
      host,
      port,
      password: process.env.KEYVALDB_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    }) as unknown as ExtensionCacheClient;
    return extensionCacheClient;
  } catch {
    extensionCacheClient = null;
    return extensionCacheClient;
  }
}
