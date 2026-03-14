import { BoostboxController } from '@api/controllers/metaboost/boostbox.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.post('/boost', asyncHandler(BoostboxController.boost));

export const boostboxRouter = router;
