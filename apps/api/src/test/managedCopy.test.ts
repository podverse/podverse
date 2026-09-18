import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';
import { getDefaultLocale } from '@podverse/orm';

import { MANAGED_COPY_UPDATED_AT } from '../lib/managedCopy/managedCopyContent.js';
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

describe('GET /managed-copy/:slug', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let managedCopyBase: string;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    managedCopyBase = (await getBaseApiUrl()) + '/managed-copy';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('returns FAQ markdown without auth', async () => {
    const res = await request(app).get(`${managedCopyBase}/faq`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('faq');
    expect(res.body.updated_at).toBe(MANAGED_COPY_UPDATED_AT.faq);
    expect(res.body.markdown).toContain('Why do some clips start at the wrong time?');
  });

  it('returns clip-how-to markdown without auth', async () => {
    const res = await request(app).get(`${managedCopyBase}/clip-how-to`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('clip-how-to');
    expect(res.body.updated_at).toBe(MANAGED_COPY_UPDATED_AT['clip-how-to']);
    expect(res.body.markdown).toContain('# Making a clip');
  });

  it('returns 404 for an unsupported slug', async () => {
    const res = await request(app).get(`${managedCopyBase}/terms`);

    expect(res.status).toBe(404);
  });

  it('serves a supported locale from Accept-Language', async () => {
    const res = await request(app)
      .get(`${managedCopyBase}/clip-how-to`)
      .set('Accept-Language', 'fr-CA,fr;q=0.9');

    expect(res.status).toBe(200);
    expect(res.body.locale).toBe('fr');
    expect(res.body.markdown).toContain('# Créer un clip');
  });

  it('falls back to the default locale when Accept-Language is unsupported', async () => {
    const res = await request(app)
      .get(`${managedCopyBase}/faq`)
      .set('Accept-Language', 'de-DE,de;q=0.9');

    expect(res.status).toBe(200);
    expect(res.body.locale).toBe(getDefaultLocale());
  });

  it('interpolates {brand_name} tokens in served markdown', async () => {
    const res = await request(app).get(`${managedCopyBase}/faq`);
    const brandName = process.env.BRAND_NAME ?? '';

    expect(res.status).toBe(200);
    expect(brandName).not.toBe('');
    expect(res.body.markdown).toContain(brandName);
    expect(res.body.markdown).not.toContain('{brand_name}');
  });
});
