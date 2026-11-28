import type {
  SecondFactorChallenge,
  SecondFactorChallengeRepository,
  SecondFactorEmailAllowance,
  SecondFactorEmailRateLimiter,
} from './secondFactor.js';
import {
  SECOND_FACTOR_EMAIL_MAX_PER_ACCOUNT_DAY,
  SECOND_FACTOR_EMAIL_MAX_PER_ACCOUNT_HOUR,
  SECOND_FACTOR_EMAIL_MAX_PER_IP_HOUR,
} from './secondFactor.js';

const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

export type SecondFactorKeyValue = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Replaces the value and keeps the key's existing TTL. */
  replace(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  /** Returns the count after this increment. Sets the TTL when the key is new. */
  increment(key: string, ttlSeconds: number): Promise<number>;
  /** Seconds until the key expires, or 0 when it has none. */
  ttlSeconds(key: string): Promise<number>;
};

function isChallenge(value: unknown): value is SecondFactorChallenge {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('ownerId' in value) || typeof value.ownerId !== 'number') {
    return false;
  }
  if (!('purpose' in value) || (value.purpose !== 'login' && value.purpose !== 'setup')) {
    return false;
  }
  if (!('client' in value) || (value.client !== 'web' && value.client !== 'mobile')) {
    return false;
  }
  if (!('attempts' in value) || typeof value.attempts !== 'number') {
    return false;
  }
  return true;
}

export function createSecondFactorChallengeRepository(
  store: SecondFactorKeyValue,
  ownerPrefix = 'acct'
): SecondFactorChallengeRepository {
  const keyFor = (tokenHash: string) => `sf:${ownerPrefix}:ch:${tokenHash}`;
  return {
    async save(tokenHash, challenge, ttlSeconds) {
      const key = keyFor(tokenHash);
      const existing = await store.get(key);
      const json = JSON.stringify(challenge);
      if (existing === null) {
        await store.set(key, json, ttlSeconds);
        return;
      }
      await store.replace(key, json);
    },
    async read(tokenHash) {
      const raw = await store.get(keyFor(tokenHash));
      if (raw === null) {
        return null;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isChallenge(parsed)) {
          return null;
        }
        return {
          ...parsed,
          deviceLabel:
            'deviceLabel' in parsed &&
            (parsed.deviceLabel === null || typeof parsed.deviceLabel === 'string')
              ? parsed.deviceLabel
              : null,
          emailCodeHash:
            'emailCodeHash' in parsed && typeof parsed.emailCodeHash === 'string'
              ? parsed.emailCodeHash
              : null,
          emailCodeExpiresAtMs:
            'emailCodeExpiresAtMs' in parsed && typeof parsed.emailCodeExpiresAtMs === 'number'
              ? parsed.emailCodeExpiresAtMs
              : null,
        };
      } catch {
        return null;
      }
    },
    async remove(tokenHash) {
      await store.del(keyFor(tokenHash));
    },
  };
}

export type SecondFactorEmailLimits = {
  perAccountHour: number;
  perAccountDay: number;
  perIpHour: number;
};

export function createSecondFactorEmailRateLimiter(
  store: SecondFactorKeyValue,
  limits: SecondFactorEmailLimits = {
    perAccountHour: SECOND_FACTOR_EMAIL_MAX_PER_ACCOUNT_HOUR,
    perAccountDay: SECOND_FACTOR_EMAIL_MAX_PER_ACCOUNT_DAY,
    perIpHour: SECOND_FACTOR_EMAIL_MAX_PER_IP_HOUR,
  },
  ownerPrefix = 'acct'
): SecondFactorEmailRateLimiter {
  return {
    async consume(ownerId, ip): Promise<SecondFactorEmailAllowance> {
      const hourKey = `sf:email:${ownerPrefix}:${String(ownerId)}:h`;
      const dayKey = `sf:email:${ownerPrefix}:${String(ownerId)}:d`;
      const ipKey = `sf:email:${ownerPrefix}:ip:${ip}:h`;
      const hourCount = Number((await store.get(hourKey)) ?? '0');
      const dayCount = Number((await store.get(dayKey)) ?? '0');
      const ipCount = Number((await store.get(ipKey)) ?? '0');
      if (
        hourCount >= limits.perAccountHour ||
        dayCount >= limits.perAccountDay ||
        ipCount >= limits.perIpHour
      ) {
        const ttls = await Promise.all([
          store.ttlSeconds(hourKey),
          store.ttlSeconds(dayKey),
          store.ttlSeconds(ipKey),
        ]);
        const retryAfterMs = Math.max(...ttls, 1) * 1000;
        return { allowed: false, retryAfterMs };
      }
      await store.increment(hourKey, HOUR_SECONDS);
      await store.increment(dayKey, DAY_SECONDS);
      await store.increment(ipKey, HOUR_SECONDS);
      return { allowed: true };
    },
  };
}
