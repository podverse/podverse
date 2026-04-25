import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const TEST_EMAIL = 'clip-test@example.com';
const TEST_USER_ID = 1;
const OTHER_USER_ID = 2;
const CLIP_ID_TEXT = 'test-clip-abc';
const CHANNEL_ID_TEXT = 'test-channel-xyz';
const ITEM_ID_TEXT = 'test-item-123';

const {
  clipCreateMock,
  clipUpdateMock,
  clipDeleteMock,
  clipGetByIdTextMock,
  clipGetManyPublicMock,
  clipGetManyByChannelAndCountPublicMock,
  clipGetManyByItemAndCountPublicMock,
  clipGetManyByAccountMock,
  clipGetManyByChannelsMock,
  statsAggregatedClipGetManyPublicMock,
  statsAggregatedClipGetManyAndCountPublicMock,
  statsAggregatedClipGetManyByChannelsAndCountPublicMock,
  statsAggregatedClipGetManyByItemAndCountPublicMock,
  channelGetByIdTextMock,
  itemGetByIdTextMock,
  getAccountMock,
  followingChannelGetFollowedChannelsWithCountMock,
} = vi.hoisted(() => ({
  clipCreateMock: vi.fn(async () => ({ id: 1, clip_id_text: CLIP_ID_TEXT })),
  clipUpdateMock: vi.fn(async () => ({ id: 1, clip_id_text: CLIP_ID_TEXT })),
  clipDeleteMock: vi.fn(async () => {}),
  clipGetByIdTextMock: vi.fn(async () => ({
    id: 1,
    clip_id_text: CLIP_ID_TEXT,
    account: { id: TEST_USER_ID },
    sharable_status: { id: 1 },
  })),
  clipGetManyPublicMock: vi.fn(async () => []),
  clipGetManyByChannelAndCountPublicMock: vi.fn(async () => [[], 0]),
  clipGetManyByItemAndCountPublicMock: vi.fn(async () => [[], 0]),
  clipGetManyByAccountMock: vi.fn(async () => []),
  clipGetManyByChannelsMock: vi.fn(async () => [[], 0]),
  statsAggregatedClipGetManyPublicMock: vi.fn(async () => []),
  statsAggregatedClipGetManyAndCountPublicMock: vi.fn(async () => [[], 0]),
  statsAggregatedClipGetManyByChannelsAndCountPublicMock: vi.fn(async () => [[], 0]),
  statsAggregatedClipGetManyByItemAndCountPublicMock: vi.fn(async () => [[], 0]),
  channelGetByIdTextMock: vi.fn(async () => ({ id: 1, channel_id_text: CHANNEL_ID_TEXT })),
  itemGetByIdTextMock: vi.fn(async () => ({ id: 1, item_id_text: ITEM_ID_TEXT })),
  getAccountMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
    },
    sharable_status: { id: 1 },
  })),
  followingChannelGetFollowedChannelsWithCountMock: vi.fn(async () => ({
    results: [{ channel_id: 1 }],
  })),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
  }

  class MockClipService {
    create = clipCreateMock;
    update = clipUpdateMock;
    delete = clipDeleteMock;
    getByIdText = clipGetByIdTextMock;
    getManyPublic = clipGetManyPublicMock;
    getManyByChannelAndCountPublic = clipGetManyByChannelAndCountPublicMock;
    getManyByItemAndCountPublic = clipGetManyByItemAndCountPublicMock;
    getManyByAccount = clipGetManyByAccountMock;
    getManyByChannels = clipGetManyByChannelsMock;
  }

  class MockChannelService {
    getByIdText = channelGetByIdTextMock;
  }

  class MockItemService {
    getByIdText = itemGetByIdTextMock;
  }

  class MockStatsAggregatedClipService {
    getManyPublic = statsAggregatedClipGetManyPublicMock;
    getManyAndCountPublic = statsAggregatedClipGetManyAndCountPublicMock;
    getManyByChannelsAndCountPublic = statsAggregatedClipGetManyByChannelsAndCountPublicMock;
    getManyByItemAndCountPublic = statsAggregatedClipGetManyByItemAndCountPublicMock;
  }

  class MockAccountFollowingChannelService {
    followChannel = vi.fn(async () => {});
    unfollowChannel = vi.fn(async () => {});
    getFollowedChannelsWithCount = followingChannelGetFollowedChannelsWithCountMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    ClipService: MockClipService,
    ChannelService: MockChannelService,
    ItemService: MockItemService,
    StatsAggregatedClipService: MockStatsAggregatedClipService,
    AccountFollowingChannelService: MockAccountFollowingChannelService,
  };
});

