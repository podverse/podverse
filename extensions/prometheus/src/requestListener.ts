import type http from 'node:http';
import { URL } from 'node:url';

import type { ExtensionPrometheusConfig } from './config.js';

export type ExtensionPrometheusRequestDeps = {
  fetchPrometheusMetricsText: (internalMetricsUrl: string) => Promise<string>;
};

export const sendJson = (res: http.ServerResponse, statusCode: number, body: unknown): void => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

export const sendText = (res: http.ServerResponse, statusCode: number, body: string): void => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.end(body);
};

export const createExtensionPrometheusRequestListener = (
  config: ExtensionPrometheusConfig,
  deps: ExtensionPrometheusRequestDeps
): http.RequestListener => {
  return (req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${config.metricsPort}`);
      const pathname = url.pathname;

      if (req.method === 'GET' && pathname === config.healthPath) {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (req.method === 'GET' && pathname === config.metricsPath) {
        try {
          const metricsText = await deps.fetchPrometheusMetricsText(
            config.prometheusInternalMetricsUrl
          );
          sendText(res, 200, metricsText);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch metrics';
          sendJson(res, 503, { status: 'error', message });
        }
        return;
      }

      sendJson(res, 404, { status: 'not_found' });
    })();
  };
};
