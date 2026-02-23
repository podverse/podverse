import { Router } from 'express';
import { BoostboxController } from '@api/controllers/metaboost/boostbox.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';

const router = Router();

router.post('/boost', asyncHandler(BoostboxController.boost));

export const boostboxRouter = router;
