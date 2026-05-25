import { context, propagation, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

import { observabilityRuntimeState } from '../internalState.js';
import { toValidTraceId } from '../spanContextIds.js';
import { shouldSkipObservabilityResponseHeaders } from './skipPaths.js';
import type { ObservabilityHttpMiddleware } from './types.js';

const TRACER_NAME = 'podverse.observability.http';

const headerCarrierFromRequest = (
  headers: Record<string, string | string[] | undefined>
): Record<string, string> => {
  const carrier: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      carrier[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      carrier[key] = value.join(',');
    }
  }
  return carrier;
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

const createExpressObservabilityHttpMiddleware = (): ObservabilityHttpMiddleware => {
  return (req, res, next) => {
    if (!observabilityRuntimeState.initialized) {
      next();
      return;
    }

    const carrier = headerCarrierFromRequest(req.headers);
    const parentContext = propagation.extract(context.active(), carrier);
    const tracer = trace.getTracer(TRACER_NAME);
    const routeLabel = getExpressRouteLabel(req);
    const spanName = `${req.method} ${routeLabel}`;
    const span = tracer.startSpan(spanName, { kind: SpanKind.SERVER }, parentContext);
    const activeContext = trace.setSpan(parentContext, span);

    if (!shouldSkipObservabilityResponseHeaders(routeLabel)) {
      const responseCarrier: Record<string, string> = {};
      propagation.inject(activeContext, responseCarrier);
      for (const [key, value] of Object.entries(responseCarrier)) {
        res.setHeader(key, value);
      }
      const traceId = toValidTraceId(span.spanContext().traceId);
      if (traceId !== undefined) {
        res.setHeader('X-Trace-Id', traceId);
      }
    }

    res.on('finish', () => {
      span.setAttribute('http.route', routeLabel);
      span.setAttribute('http.response.status_code', res.statusCode);
      if (res.statusCode >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();
    });

    context.with(activeContext, () => {
      next();
    });
  };
};

let noopMiddleware: ObservabilityHttpMiddleware | null = null;

const getNoopMiddleware = (): ObservabilityHttpMiddleware => {
  if (noopMiddleware === null) {
    noopMiddleware = (_req, _res, next) => {
      next();
    };
  }
  return noopMiddleware;
};

export const getObservabilityHttpMiddleware = (): ObservabilityHttpMiddleware => {
  if (!observabilityRuntimeState.initialized) {
    return getNoopMiddleware();
  }
  return createExpressObservabilityHttpMiddleware();
};
