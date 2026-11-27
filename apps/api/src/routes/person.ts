import { config } from '@api/config/index.js';
import { PersonController } from '@api/controllers/person.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/person`, router);

router.get('/', asyncHandler(PersonController.list));
router.get('/:id_text', asyncHandler(PersonController.getByIdText));
router.get('/:id_text/channels', asyncHandler(PersonController.channels));
router.get('/:id_text/items', asyncHandler(PersonController.items));

export const personRouter = router;
