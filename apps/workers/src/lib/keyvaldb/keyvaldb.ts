import type { Redis } from 'ioredis';

import type { KeyvaldbConfig } from '@workers/config/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

let keyvaldb: Redis | null = null;
let defaultCacheTTLSeconds: number | null = null;

export const initKeyvaldb = (client: Redis, config: KeyvaldbConfig): void => {
  keyvaldb = client;
  defaultCacheTTLSeconds = config.cacheTTLSeconds;

  let connectionErrorLogged = false;

  keyvaldb.on('error', (err: Error) => {
    if (!connectionErrorLogged) {
      connectionErrorLogged = true;
      getLoggerService().debug(`KeyValDB connection error: ${err.message}`);
    }
  });

  keyvaldb.on('connect', () => {
    connectionErrorLogged = false;
  });
};

const getKeyvaldb = (): Redis => {
  if (!keyvaldb) {
    throw new Error('KeyValDB not initialized; call initKeyvaldb in workers startup');
  }
  return keyvaldb;
};

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  try {
    const val = await getKeyvaldb().get(key);
    if (!val) {
      return null;
    }
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson<T>(
  key: string,
  value: T,
  ttlSeconds: number | null = defaultCacheTTLSeconds
): Promise<void> {
  try {
    const ttl = ttlSeconds ?? 0;
    const str = JSON.stringify(value);
    if (ttl > 0) {
      await getKeyvaldb().set(key, str, 'EX', ttl);
    } else {
      await getKeyvaldb().set(key, str);
    }
  } catch {
    // swallow
  }
}
