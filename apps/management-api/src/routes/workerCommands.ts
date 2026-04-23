import { config } from '@mgmt-api/config/index.js';
import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireSuperuser } from '@mgmt-api/lib/authz/requireSuperuser.js';
import express from 'express';

import { getWorkerCommandListForApi } from '@podverse/worker-commands';

const router = express.Router();
const baseUrl = `${config.api.prefix}${config.api.version}`;

router.get(`${baseUrl}/worker-commands`, ensureAuthenticated, requireSuperuser, (_req, res) => {
  res.json({ commands: getWorkerCommandListForApi() });
});

export const workerCommandsRouter = router;
