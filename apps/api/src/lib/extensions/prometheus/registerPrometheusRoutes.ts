import type { IRouter, Request, Response } from 'express';

import type { PrometheusScrapeEndpoint } from '../types.js';

import { prometheusMetricsRoutePath } from './prometheusPaths.js';

/**
 * Registers prometheus extension routes (e.g. GET /api/v2/extensions/prometheus/metrics).
 */
export function registerPrometheusRoutes(
  router: IRouter,
  apiVersionBasePath: string,
  metricsEndpoint: PrometheusScrapeEndpoint
): void {
  router.get(
    prometheusMetricsRoutePath(apiVersionBasePath),
    async (_req: Request, res: Response) => {
      res.setHeader('Content-Type', metricsEndpoint.contentType);
      res.status(200).send(await metricsEndpoint.getMetrics());
    }
  );
}
