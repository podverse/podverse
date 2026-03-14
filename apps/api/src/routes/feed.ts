import { config } from '@api/config/index.js';
import { FeedController } from '@api/controllers/feed.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/feed`, router);

router.get('/:podcast_index_id', asyncHandler(FeedController.getByPodcastIndexId));

export const feedRouter = router;
