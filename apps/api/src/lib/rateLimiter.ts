import { ensureAuthenticated, optionalEnsureAuthenticated } from '@api/lib/auth/index.js';
import type { NextFunction, Request, Response } from 'express';
import type { Store } from 'express-rate-limit';
import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit';

import type { ApiKeyPermissionRequirement } from '@podverse/helpers';

import { buildRateLimit429Body, deriveRateLimitResetTimeMs } from './rateLimitPayload.js';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  /** Optional custom key generator (e.g., per-user). */
  keyGenerator?: (req: Request) => string;
  /** If true, wraps limiter in ensureAuthenticated before applying rate limit. */
  requireAuth?: boolean;
  /** A store the caller keeps a handle on (to reset it); omitted, the limiter makes its own. */
  store?: Store;
}

function buildHandler(windowMs: number) {
  return (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resetTime = (req as any).rateLimit?.resetTime as Date | undefined;
    const nowMs = Date.now();
    const resetTimeMs = deriveRateLimitResetTimeMs(resetTime, windowMs, nowMs);
    const timeUntilResetMs = resetTimeMs - nowMs;
    res.status(429).json(buildRateLimit429Body(timeUntilResetMs));
  };
}

function createLimiter(options: RateLimiterOptions) {
  const { windowMs, max, keyGenerator, store } = options;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    ...(store && { store }),
    handler: buildHandler(windowMs),
  });
}

const buildUserKey = (userId: number | string) => `user:${userId}`;

function readRequestUserId(req: Request): number | null {
  const userId = req.user?.id;
  return typeof userId === 'number' && userId > 0 ? userId : null;
}

function userKeyGenerator(req: Request): string {
  const userId = readRequestUserId(req);
  if (userId === null) {
    throw new Error('Authentication required');
  }
  return buildUserKey(userId);
}

export interface AuthRateLimitMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  /**
   * Reset the accumulated request count for a single user. Primarily for tests:
   * the default express-rate-limit store is in-memory and persists for the
   * process lifetime, so a test that intentionally exhausts the limiter would
   * otherwise bleed 429s into every later test for the same user.
   */
  resetForUser: (userId: number | string) => void;
}

/**
 * Per-user rate limiting requiring authentication.
 * Returns JSON when limit reached.
 */
export function rateLimitAuthEndpoint(options: {
  windowMs: number;
  max: number;
  /**
   * The wrapper authenticates only to key the limiter by account. Endpoints that stay available
   * while terms acceptance is outstanding pass true; their handler still decides the terms gate.
   */
  skipTermsAcceptance?: boolean;
  /** The permission a key needs; omitted, a key is refused here before the handler runs. */
  apiKeyAccess?: ApiKeyPermissionRequirement;
}): AuthRateLimitMiddleware {
  const limiter = createLimiter({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: userKeyGenerator,
  });
  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    ensureAuthenticated(
      req,
      res,
      () => {
        try {
          limiter(req, res, next);
        } catch {
          res.status(401).json({ error: 'Authentication required' });
        }
      },
      {
        skipMembershipStatus: true,
        skipTermsAcceptance: options.skipTermsAcceptance === true,
        apiKeyAccess: options.apiKeyAccess,
      }
    );
  };
  return Object.assign(middleware, {
    resetForUser: (userId: number | string) => {
      limiter.resetKey(buildUserKey(userId));
    },
  });
}

export interface OptionalAuthRateLimitMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  /**
   * Test support: both budgets live in the API process's memory, so a test that exhausts one
   * would otherwise bleed 429s into later tests. Resets one account's count.
   */
  resetForUser: (userId: number | string) => void;
  /** Test support, as resetForUser: clears every IP address count. */
  resetAddressBudgets: () => Promise<void>;
}

/**
 * For public endpoints whose budget follows the account when there is one and the IP address when
 * there is not, each with its own limit. A request with an invalid token, or with a key that lacks
 * the permission, is refused before either limiter runs. An API key request has an account, so it
 * counts per account.
 */
export function rateLimitOptionalAuthEndpoint(options: {
  account: { windowMs: number; max: number };
  address: { windowMs: number; max: number };
  /** The permission a key needs; omitted, a key is refused here before the handler runs. */
  apiKeyAccess?: ApiKeyPermissionRequirement;
}): OptionalAuthRateLimitMiddleware {
  const accountLimiter = createLimiter({
    windowMs: options.account.windowMs,
    max: options.account.max,
    keyGenerator: userKeyGenerator,
  });
  const addressStore = new MemoryStore();
  const addressLimiter = createLimiter({
    windowMs: options.address.windowMs,
    max: options.address.max,
    keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip ?? '')}`,
    store: addressStore,
  });
  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    optionalEnsureAuthenticated(
      req,
      res,
      () => {
        if (readRequestUserId(req) !== null) {
          accountLimiter(req, res, next);
        } else {
          addressLimiter(req, res, next);
        }
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: options.apiKeyAccess,
      }
    );
  };
  return Object.assign(middleware, {
    resetForUser: (userId: number | string) => {
      accountLimiter.resetKey(buildUserKey(userId));
    },
    resetAddressBudgets: () => addressStore.resetAll(),
  });
}

/**
 * Generic endpoint rate limiting (IP-based, default express-rate-limit behavior).
 * Does not require authentication and returns JSON with timing details when limited.
 */
export function rateLimitEndpoint(options: { windowMs: number; max: number }) {
  return createLimiter(options);
}

/**
 * IP-based limiting with a separate budget per scope, so a flood of one processor's webhooks
 * cannot starve another processor delivering from the same address.
 */
export function rateLimitEndpointPerScope(
  options: { windowMs: number; max: number },
  scope: string
) {
  return createLimiter({
    ...options,
    keyGenerator: (req: Request) => `${ipKeyGenerator(req.ip ?? '')}:${scope}`,
  });
}
