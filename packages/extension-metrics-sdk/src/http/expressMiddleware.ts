import { extensionRuntimeState } from '../internalState.js';
import {
  decrementActiveHttpRequests,
  incrementActiveHttpRequests,
  recordHttpServerRequest,
} from './recordHttpServerRequest.js';
import type { ExtensionHttpMiddleware } from './types.js';

const EXTENSION_METRICS_PATH_PREFIX = '/extensions/';

const shouldSkipRequestMetrics = (path: string): boolean => {
  return path.startsWith(EXTENSION_METRICS_PATH_PREFIX);
};

const getExpressRouteLabel = (req: {
  method: string;
  baseUrl?: string;
  route?: { path?: string | string[] };
  path?: string;
}): string => {
  const routePath = req.route?.path;
  if (typeof routePath === 'string') {
    return `${req.baseUrl ?? ''}${routePath}`;
  }
  if (Array.isArray(routePath)) {
    return `${req.baseUrl ?? ''}${routePath.join('|')}`;
  }
  if (typeof req.path === 'string' && req.path !== '') {
    return req.path;
  }
  return 'unmatched';
};

export const createExpressExtensionHttpMiddleware = (): ExtensionHttpMiddleware => {
  return (req, res, next) => {
    if (!extensionRuntimeState.enabled || extensionRuntimeState.httpInstruments === null) {
      next();
      return;
    }

    const routeLabel = getExpressRouteLabel(req);
    if (shouldSkipRequestMetrics(routeLabel)) {
      next();
      return;
    }

    const method = req.method;
    const instruments = extensionRuntimeState.httpInstruments;
    incrementActiveHttpRequests(instruments, method);
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const elapsedNs = process.hrtime.bigint() - start;
      const durationSeconds = Number(elapsedNs) / 1_000_000_000;
      recordHttpServerRequest(instruments, method, routeLabel, res.statusCode, durationSeconds);
      decrementActiveHttpRequests(instruments, method);
    });

    next();
  };
};
