import { config } from '@api/config/index.js';
import { MetaboostMbrssV1AppAssertionController } from '@api/controllers/metaboost/mbrssV1AppAssertion.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/metaboost`, router);

router.post(
  '/mbrss-v1/mint-app-assertion',
  MetaboostMbrssV1AppAssertionController.mintRateLimiter,
  asyncHandler(MetaboostMbrssV1AppAssertionController.mintAppAssertionBody)
);

export const metaboostRouter = router;
