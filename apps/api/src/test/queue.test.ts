import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_EMAIL = 'queue-test@example.com';
const TEST_USER_ID = 1;
const OTHER_USER_ID = 2;
const QUEUE_ID_TEXT = 'test-queue-abc';
const CLIP_ID_TEXT = 'q-clip-1';
const ITEM_ID_TEXT = 'q-item-1';
const SOUNDBITE_ID_TEXT = 'q-sb-1';
const ADD_RSS_HASH = 'rss-hash-1';

const {
  queueGetByIdTextMock,
  queueGetAllPrivateMock,
  queueUpdateIsActiveMock,
  qrGetAllByAccountAbridgedMock,
  qrGetNowPlayingMock,
  qrGetAllUpcomingMock,
  qrGetHistoryPaginatedMock,
  qrAddClipNowPlayingMock,
  qrAddClipNextMock,
  qrAddClipLastMock,
  qrAddClipBetweenMock,
  qrAddClipHistoryMock,
  qrRemoveClipMock,
  qrAddItemNowPlayingMock,
  qrAddItemNextMock,
  qrAddItemLastMock,
  qrAddItemBetweenMock,
  qrAddItemHistoryMock,
  qrRemoveItemMock,
  qrAddRssNowPlayingMock,
  qrAddRssNextMock,
  qrAddRssLastMock,
  qrAddRssBetweenMock,
  qrAddRssHistoryMock,
  qrRemoveRssMock,
  qrAddSbNowPlayingMock,
  qrAddSbNextMock,
  qrAddSbLastMock,
  qrAddSbBetweenMock,
  qrAddSbHistoryMock,
  qrRemoveSbMock,
  getAccountMock,
} = vi.hoisted(() => ({
  queueGetByIdTextMock: vi.fn(
    async (
      _id: string
    ): Promise<{
      id: number;
      queue_id_text: string;
      account: { id: number };
    }> => ({
      id: 1,
      queue_id_text: QUEUE_ID_TEXT,
      account: { id: TEST_USER_ID },
    })
  ),
  queueGetAllPrivateMock: vi.fn(async () => [{ id: 1, queue_id_text: QUEUE_ID_TEXT }]),
  queueUpdateIsActiveMock: vi.fn(async () => {}),
  qrGetAllByAccountAbridgedMock: vi.fn(async () => [
    { queue_id: 1, some_field: 'a', nullish: null },
  ]),
  qrGetNowPlayingMock: vi.fn(async () => ({ id: 1, resource: 'now' })),
  qrGetAllUpcomingMock: vi.fn(async () => [{ id: 2 }]),
  qrGetHistoryPaginatedMock: vi.fn(async () => [[{ id: 3 }], 1]),
  qrAddClipNowPlayingMock: vi.fn(async () => ({ id: 1 })),
  qrAddClipNextMock: vi.fn(async () => ({ id: 1 })),
  qrAddClipLastMock: vi.fn(async () => ({ id: 1 })),
  qrAddClipBetweenMock: vi.fn(async () => ({ id: 1 })),
  qrAddClipHistoryMock: vi.fn(async () => ({ id: 1 })),
  qrRemoveClipMock: vi.fn(async () => {}),
  qrAddItemNowPlayingMock: vi.fn(async () => ({ id: 1 })),
  qrAddItemNextMock: vi.fn(async () => ({ id: 1 })),
  qrAddItemLastMock: vi.fn(async () => ({ id: 1 })),
  qrAddItemBetweenMock: vi.fn(async () => ({ id: 1 })),
  qrAddItemHistoryMock: vi.fn(async () => ({ id: 1 })),
  qrRemoveItemMock: vi.fn(async () => {}),
  qrAddRssNowPlayingMock: vi.fn(async () => ({ id: 1 })),
  qrAddRssNextMock: vi.fn(async () => ({ id: 1 })),
  qrAddRssLastMock: vi.fn(async () => ({ id: 1 })),
  qrAddRssBetweenMock: vi.fn(async () => ({ id: 1 })),
  qrAddRssHistoryMock: vi.fn(async () => ({ id: 1 })),
  qrRemoveRssMock: vi.fn(async () => {}),
  qrAddSbNowPlayingMock: vi.fn(async () => ({ id: 1 })),
  qrAddSbNextMock: vi.fn(async () => ({ id: 1 })),
  qrAddSbLastMock: vi.fn(async () => ({ id: 1 })),
  qrAddSbBetweenMock: vi.fn(async () => ({ id: 1 })),
  qrAddSbHistoryMock: vi.fn(async () => ({ id: 1 })),
  qrRemoveSbMock: vi.fn(async () => {}),
  getAccountMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    id_text: TEST_USER_ACCOUNT_ID_TEXT,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
    },
  })),
}));

