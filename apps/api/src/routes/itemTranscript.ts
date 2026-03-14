import { config } from '@api/config/index.js';
import { ItemTranscriptController } from '@api/controllers/itemTranscript.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/item-transcript`, router);

router.get('/:item_id_text', asyncHandler(ItemTranscriptController.getByIdOrIdText));

export const itemTranscriptRouter = router;
