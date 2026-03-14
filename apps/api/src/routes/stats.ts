import { config } from '@api/config/index.js';
import { StatsTrackEventAccountController } from '@api/controllers/stats/statsTrackEventAccount.js';
import { StatsTrackEventChannelController } from '@api/controllers/stats/statsTrackEventChannel.js';
import { StatsTrackEventClipController } from '@api/controllers/stats/statsTrackEventClip.js';
import { StatsTrackEventItemController } from '@api/controllers/stats/statsTrackEventItem.js';
import { StatsTrackEventPlaylistController } from '@api/controllers/stats/statsTrackEventPlaylist.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/stats`, router);

router.post('/account', asyncHandler(StatsTrackEventAccountController.create));
router.post('/channel', asyncHandler(StatsTrackEventChannelController.create));
router.post('/clip', asyncHandler(StatsTrackEventClipController.create));
router.post('/item', asyncHandler(StatsTrackEventItemController.create));
router.post('/playlist', asyncHandler(StatsTrackEventPlaylistController.create));

export const statsRouter = router;
