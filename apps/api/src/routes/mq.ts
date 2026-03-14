import { config } from '@api/config/index.js';
import { MQController } from '@api/controllers/mq/mq.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

import { OnDemandParserEventType } from '@podverse/helpers';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/mq`, router);

router.post(
  '/rss/add/on-demand',
  asyncHandler(MQController.rssAddToOnDemandMQ(OnDemandParserEventType.ADD))
);

router.post(
  '/rss/refresh/on-demand',
  asyncHandler(MQController.rssAddToOnDemandMQ(OnDemandParserEventType.REFRESH))
);

export const mqRouter = router;
