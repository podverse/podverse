import { config } from '@api/config/index.js';
import { MembershipController } from '@api/controllers/membership.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/membership`, router);

router.get('/pricing', asyncHandler(MembershipController.getPricing));

export const membershipRouter = router;
