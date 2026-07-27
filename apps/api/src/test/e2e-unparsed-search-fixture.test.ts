import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import {
  E2E_UNPARSED_PODCAST_INDEX_ID,
  E2E_UNPARSED_SEARCH_QUERY,
} from '../lib/feedDirectories/e2eUnparsedSearchFixture.js';
import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

/**
 * Locks the fixtures contract used by mobile Maestro `search-unparsed`:
 * - sentinel search query returns one synthetic feed
 * - channel-by-PI-id for that reserved id returns null (not parsed-ready)
 *
 * Sets `PODVERSE_E2E_FIXTURES=1` before `startTestApp` so the re-imported config
 * has `e2e.fixturesEnabled` (see helpers/startTestApp `vi.resetModules`).
 */

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

vi.mock('../factories/podcastIndexService.js', () => ({
  podcastIndexService: {
    searchPodcasts: vi.fn(async () => {
      throw new Error('live Podcast Index search must not run when fixturesEnabled');
    }),
    searchMusicByTerm: vi.fn(async () => {
      throw new Error('live Podcast Index music search must not run when fixturesEnabled');
    }),
    podcastGetById: vi.fn(async () => null),
  },
}));

describe('e2e unparsed Podcast Index search fixture contract', () => {
  let app: import('express').Express;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let previousFixturesEnv: string | undefined;
  let externalServicesBase = '';
  let channelBase = '';

  beforeAll(async () => {
    previousFixturesEnv = process.env.PODVERSE_E2E_FIXTURES;
    process.env.PODVERSE_E2E_FIXTURES = '1';
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    const apiBase = await getBaseApiUrl();
    externalServicesBase = `${apiBase}/external-services`;
    channelBase = `${apiBase}/channel`;
  });

  afterAll(async () => {
    if (previousFixturesEnv === undefined) {
      delete process.env.PODVERSE_E2E_FIXTURES;
    } else {
      process.env.PODVERSE_E2E_FIXTURES = previousFixturesEnv;
    }
    await stopTestApp(server, ormContext);
  });

  it('GET /external-services/podcast-index/search/podcasts returns the sentinel feed', async () => {
    const res = await request(app)
      .get(`${externalServicesBase}/podcast-index/search/podcasts`)
      .query({ q: E2E_UNPARSED_SEARCH_QUERY });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.feeds).toHaveLength(1);
    expect(res.body.feeds[0].id).toBe(E2E_UNPARSED_PODCAST_INDEX_ID);
    expect(res.body.feeds[0].title.length).toBeGreaterThan(0);
    expect(res.body.feeds[0].url.length).toBeGreaterThan(0);
  });

  it('GET /channel/podcast-index/:reservedId returns null when not in DB', async () => {
    const res = await request(app).get(
      `${channelBase}/podcast-index/${E2E_UNPARSED_PODCAST_INDEX_ID}`
    );

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});
