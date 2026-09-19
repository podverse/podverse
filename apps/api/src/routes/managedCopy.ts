import { config } from '@api/config/index.js';
import { ManagedCopyController } from '@api/controllers/managedCopy.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/managed-copy`, router);

router.get('/:slug', asyncHandler(ManagedCopyController.get));

export const managedCopyRouter = router;
