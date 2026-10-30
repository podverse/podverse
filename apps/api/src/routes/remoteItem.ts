import { config } from '@api/config/index.js';
import { RemoteItemController } from '@api/controllers/remoteItem.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/remote-item`, router);

router.get('/channel/:idOrIdText', asyncHandler(RemoteItemController.getRemoteItemsForChannel));

export const remoteItemRouter = router;
