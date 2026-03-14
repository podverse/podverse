import { config } from '@api/config/index.js';
import { ItemSoundbiteController } from '@api/controllers/itemSoundbite.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/item-soundbite`, router);

router.get('/:item_soundbite_id_text', asyncHandler(ItemSoundbiteController.getItemSoundbiteById));
router.get(
  '/channel/:channel_id_text',
  asyncHandler(ItemSoundbiteController.getManyByChannelIdText)
);
router.get('/item/:item_id_text', asyncHandler(ItemSoundbiteController.getManyByItemIdText));

export const itemSoundbiteRouter = router;
