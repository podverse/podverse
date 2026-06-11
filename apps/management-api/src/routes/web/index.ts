import { config } from '@management-api/config/index.js';
import express from 'express';

import { embedDemoRouter } from './embedDemo.js';

const webSegmentRouter = express.Router();

webSegmentRouter.use('/embed-demo', embedDemoRouter);

export const webRouter = express.Router();

webRouter.use(`${config.api.prefix}${config.api.version}/web`, webSegmentRouter);
