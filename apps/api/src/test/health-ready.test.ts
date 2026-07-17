import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { config } from '../config/index.js';
import { startTestApp, stopTestApp } from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

const apiBase = `${config.api.prefix}${config.api.version}`;

describe('API health routes', () => {
  let app: import('express').Express;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
  });

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('GET / returns 200 with basic success message (informal dev ping; probes use versioned health)', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.body).toEqual({ status: 'ok', message: 'API is online' });
  });

  it(`GET ${apiBase}/health returns 200 with generic running message`, async () => {
    const res = await request(app).get(`${apiBase}/health`).expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      message: 'The server is running.',
      fixturesEnabled: config.e2e.fixturesEnabled,
    });
  });

  it(`GET ${apiBase}/health/ready returns 200 when KeyValDB is reachable (required KEYVALDB_* in this stack)`, async () => {
    const res = await request(app).get(`${apiBase}/health/ready`).expect(200);
    expect(res.body).toMatchObject({ status: 'ok', message: 'Ready' });
  });

  it(`GET ${apiBase}/extensions/prometheus/metrics is not served by the app (sidecar-only; always 404)`, async () => {
    await request(app).get(`${apiBase}/extensions/prometheus/metrics`).expect(404);
  });
});
