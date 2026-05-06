import { config } from '@api/config/index.js';
import { Router } from 'express';

import { membershipRouter } from './membership.js';

const productSegmentRouter = Router();

productSegmentRouter.use('/membership', membershipRouter);

export const productRouter = Router();

productRouter.use(`${config.api.prefix}${config.api.version}/product`, productSegmentRouter);
