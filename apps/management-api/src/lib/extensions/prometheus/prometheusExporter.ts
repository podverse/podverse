import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

import type { PrometheusScrapeEndpoint } from '../types.js';

// TODO(extensions-migration): Move this baked-in prometheus adapter into an extensions package
// and load it via the extension host wiring.
export type PrometheusExporter = {
  httpMiddleware: (req: Request, res: Response, next: NextFunction) => void;
  endpoint: PrometheusScrapeEndpoint;
};

const HTTP_DURATION_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 1, 2.5, 5, 10];

const getRouteLabel = (req: Request): string => {
  const routePath = req.route?.path;
  if (typeof routePath === 'string') {
    return `${req.baseUrl}${routePath}`;
  }

  if (Array.isArray(routePath)) {
    return `${req.baseUrl}${routePath.join('|')}`;
  }

  return 'unmatched';
};

export const createPrometheusExporter = (servicePrefix: string): PrometheusExporter => {
  const registry = new Registry();
  collectDefaultMetrics({
    register: registry,
    prefix: `${servicePrefix}_`,
  });

  const httpRequestsTotal = new Counter({
    name: `${servicePrefix}_http_requests_total`,
    help: 'Total number of completed HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [registry],
  });

  const httpRequestDurationSeconds = new Histogram({
    name: `${servicePrefix}_http_request_duration_seconds`,
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: HTTP_DURATION_BUCKETS_SECONDS,
    registers: [registry],
  });

  const httpRequestsInFlight = new Gauge({
    name: `${servicePrefix}_http_requests_in_flight`,
    help: 'Number of in-flight HTTP requests',
    labelNames: ['method'] as const,
    registers: [registry],
  });

  const httpMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method;
    httpRequestsInFlight.inc({ method });
    const end = httpRequestDurationSeconds.startTimer();

    res.on('finish', () => {
      const statusCode = res.statusCode.toString();
      const finishedRoute = getRouteLabel(req);
      httpRequestsTotal.inc({ method, route: finishedRoute, status_code: statusCode });
      end({ method, route: finishedRoute, status_code: statusCode });
      httpRequestsInFlight.dec({ method });
    });

    next();
  };

  return {
    httpMiddleware,
    endpoint: {
      contentType: registry.contentType,
      getMetrics: async (): Promise<string> => registry.metrics(),
    },
  };
};