function queueOwnedBy(ownerId: number) {
  return {
    id: 1,
    queue_id_text: QUEUE_ID_TEXT,
    account: { id: ownerId },
  };
}

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
  }

  class MockQueueService {
    getByIdText = queueGetByIdTextMock;
    getAllPrivate = queueGetAllPrivateMock;
    updateIsActiveQueue = queueUpdateIsActiveMock;
  }

  class MockQueueResourceService {
    getAllByAccountAbridged = qrGetAllByAccountAbridgedMock;
    getNowPlayingByQueueIdText = qrGetNowPlayingMock;
    getAllUpcomingByQueueIdText = qrGetAllUpcomingMock;
    getHistoryResourcesByQueueIdText = qrGetHistoryPaginatedMock;
    addClipToNowPlaying = qrAddClipNowPlayingMock;
    addClipToQueueNext = qrAddClipNextMock;
    addClipToQueueLast = qrAddClipLastMock;
    addClipToQueueBetween = qrAddClipBetweenMock;
    addClipToHistory = qrAddClipHistoryMock;
    removeClipFromQueue = qrRemoveClipMock;
    addItemToNowPlaying = qrAddItemNowPlayingMock;
    addItemToQueueNext = qrAddItemNextMock;
    addItemToQueueLast = qrAddItemLastMock;
    addItemToQueueBetween = qrAddItemBetweenMock;
    addItemToHistory = qrAddItemHistoryMock;
    removeItemFromQueue = qrRemoveItemMock;
    addItemAddByRSSToNowPlaying = qrAddRssNowPlayingMock;
    addItemAddByRSSToQueueNext = qrAddRssNextMock;
    addItemAddByRSSToQueueLast = qrAddRssLastMock;
    addItemAddByRSSToQueueBetween = qrAddRssBetweenMock;
    addItemAddByRSSToHistory = qrAddRssHistoryMock;
    removeItemAddByRSSFromQueue = qrRemoveRssMock;
    addItemSoundbiteToNowPlaying = qrAddSbNowPlayingMock;
    addItemSoundbiteToQueueNext = qrAddSbNextMock;
    addItemSoundbiteToQueueLast = qrAddSbLastMock;
    addItemSoundbiteToQueueBetween = qrAddSbBetweenMock;
    addItemSoundbiteToHistory = qrAddSbHistoryMock;
    removeItemSoundbiteFromQueue = qrRemoveSbMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    QueueService: MockQueueService,
    QueueResourceService: MockQueueResourceService,
  };
});

const nowPlayingBody = {};
const betweenBody = { position1: 0, position2: 1 };

let queueBase: string;

