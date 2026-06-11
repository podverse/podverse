import { config } from '@api/config/index.js';
import express from 'express';

import { EmbedDemoConfigService } from '@podverse/orm';

export const embedDemoRouter = express.Router();

const embedDemoConfigService = new EmbedDemoConfigService();

embedDemoRouter.get('/showcase', async (_req, res, next) => {
  try {
    const data = await embedDemoConfigService.getConfiguredShowcases();
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export const embedDemoRoutesRoot = express.Router();

embedDemoRoutesRoot.use(`${config.api.prefix}${config.api.version}/embed-demo`, embedDemoRouter);
