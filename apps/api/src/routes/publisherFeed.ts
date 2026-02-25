import { Router } from 'express';
import { config } from '@api/config/index.js';
import { PublisherFeedController } from '@api/controllers/publisherFeed.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/publisher-feed`, router);

router.get(
  '/channel/:idOrIdText',
  asyncHandler(PublisherFeedController.getPublisherFeedRemoteItemsForChannel)
);

export const publisherFeedRouter = router;