describe('queue routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    queueBase = (await getBaseApiUrl()) + '/queue';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  /** Clears mockResolvedValueOnce queues and restores the hoisted default AccountService#get impl. */
  beforeEach(() => {
    getAccountMock.mockReset();
  });

  const auth = () => authHeaders(TEST_USER_ID);

  describe('read endpoints', () => {
    it('GET /all-for-account/private returns 200', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app).get(`${queueBase}/all-for-account/private`).set(auth());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /all-for-account/private returns 401 without auth', async () => {
      const res = await request(app).get(`${queueBase}/all-for-account/private`);
      expect(res.status).toBe(401);
    });

    it('GET /resources/all-by-account-abridged returns 200', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app)
        .get(`${queueBase}/resources/all-by-account-abridged`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /resources/all-by-account-abridged returns 401 without auth', async () => {
      const res = await request(app).get(`${queueBase}/resources/all-by-account-abridged`);
      expect(res.status).toBe(401);
    });

    describe('per-queue read (ownership)', () => {
      beforeEach(() => {
        queueGetByIdTextMock.mockReset();
        queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(TEST_USER_ID));
        qrGetHistoryPaginatedMock.mockResolvedValue([[], 0]);
      });

      it('GET /:id/resources/now-playing returns 200', async () => {
        getAccountMock.mockResolvedValueOnce({
          id: TEST_USER_ID,
          id_text: TEST_USER_ACCOUNT_ID_TEXT,
          account_credentials: { email: TEST_EMAIL },
          account_membership_status: {
            membership_expires_at: new Date(Date.now() + 86400000 * 365),
          },
        });
        const res = await request(app)
          .get(`${queueBase}/${QUEUE_ID_TEXT}/resources/now-playing`)
          .set(auth());
        expect(res.status).toBe(200);
      });

      it('GET /:id/resources/now-playing returns 401 without auth', async () => {
        const res = await request(app).get(`${queueBase}/${QUEUE_ID_TEXT}/resources/now-playing`);
        expect(res.status).toBe(401);
      });

      it('GET /:id/resources/upcoming-all returns 200', async () => {
        getAccountMock.mockResolvedValueOnce({
          id: TEST_USER_ID,
          id_text: TEST_USER_ACCOUNT_ID_TEXT,
          account_credentials: { email: TEST_EMAIL },
          account_membership_status: {
            membership_expires_at: new Date(Date.now() + 86400000 * 365),
          },
        });
        const res = await request(app)
          .get(`${queueBase}/${QUEUE_ID_TEXT}/resources/upcoming-all`)
          .set(auth());
        expect(res.status).toBe(200);
      });

      it('GET /:id/resources/upcoming-all returns 401 without auth', async () => {
        const res = await request(app).get(`${queueBase}/${QUEUE_ID_TEXT}/resources/upcoming-all`);
        expect(res.status).toBe(401);
      });

      it('GET /:id/resources/history-paginated returns 200 with meta', async () => {
        getAccountMock.mockResolvedValueOnce({
          id: TEST_USER_ID,
          id_text: TEST_USER_ACCOUNT_ID_TEXT,
          account_credentials: { email: TEST_EMAIL },
          account_membership_status: {
            membership_expires_at: new Date(Date.now() + 86400000 * 365),
          },
        });
        qrGetHistoryPaginatedMock.mockResolvedValueOnce([[{ id: 1 }], 1]);
        const res = await request(app)
          .get(`${queueBase}/${QUEUE_ID_TEXT}/resources/history-paginated?page=1`)
          .set(auth());
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
      });

      it('GET /:id/resources/history-paginated returns 401 without auth', async () => {
        const res = await request(app).get(
          `${queueBase}/${QUEUE_ID_TEXT}/resources/history-paginated?page=1`
        );
        expect(res.status).toBe(401);
      });
    });
  });

  describe('POST /:queue_id_text/update-is-active', () => {
    beforeEach(() => {
      queueGetByIdTextMock.mockReset();
    });

    it('returns 200 for owner with valid boolean', async () => {
      queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(TEST_USER_ID));
      const res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/update-is-active`)
        .set(auth())
        .send({ is_active_queue: true });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Queue updated successfully');
      expect(queueUpdateIsActiveMock).toHaveBeenCalledWith(TEST_USER_ID, QUEUE_ID_TEXT, true);
    });

    it('returns 403 when not the queue owner', async () => {
      queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(OTHER_USER_ID));
      const res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/update-is-active`)
        .set(auth())
        .send({ is_active_queue: true });
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid body (non-boolean)', async () => {
      queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(TEST_USER_ID));
      const res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/update-is-active`)
        .set(auth())
        .send({ is_active_queue: 'not-bool' });
      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/update-is-active`)
        .send({ is_active_queue: true });
      expect(res.status).toBe(401);
    });
  });

  describe('clip operations', () => {
    beforeEach(() => {
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(TEST_USER_ID));
    });

    const url = (suffix: string) => `${queueBase}/${QUEUE_ID_TEXT}/clip/${CLIP_ID_TEXT}${suffix}`;

    it('POST now-playing, next, last, between, history and DELETE return expected statuses', async () => {
      let res = await request(app).post(url('/now-playing')).set(auth()).send(nowPlayingBody);
      expect(res.status).toBe(201);
      res = await request(app).post(url('/next')).set(auth());
      expect(res.status).toBe(201);
      res = await request(app).post(url('/last')).set(auth());
      expect(res.status).toBe(201);
      res = await request(app).post(url('/between')).set(auth()).send(betweenBody);
      expect(res.status).toBe(201);
      res = await request(app).post(url('/history')).set(auth()).send(nowPlayingBody);
      expect(res.status).toBe(201);
      res = await request(app).delete(url('')).set(auth());
      expect(res.status).toBe(204);
    });

    it('returns 403 when not the owner', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValueOnce(queueOwnedBy(OTHER_USER_ID));
      const res = await request(app).post(url('/next')).set(auth());
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth (next)', async () => {
      const res = await request(app).post(url('/next'));
      expect(res.status).toBe(401);
    });
  });

  describe('item operations', () => {
    beforeEach(() => {
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(TEST_USER_ID));
    });

    const url = (suffix: string) => `${queueBase}/${QUEUE_ID_TEXT}/item/${ITEM_ID_TEXT}${suffix}`;

    it('POST now-playing, next, last, between, history and DELETE return expected statuses', async () => {
      let res = await request(app).post(url('/now-playing')).set(auth()).send(nowPlayingBody);
      expect(res.status).toBe(201);
      res = await request(app).post(url('/next')).set(auth());
      expect(res.status).toBe(201);
      res = await request(app).post(url('/last')).set(auth());
      expect(res.status).toBe(201);
      res = await request(app).post(url('/between')).set(auth()).send(betweenBody);
      expect(res.status).toBe(201);
      res = await request(app).post(url('/history')).set(auth()).send(nowPlayingBody);
      expect(res.status).toBe(201);
      res = await request(app).delete(url('')).set(auth());
      expect(res.status).toBe(204);
    });

    it('returns 403 when not the owner (next)', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValueOnce(queueOwnedBy(OTHER_USER_ID));
      const res = await request(app).post(url('/next')).set(auth());
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth (next)', async () => {
      const res = await request(app).post(url('/next'));
      expect(res.status).toBe(401);
    });
  });

  describe('item-add-by-rss operations', () => {
    const rssData = { add_by_rss_resource_data: { feed_url: 'https://ex.com/f' } };

    beforeEach(() => {
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(TEST_USER_ID));
    });

    it('POST now-playing and other positions return 201; DELETE remove returns 204', async () => {
      let res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/now-playing`)
        .set(auth())
        .send({
          add_by_rss_resource_data: { a: 1 },
          playback_position: 0,
        });
      expect(res.status).toBe(201);

      res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/next`)
        .set(auth())
        .send(rssData);
      expect(res.status).toBe(201);
      res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/last`)
        .set(auth())
        .send(rssData);
      expect(res.status).toBe(201);
      res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/between`)
        .set(auth())
        .send({ ...rssData, ...betweenBody });
      expect(res.status).toBe(201);
      res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/history`)
        .set(auth())
        .send({
          add_by_rss_resource_data: { a: 1 },
        });
      expect(res.status).toBe(201);

      res = await request(app)
        .delete(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/${ADD_RSS_HASH}`)
        .set(auth());
      expect(res.status).toBe(204);
    });

    it('returns 403 when not the owner (next)', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValueOnce(queueOwnedBy(OTHER_USER_ID));
      const res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/next`)
        .set(auth())
        .send(rssData);
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth (next)', async () => {
      const res = await request(app)
        .post(`${queueBase}/${QUEUE_ID_TEXT}/item-add-by-rss/next`)
        .send(rssData);
      expect(res.status).toBe(401);
    });
  });

  describe('item-soundbite operations', () => {
    beforeEach(() => {
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValue(queueOwnedBy(TEST_USER_ID));
    });

    const base = () => `${queueBase}/${QUEUE_ID_TEXT}/item-soundbite/${SOUNDBITE_ID_TEXT}`;

    it('POST now-playing, next, last, between, history and DELETE return expected statuses', async () => {
      let res = await request(app).post(`${base()}/now-playing`).set(auth()).send(nowPlayingBody);
      expect(res.status).toBe(201);
      res = await request(app).post(`${base()}/next`).set(auth());
      expect(res.status).toBe(201);
      res = await request(app).post(`${base()}/last`).set(auth());
      expect(res.status).toBe(201);
      res = await request(app).post(`${base()}/between`).set(auth()).send(betweenBody);
      expect(res.status).toBe(201);
      res = await request(app).post(`${base()}/history`).set(auth()).send(nowPlayingBody);
      expect(res.status).toBe(201);
      res = await request(app).delete(base()).set(auth());
      expect(res.status).toBe(204);
    });

    it('returns 403 when not the owner (next)', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      queueGetByIdTextMock.mockReset();
      queueGetByIdTextMock.mockResolvedValueOnce(queueOwnedBy(OTHER_USER_ID));
      const res = await request(app).post(`${base()}/next`).set(auth());
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth (next)', async () => {
      const res = await request(app).post(`${base()}/next`);
      expect(res.status).toBe(401);
    });
  });
});
