import type { KeyvaldbConfig } from '@workers/config/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import type { Redis } from 'ioredis';

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
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      getLoggerService().debug('KeyValDB cacheSetJson failed', {
        key,
        error: (error as Error).message,
      });
    }
  }
}

export async function testKeyvaldbConnection(): Promise<boolean> {
  try {
    const pingPromise = getKeyvaldb().ping();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), 5000);
    });
    await Promise.race([pingPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error('KeyValDB connection test failed', {
      error: (error as Error).message,
    });
    return false;
  }
}

export async function waitForKeyvaldbConnection(timeoutMs = 5000): Promise<boolean> {
  const client = getKeyvaldb();
  if (client.status === 'ready') {
    return true;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve(true);
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      clearTimeout(timer);
      client.off('ready', onReady);
      client.off('error', onError);
      client.off('end', onError);
    };

    client.on('ready', onReady);
    client.on('error', onError);
    client.on('end', onError);
  });
}
