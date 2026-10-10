import { config } from '@api/config/index.js';
import { PopularityTrackingLegalController } from '@api/controllers/legal/popularityTracking.js';
import { TermsLegalController } from '@api/controllers/legal/terms.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/legal`, router);

router.get('/popularity-tracking', asyncHandler(PopularityTrackingLegalController.get));
router.get('/terms', asyncHandler(TermsLegalController.get));

export const legalRouter = router;
