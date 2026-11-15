import { config } from '@api/config/index.js';
import {
  LegacyPodcastLookupController,
  legacyPodcastLookupInstallRateLimit,
  legacyPodcastLookupIpRateLimit,
} from '@api/controllers/legacy.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/legacy`, router);

router.post(
  '/podcast/lookup',
  legacyPodcastLookupIpRateLimit,
  legacyPodcastLookupInstallRateLimit,
  asyncHandler(LegacyPodcastLookupController.lookup)
);

export const legacyRouter = router;
