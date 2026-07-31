import { ensureAuthenticated } from '@api/lib/auth/index.js';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { buildRateLimit429Body, deriveRateLimitResetTimeMs } from './rateLimitPayload.js';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  /** Optional custom key generator (e.g., per-user). */
  keyGenerator?: (req: Request) => string;
  /** If true, wraps limiter in ensureAuthenticated before applying rate limit. */
  requireAuth?: boolean;
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
  const { windowMs, max, keyGenerator } = options;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    handler: buildHandler(windowMs),
  });
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
}): AuthRateLimitMiddleware {
  const buildUserKey = (userId: number | string) => `user:${userId}`;
  const keyGenerator = (req: Request) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }
    return buildUserKey(userId);
  };
  const limiter = createLimiter({ ...options, keyGenerator });
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
      { skipMembershipStatus: true }
    );
  };
  return Object.assign(middleware, {
    resetForUser: (userId: number | string) => {
      limiter.resetKey(buildUserKey(userId));
    },
  });
}

/**
 * Generic endpoint rate limiting (IP-based, default express-rate-limit behavior).
 * Does not require authentication and returns JSON with timing details when limited.
 */
export function rateLimitEndpoint(options: { windowMs: number; max: number }) {
  return createLimiter(options);
}
