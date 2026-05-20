import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { prometheusMetricsRoutePath } from './prometheus/prometheusPaths.js';
import { registerExtensionRoutes } from './registerExtensionRoutes.js';

const apiBase = '/api/v2';
const metricsPath = prometheusMetricsRoutePath(apiBase);

describe('management-api registerExtensionRoutes prometheus', () => {
  it('registers GET /extensions/prometheus/metrics when prometheus is enabled with runtime exporter', async () => {
    const app = express();
    registerExtensionRoutes(
      app,
      apiBase,
      { prometheus: { enabled: true } },
      {
        prometheus: {
          httpMiddleware: (_req, _res, next) => {
            next();
          },
          endpoint: {
            contentType: 'text/plain; version=0.0.4',
            getMetrics: async () =>
              '# HELP test_metric Test metric\n# TYPE test_metric counter\ntest_metric 1\n',
          },
        },
      }
    );

    const res = await request(app).get(metricsPath).expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['content-type']).toContain('version=0.0.4');
    expect(res.text).toContain('test_metric 1');
  });

  it('does not register GET /extensions/prometheus/metrics when prometheus is disabled', async () => {
    const app = express();
    registerExtensionRoutes(app, apiBase, { prometheus: { enabled: false } });

    await request(app).get(metricsPath).expect(404);
  });
});
