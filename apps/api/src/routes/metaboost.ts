import { Router } from 'express';
import { config } from '@api/config/index.js';
import { boostboxRouter } from './metaboost/boostbox.js';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/metaboost`, router);
router.use('/boostbox', boostboxRouter);

export const metaboostRouter = router;
