import { config } from '@api/config/index.js';
import { Redis } from 'ioredis';

import type { SecondFactorDeps, SecondFactorKeyValue } from '@podverse/helpers-backend';
import {
  createSecondFactorChallengeRepository,
  createSecondFactorEmailRateLimiter,
  SECOND_FACTOR_MAX_ATTEMPTS,
} from '@podverse/helpers-backend';
import { createAccountSecondFactorRepository } from '@podverse/orm';

const CONNECTION_NAME = 'podverse-api-second-factor';

let connection: Redis | null = null;

function redis(): Redis {
  if (connection === null) {
    connection = new Redis({
      host: config.keyvaldb.host,
      port: config.keyvaldb.port,
      password: config.keyvaldb.password,
      connectionName: CONNECTION_NAME,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }
  return connection;
}

function keyValue(client: Redis): SecondFactorKeyValue {
  return {
    async get(key) {
      return client.get(key);
    },
    async set(key, value, ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    },
    async replace(key, value) {
      await client.set(key, value, 'KEEPTTL');
    },
    async del(key) {
      await client.del(key);
    },
    async increment(key, ttlSeconds) {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, ttlSeconds);
      }
      return count;
    },
    async ttlSeconds(key) {
      const ttl = await client.ttl(key);
      return ttl > 0 ? ttl : 0;
    },
  };
}

export function mainSecondFactorDeps(): SecondFactorDeps {
  const store = keyValue(redis());
  return {
    mode: () => config.secondFactor.mode(),
    keyHex: () => config.secondFactor.keyHex(),
    issuer: () => config.brandName,
    repository: createAccountSecondFactorRepository(),
    challenges: createSecondFactorChallengeRepository(store, 'acct'),
    emailRateLimit: createSecondFactorEmailRateLimiter(
      store,
      {
        perAccountHour: config.secondFactor.emailPerAccountHour(),
        perAccountDay: config.secondFactor.emailPerAccountDay(),
        perIpHour: config.secondFactor.emailPerIpHour(),
      },
      'acct'
    ),
  };
}

const SETTINGS_ATTEMPT_TTL_SECONDS = 10 * 60;

export async function settingsCodeAttempts(accountId: number): Promise<number> {
  const raw = await keyValue(redis()).get(`sf:acct:settings:${String(accountId)}`);
  const count = Number(raw ?? '0');
  return Number.isInteger(count) && count > 0 ? count : 0;
}

/** True once this account has missed five settings codes inside the window. */
export async function noteSettingsCodeFailure(accountId: number): Promise<boolean> {
  const count = await keyValue(redis()).increment(
    `sf:acct:settings:${String(accountId)}`,
    SETTINGS_ATTEMPT_TTL_SECONDS
  );
  return count >= SECOND_FACTOR_MAX_ATTEMPTS;
}

export async function clearSettingsCodeFailures(accountId: number): Promise<void> {
  await keyValue(redis()).del(`sf:acct:settings:${String(accountId)}`);
}

export async function closeSecondFactorRedis(): Promise<void> {
  if (connection === null) {
    return;
  }
  const current = connection;
  connection = null;
  await current.quit();
}
