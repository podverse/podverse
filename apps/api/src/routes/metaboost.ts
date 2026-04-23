import { config } from '@api/config/index.js';
import { MetaboostMbrssV1AppAssertionController } from '@api/controllers/metaboost/mbrssV1AppAssertion.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { metaboostMintConsumeRateLimitMiddleware } from '@api/middleware/metaboostMintConsumeRateLimit.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/metaboost`, router);

router.get(
  '/mbrss-v1/mint-app-assertion/rate-limit-status',
  asyncHandler(MetaboostMbrssV1AppAssertionController.mintRateLimitStatus)
);

/** Session required; one mint per authenticated user per minute (shared store with GET rate-limit-status). */
router.post(
  '/mbrss-v1/mint-app-assertion',
  metaboostMintConsumeRateLimitMiddleware,
  asyncHandler(MetaboostMbrssV1AppAssertionController.mintAppAssertionBody)
);

export const metaboostRouter = router;
