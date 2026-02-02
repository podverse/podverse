import { Router } from 'express';
import { config } from '@api/config/index.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { PodcastIndexController } from '@api/controllers/externalServices/podcastIndex.js';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/external-services`, router);

router.get(
  '/podcast-index/feed/:podcast_index_id',
  asyncHandler(PodcastIndexController.podcastById)
);

router.get('/podcast-index/search/podcasts', asyncHandler(PodcastIndexController.searchPodcasts));

export const externalServicesRouter = router;
