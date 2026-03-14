import { config } from '@api/config/index.js';
import { MembershipClaimTokenController } from '@api/controllers/membershipClaimToken.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();
const membershipClaimTokenController = new MembershipClaimTokenController();

router.use(`${config.api.prefix}${config.api.version}/membership-claim-token`, router);

router.post(
  '/claim/:token',
  asyncHandler((req, res) => membershipClaimTokenController.claim(req, res))
);

export const membershipClaimTokenRouter = router;
