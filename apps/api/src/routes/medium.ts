import { Router } from 'express';
import { config } from '@api/config/index.js';
import { MediumController } from '@api/controllers/medium.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/medium-value`, router);

router.get('/', asyncHandler(MediumController.getAll));

export const mediumRouter = router;
