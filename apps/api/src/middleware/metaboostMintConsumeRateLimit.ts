import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import {
  buildMetaboostMintRateLimit429Body,
  tryConsumeMetaboostMintRateLimit,
} from '@api/lib/metaboostMintRateLimit.js';
import type { NextFunction, Request, Response } from 'express';

/**
 * After authentication: consume MetaBoost mint rate limit (shared with GET rate-limit-status peek).
 */
export function metaboostMintConsumeRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  ensureAuthenticated(
    req,
    res,
    () => {
      const user = getAuthenticatedUser(req);
      const info = tryConsumeMetaboostMintRateLimit(user.id);
      if (!info.allowed) {
        res.status(429).json(buildMetaboostMintRateLimit429Body(info));
        return;
      }
      next();
    },
    { skipMembershipStatus: true }
  );
}
