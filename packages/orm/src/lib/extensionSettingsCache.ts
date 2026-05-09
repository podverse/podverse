// Define a minimal interface for cache client (Valkey/Redis compatible)
export interface ExtensionCacheClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  publish(channel: string, message: string): Promise<number>;
  psubscribe(pattern: string): Promise<void>;
  on(event: string, handler: (pattern: string, channel: string, message: string) => void): void;
}

/** Safety-net TTL only; hot path invalidates via `extension:invalidated:<id>`. */
export const EXTENSION_CACHE_TTL_SECONDS = 300;
export const EXTENSION_INVALIDATION_CHANNEL = 'extension:invalidated';

const CACHE_KEY_PREFIX = 'extension';
const NULL_SENTINEL = '__null__';

export function extensionCacheKey(id: string): string {
  return `${CACHE_KEY_PREFIX}:${id}`;
}

export async function readCachedExtensionSetting(
  client: ExtensionCacheClient,
  id: string
): Promise<{ enabled: boolean; config: Record<string, unknown> } | null> {
  try {
    const cached = await client.get(extensionCacheKey(id));
    if (cached === null) {
      return null;
    }
    if (cached === NULL_SENTINEL) {
      return null;
    }
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function writeCachedExtensionSetting(
  client: ExtensionCacheClient,
  id: string,
  value: { enabled: boolean; config: Record<string, unknown> } | null
): Promise<void> {
  try {
    const key = extensionCacheKey(id);
    const serialized = value === null ? NULL_SENTINEL : JSON.stringify(value);
    await client.setex(key, EXTENSION_CACHE_TTL_SECONDS, serialized);
  } catch {
    // Silently fail on cache write errors; stale data is acceptable
  }
}

export async function publishExtensionInvalidation(
  client: ExtensionCacheClient,
  id: string
): Promise<void> {
  try {
    await client.publish(`${EXTENSION_INVALIDATION_CHANNEL}:${id}`, id);
  } catch {
    // Silently fail on publish errors
  }
}

export async function deleteExtensionCacheKey(
  client: ExtensionCacheClient,
  id: string
): Promise<void> {
  try {
    await client.del(extensionCacheKey(id));
  } catch {
    // Silently fail on delete errors
  }
}

export async function subscribeToExtensionInvalidations(
  client: ExtensionCacheClient,
  onInvalidate: (id: string) => Promise<void>
): Promise<void> {
  try {
    await client.psubscribe(`${EXTENSION_INVALIDATION_CHANNEL}:*`);
    client.on('pmessage', async (_pattern: string, _channel: string, message: string) => {
      await deleteExtensionCacheKey(client, message);
      await onInvalidate(message);
    });
  } catch {
    // Silently fail on subscribe errors
  }
}
