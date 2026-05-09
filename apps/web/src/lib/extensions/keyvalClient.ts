import { Redis } from 'ioredis';

import type { ExtensionCacheClient } from '@podverse/orm';

import 'server-only';

type KeyvalEnv = {
  host: string;
  port: number;
  password: string;
};

let sharedClient: Redis | null = null;
let sharedSubscriber: Redis | null = null;

function readRequiredString(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return value;
}

function readDefinedString(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== 'string') {
    return null;
  }
  return value;
}

function getKeyvalEnv(): KeyvalEnv | null {
  const host = readRequiredString('KEYVALDB_HOST');
  const portRaw = readRequiredString('KEYVALDB_PORT');
  const password = readDefinedString('KEYVALDB_PASSWORD');

  if (host === null || portRaw === null || password === null) {
    return null;
  }

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    password,
  };
}

function createClient(env: KeyvalEnv): Redis {
  return new Redis({
    host: env.host,
    port: env.port,
    password: env.password,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
  });
}

export function getExtensionRedisClient(): Redis | null {
  if (sharedClient !== null) {
    return sharedClient;
  }

  const env = getKeyvalEnv();
  if (env === null) {
    return null;
  }

  sharedClient = createClient(env);
  return sharedClient;
}

export function getExtensionRedisSubscriberClient(): Redis | null {
  if (sharedSubscriber !== null) {
    return sharedSubscriber;
  }

  const client = getExtensionRedisClient();
  if (client === null) {
    return null;
  }

  sharedSubscriber = client.duplicate();
  return sharedSubscriber;
}

export function toExtensionCacheClient(redis: Redis): ExtensionCacheClient {
  return {
    get: (key: string) => redis.get(key),
    setex: async (key: string, seconds: number, value: string): Promise<void> => {
      await redis.setex(key, seconds, value);
    },
    del: async (key: string): Promise<void> => {
      await redis.del(key);
    },
    publish: (channel: string, message: string) => redis.publish(channel, message),
    psubscribe: async (pattern: string): Promise<void> => {
      await redis.psubscribe(pattern);
    },
    on: (event: string, handler: (pattern: string, channel: string, message: string) => void) => {
      redis.on(event, handler);
    },
  };
}

export async function closeExtensionKeyvalClients(): Promise<void> {
  const closeTargets = [sharedSubscriber, sharedClient].filter((client) => client !== null);

  sharedSubscriber = null;
  sharedClient = null;

  await Promise.all(
    closeTargets.map(async (client) => {
      try {
        await client.quit();
      } catch {
        // Best effort shutdown for extension keyval clients.
      }
    })
  );
}
