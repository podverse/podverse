import type { IncomingMessage, ServerResponse } from 'node:http';
import http from 'node:http';
import https from 'node:https';

import { recordNextHttpServerRequest } from './nextInstrumentation.js';

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

const attachRequestMetrics = (req: IncomingMessage, res: ServerResponse): void => {
  const start = process.hrtime.bigint();
  const method = req.method ?? 'GET';

  res.once('finish', () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const durationMs = Number(elapsedNs) / 1_000_000;
    recordNextHttpServerRequest(method, getRequestPathname(req), res.statusCode, durationMs);
  });
};

const listenForRequestMetrics = (server: http.Server | https.Server): void => {
  server.on('request', (req, res) => {
    attachRequestMetrics(req, res);
  });
};

let isPatched = false;

/**
 * Wrap Node http/https createServer so each finished response is recorded via OTEL HTTP metrics.
 * Call once after {@link initExtensions} when prometheus is enabled (Next.js instrumentation register).
 */
export const registerNextHttpServerInstrumentation = (): void => {
  if (isPatched) {
    return;
  }
  isPatched = true;

  const originalHttpCreateServer = http.createServer.bind(http);
  http.createServer = ((...args: Parameters<typeof http.createServer>) => {
    const server = originalHttpCreateServer(...args);
    listenForRequestMetrics(server);
    return server;
  }) as typeof http.createServer;

  const originalHttpsCreateServer = https.createServer.bind(https);
  https.createServer = ((...args: Parameters<typeof https.createServer>) => {
    const server = originalHttpsCreateServer(...args);
    listenForRequestMetrics(server);
    return server;
  }) as typeof https.createServer;
};
