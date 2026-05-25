import type { IncomingMessage, ServerResponse } from 'node:http';
import http from 'node:http';
import https from 'node:https';

import { context, propagation, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

import { observabilityRuntimeState } from '../internalState.js';
import { toValidTraceId } from '../spanContextIds.js';
import { shouldSkipObservabilityResponseHeaders } from './skipPaths.js';

const TRACER_NAME = 'podverse.observability.http';

const getRequestPathname = (req: IncomingMessage): string => {
  const rawUrl = req.url;
  if (rawUrl === undefined || rawUrl === '') {
    return '/';
  }
  const pathOnly = rawUrl.split('?')[0] ?? '/';
  if (pathOnly === '') {
    return '/';
  }
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
};

const headerCarrierFromIncomingMessage = (req: IncomingMessage): Record<string, string> => {
  const carrier: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      carrier[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      carrier[key] = value.join(',');
    }
  }
  return carrier;
};

const attachRequestTracing = (req: IncomingMessage, res: ServerResponse): void => {
  if (!observabilityRuntimeState.initialized) {
    return;
  }

  const pathname = getRequestPathname(req);
  const method = req.method ?? 'GET';
  const carrier = headerCarrierFromIncomingMessage(req);
  const parentContext = propagation.extract(context.active(), carrier);
  const tracer = trace.getTracer(TRACER_NAME);
  const spanName = `${method} ${pathname}`;
  const span = tracer.startSpan(spanName, { kind: SpanKind.SERVER }, parentContext);
  const activeContext = trace.setSpan(parentContext, span);

  if (!shouldSkipObservabilityResponseHeaders(pathname)) {
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

  res.once('finish', () => {
    span.setAttribute('http.route', pathname);
    span.setAttribute('http.response.status_code', res.statusCode);
    if (res.statusCode >= 500) {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    span.end();
  });

  context.with(trace.setSpan(parentContext, span), () => {
    // Request handlers run in later ticks; span stays open until response finish.
  });
};

const listenForRequestTracing = (server: http.Server | https.Server): void => {
  server.on('request', (req, res) => {
    attachRequestTracing(req, res);
  });
};

let isPatched = false;

/**
 * Wrap Node http/https createServer so each request gets an active trace span.
 * Chains with other createServer patches when registered after them.
 */
export const registerNextHttpServerInstrumentation = (): void => {
  if (isPatched) {
    return;
  }
  isPatched = true;

  const originalHttpCreateServer = http.createServer.bind(http);
  http.createServer = ((...args: Parameters<typeof http.createServer>) => {
    const server = originalHttpCreateServer(...args);
    listenForRequestTracing(server);
    return server;
  }) as typeof http.createServer;

  const originalHttpsCreateServer = https.createServer.bind(https);
  https.createServer = ((...args: Parameters<typeof https.createServer>) => {
    const server = originalHttpsCreateServer(...args);
    listenForRequestTracing(server);
    return server;
  }) as typeof https.createServer;
};

export const resetNextHttpServerInstrumentationForTests = (): void => {
  isPatched = false;
};
