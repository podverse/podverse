import { config } from '@mgmt-api/config/index.js';
import express from 'express';

import { productPricingRouter } from './pricing.js';
import { productMembershipRouter } from './productMembership.js';

const productSegmentRouter = express.Router();

productSegmentRouter.use('/membership', productMembershipRouter);
productSegmentRouter.use('/pricing', productPricingRouter);

export const productRouter = express.Router();

productRouter.use(`${config.api.prefix}${config.api.version}/product`, productSegmentRouter);
