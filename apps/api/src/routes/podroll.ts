import { Router } from 'express';
import { config } from '@api/config/index.js';
import { PodrollController } from '@api/controllers/podroll.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/podroll`, router);

router.get('/channel/:idOrIdText', asyncHandler(PodrollController.getPodrollForChannel));

export const podrollRouter = router;
