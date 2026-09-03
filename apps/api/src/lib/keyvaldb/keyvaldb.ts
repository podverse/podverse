import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import { Redis } from 'ioredis';

import { isLogLevelDebug } from '@podverse/helpers';

/** Between reconnect attempts after KeyVal drops mid-flight (~1/min; avoids noisy rapid retries). */
const RECONNECT_DELAY_MS = 60_000;

const keyvaldb = new Redis({
  host: config.keyvaldb.host,
  port: config.keyvaldb.port,
  password: config.keyvaldb.password,
  retryStrategy: () => {
    // Never return null — keep reconnecting at a steady, low frequency.
    return RECONNECT_DELAY_MS;
  },
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

// Record whether the connection error has already been logged.
let connectionErrorLogged = false;

// Handle connection errors to prevent unhandled error events
keyvaldb.on('error', (err: Error) => {
  if (!connectionErrorLogged) {
    connectionErrorLogged = true;
    loggerService.debug(`KeyValDB connection error: ${err.message}`);
  }
});

keyvaldb.on('connect', () => {
  connectionErrorLogged = false;
});

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  try {
    const val = await keyvaldb.get(key);
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
  expiration: number = config.keyvaldb.cacheExpiration
): Promise<void> {
  try {
    const str = JSON.stringify(value);
    await keyvaldb.set(key, str, 'EX', expiration);
  } catch {
    // swallow
  }
}

const PING_TIMEOUT_MS = 5000;

/**
 * Tests the connection to KeyValDB by sending a PING command.
 * @param logErrorMessage - when true, logs the ping failure reason in debug mode
 * @returns Promise<boolean> - true if connection is available, false otherwise
 */
export async function testKeyvaldbConnection(logErrorMessage: boolean = true): Promise<boolean> {
  try {
    const pingPromise = keyvaldb.ping();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), PING_TIMEOUT_MS);
    });
    await Promise.race([pingPromise, timeoutPromise]);
    return true;
  } catch (error) {
    if (logErrorMessage && isLogLevelDebug(config.log.level)) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`KeyValDB status check failed: ${message}`);
    }
    return false;
  }
}

export { keyvaldb };