let clipBase: string;

describe('clip routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    clipBase = (await getBaseApiUrl()) + '/clip';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  // ─── POST / (create) ────────────────────────────────────────────────

  describe('POST /', () => {
    const validClipBody = {
      start_time: 10,
      end_time: 30,
      title: 'Test Clip',
      item_id_text: ITEM_ID_TEXT,
      sharable_status_id: 1,
    };

    it('returns 201 with valid data', async () => {
      clipCreateMock.mockResolvedValueOnce({ id: 1, clip_id_text: CLIP_ID_TEXT });

      const res = await request(app)
        .post(`${clipBase}/`)
        .set(authHeaders(TEST_USER_ID))
        .send(validClipBody);

      expect(res.status).toBe(201);
      expect(clipCreateMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          start_time: 10,
          end_time: 30,
          title: 'Test Clip',
          item_id_text: ITEM_ID_TEXT,
          sharable_status_id: 1,
        })
      );
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post(`${clipBase}/`).send(validClipBody);

      expect(res.status).toBe(401);
    });

    it('returns 400 with missing required fields', async () => {
      const res = await request(app)
        .post(`${clipBase}/`)
        .set(authHeaders(TEST_USER_ID))
        .send({ title: 'Missing fields' });

      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH /:clip_id_text (update) ──────────────────────────────────

  describe('PATCH /:clip_id_text', () => {
    const validClipBody = {
      start_time: 15,
      end_time: 45,
      title: 'Updated Clip',
      item_id_text: ITEM_ID_TEXT,
      sharable_status_id: 1,
    };

    it('returns 200 when owner updates clip', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: TEST_USER_ID },
      });
      clipUpdateMock.mockResolvedValueOnce({ id: 1, clip_id_text: CLIP_ID_TEXT });

      const res = await request(app)
        .patch(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID))
        .send(validClipBody);

      expect(res.status).toBe(200);
      expect(clipUpdateMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        CLIP_ID_TEXT,
        expect.objectContaining({ title: 'Updated Clip' })
      );
    });

    it('returns 403 when not the clip owner', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: OTHER_USER_ID },
      });

      const res = await request(app)
        .patch(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID))
        .send(validClipBody);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('returns 404 when clip not found', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID))
        .send(validClipBody);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Clip not found');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).patch(`${clipBase}/${CLIP_ID_TEXT}`).send(validClipBody);

      expect(res.status).toBe(401);
    });
  });

  // ─── DELETE /:clip_id_text ──────────────────────────────────────────

  describe('DELETE /:clip_id_text', () => {
    it('returns 204 when owner deletes clip', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: TEST_USER_ID },
      });
      clipDeleteMock.mockResolvedValueOnce({});

      const res = await request(app)
        .delete(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(204);
      expect(clipDeleteMock).toHaveBeenCalledWith(TEST_USER_ID, CLIP_ID_TEXT);
    });

    it('returns 403 when not the clip owner', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: OTHER_USER_ID },
      });

      const res = await request(app)
        .delete(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(403);
    });

    it('returns 404 when clip not found', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).delete(`${clipBase}/${CLIP_ID_TEXT}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /:clip_id_text ─────────────────────────────────────────────

  describe('GET /:clip_id_text', () => {
    it('returns 200 for public clip without auth', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: TEST_USER_ID },
        sharable_status: { id: 1 },
      });

      const res = await request(app).get(`${clipBase}/${CLIP_ID_TEXT}`);

      expect(res.status).toBe(200);
    });

    it('returns 200 for private clip when owner is authenticated', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: TEST_USER_ID },
        sharable_status: { id: 3 },
      });

      const res = await request(app)
        .get(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
    });

    it('returns 404 for private clip when not the owner', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: OTHER_USER_ID },
        sharable_status: { id: 3 },
      });

      const res = await request(app)
        .get(`${clipBase}/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(404);
    });

    it('returns 404 for private clip when anonymous', async () => {
      clipGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        clip_id_text: CLIP_ID_TEXT,
        account: { id: OTHER_USER_ID },
        sharable_status: { id: 3 },
      });

      const res = await request(app).get(`${clipBase}/${CLIP_ID_TEXT}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /private ───────────────────────────────────────────────────

  describe('GET /private', () => {
    it('returns 200 with user clips when authenticated', async () => {
      clipGetManyByAccountMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      const res = await request(app).get(`${clipBase}/private`).set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${clipBase}/private`);

      expect(res.status).toBe(401);
    });
  });

  // ─── Public list endpoints ──────────────────────────────────────────

  describe('GET /public/recent', () => {
    it('returns 200 with paginated clips', async () => {
      clipGetManyPublicMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${clipBase}/public/recent?medium=all&page=1`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /public/oldest', () => {
    it('returns 200 with paginated clips', async () => {
      clipGetManyPublicMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${clipBase}/public/oldest?medium=all&page=1`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /public/top', () => {
    it('returns 200 with paginated clips', async () => {
      statsAggregatedClipGetManyPublicMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${clipBase}/public/top?medium=all&page=1&range=day`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /public/category/recent', () => {
    it('returns 200 with paginated clips for a category', async () => {
      clipGetManyPublicMock.mockResolvedValueOnce([]);

      const res = await request(app).get(
        `${clipBase}/public/category/recent?medium=all&page=1&category=arts`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /public/channel/recent/:channel_id_text', () => {
    it('returns 200 with paginated clips for a channel', async () => {
      channelGetByIdTextMock.mockResolvedValueOnce({ id: 1 });
      clipGetManyByChannelAndCountPublicMock.mockResolvedValueOnce([[], 0]);

      const res = await request(app).get(
        `${clipBase}/public/channel/recent/${CHANNEL_ID_TEXT}?page=1`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /public/item/recent/:item_id_text', () => {
    it('returns 200 with paginated clips for an item', async () => {
      itemGetByIdTextMock.mockResolvedValueOnce({ id: 1 });
      clipGetManyByItemAndCountPublicMock.mockResolvedValueOnce([[], 0]);

      const res = await request(app).get(`${clipBase}/public/item/recent/${ITEM_ID_TEXT}?page=1`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ─── Subscribed endpoints ───────────────────────────────────────────

  describe('GET /public/subscribed/recent', () => {
    it('returns 200 with subscribed clips when authenticated', async () => {
      clipGetManyByChannelsMock.mockResolvedValueOnce([[], 0]);

      const res = await request(app)
        .get(`${clipBase}/public/subscribed/recent?medium=all&page=1`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${clipBase}/public/subscribed/recent?medium=all&page=1`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /public/subscribed/top', () => {
    it('returns 200 with subscribed top clips when authenticated', async () => {
      statsAggregatedClipGetManyByChannelsAndCountPublicMock.mockResolvedValueOnce([[], 0]);

      const res = await request(app)
        .get(`${clipBase}/public/subscribed/top?medium=all&page=1&range=day`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(
        `${clipBase}/public/subscribed/top?medium=all&page=1&range=day`
      );

      expect(res.status).toBe(401);
    });
  });
});
