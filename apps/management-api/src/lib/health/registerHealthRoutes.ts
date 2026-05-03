import { AppDbDataSourceRead } from '@mgmt-api/orm/db/appDb.js';
import { AppDataSourceRead } from '@mgmt-api/orm/db/index.js';
import type { IRouter, Request, Response } from 'express';

async function isManagementDatabaseReachable(): Promise<boolean> {
  if (!AppDataSourceRead.isInitialized) {
    return false;
  }
  await AppDataSourceRead.query('SELECT 1');
  return true;
}

async function isAppDatabaseReachable(): Promise<boolean> {
  if (!AppDbDataSourceRead.isInitialized) {
    return false;
  }
  await AppDbDataSourceRead.query('SELECT 1');
  return true;
}

/**
 * Registers versioned liveness and readiness routes (e.g. `/api/v2/health`).
 */
export function registerHealthRoutes(router: IRouter, apiVersionBasePath: string): void {
  router.get(`${apiVersionBasePath}/health`, (_req: Request, res: Response): void => {
    res.json({ status: 'ok', message: 'The server is running.' });
  });

  router.get(
    `${apiVersionBasePath}/health/ready`,
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const managementOk = await isManagementDatabaseReachable();
        if (!managementOk) {
          res.status(503).json({
            status: 'unavailable',
            message: 'Management database not reachable',
          });
          return;
        }

        const appOk = await isAppDatabaseReachable();
        if (!appOk) {
          res.status(503).json({
            status: 'unavailable',
            message: 'App database not reachable',
          });
          return;
        }

        res.status(200).json({ status: 'ok', message: 'Ready' });
      } catch {
        res.status(503).json({ status: 'unavailable', message: 'Database not reachable' });
      }
    }
  );
}
