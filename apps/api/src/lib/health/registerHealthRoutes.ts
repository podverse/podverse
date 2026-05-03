import type { IRouter, Request, Response } from 'express';

import { getDataSourceRead } from '@podverse/orm';

import { testKeyvaldbConnection } from '../keyvaldb/keyvaldb.js';

/**
 * Registers versioned liveness and readiness routes (e.g. `/api/v2/health`).
 */
export function registerHealthRoutes(router: IRouter, apiVersionBasePath: string): void {
  router.get(`${apiVersionBasePath}/health`, (_req: Request, res: Response): void => {
    res.json({ status: 'ok', message: 'The server is running.' });
  });

  router.get(`${apiVersionBasePath}/health/ready`, async (_req: Request, res: Response) => {
    try {
      await getDataSourceRead().query('SELECT 1');
    } catch {
      res.status(503).json({ status: 'unavailable', message: 'Database not reachable' });
      return;
    }

    const keyvalOk = await testKeyvaldbConnection();
    if (keyvalOk) {
      res.status(200).json({ status: 'ok', message: 'Ready' });
    } else {
      res.status(503).json({ status: 'unavailable', message: 'KeyValDB not reachable' });
    }
  });
}
