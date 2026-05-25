import express from 'express';
import request from 'supertest';
import { describe, it } from 'vitest';

import { registerExtensionRoutes } from './registerExtensionRoutes.js';

const apiBase = '/api/v2';
const metricsPath = `${apiBase}/extensions/prometheus/metrics`;

describe('registerExtensionRoutes', () => {
  it('does not register GET /extensions/prometheus/metrics on the app (sidecar-only scrape)', async () => {
    const app = express();
    registerExtensionRoutes(app, apiBase);

    await request(app).get(metricsPath).expect(404);
  });
});
