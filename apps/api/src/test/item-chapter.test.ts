import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { config } from '../config/index.js';
import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

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

const apiPrefix = `${config.api.prefix}${config.api.version}`;

describe('GET /item-chapter/:item_chapter_id_text (real ItemChapterService)', () => {
  let app: import('express').Express;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let base: string;

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    base = await getBaseApiUrl();
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('returns 404 for an id_text that does not exist (exercises TypeORM findOne + merged relations)', async () => {
    const missingId = 'ZZZZZZZZZZZZZ';
    const res = await request(app).get(`${base}/item-chapter/${missingId}`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Item chapter not found' });
  });

  it(`GET ${apiPrefix}/health returns 200 (sanity: app wiring)`, async () => {
    const res = await request(app).get(`${apiPrefix}/health`).expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
