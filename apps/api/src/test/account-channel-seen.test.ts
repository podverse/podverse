import { config } from '@api/config/index.js';
import { channelSeenReadRateLimit } from '@api/controllers/account/accountChannelSeen.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AccountMembershipEnum,
  CHANNEL_SEEN_MARK_BATCH_LIMIT,
  CHANNEL_SEEN_READ_PAGE_LIMIT,
} from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

/**
 * Channel seen state endpoints.
 *
 * Three properties carry the design and are asserted here rather than left to review: the count is
 * capped so a decade of a daily show cannot be scanned or rendered, the result set is bounded so an
 * account following hundreds of shows cannot trigger an unbounded query, and the reads are limited
 * per account so a signed-in client in a loop cannot make a bounded query into a busy one.
 *
 * The fourth is independence — seen state is about content, the inbox is about notifications, and
 * the two must never read each other's rows.
 */

const TEST_EMAIL = 'channel-seen-test@example.com';
const TEST_USER_ID = 1;

/** Stateful across a test, so monotonicity is a real assertion rather than a mock returning input. */
const channelLastSeenAt = new Map<string, Date>();
const feedLastSeenAt = new Map<string, Date>();

const {
  getAccountMock,
  listSeenStateWithCountMock,
  markChannelsSeenMock,
  markAllChannelsSeenMock,
  listAddByRssSeenStateMock,
  markAddByRSSChannelsSeenMock,
  markAllAddByRSSChannelsSeenMock,
  notificationListPaginatedMock,
  notificationCountUnreadMock,
  updateNotificationsLastReadAtMock,
} = vi.hoisted(() => ({
  getAccountMock: vi.fn(async () => ({
    id: 1,
    id_text: 'channel-seen-test-user',
    account_credentials: { email: 'channel-seen-test@example.com' },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
      account_membership: { id: AccountMembershipEnum.Premium },
    },
    sharable_status: { id: 1 },
  })),
  listSeenStateWithCountMock: vi.fn(
    async (
      _accountId: number,
      _page: { limit: number; offset: number }
    ): Promise<{
      count: number;
      results: { channel_id_text: string; last_seen_at: Date | null; raw_unseen_count: number }[];
    }> => ({ count: 0, results: [] })
  ),
  markChannelsSeenMock: vi.fn(
    async (
      _accountId: number,
      _entries: { channel_id_text: string; last_seen_at?: Date }[],
      _defaultSeenAt: Date
    ): Promise<
      { channel_id_text: string; last_seen_at: Date | null; raw_unseen_count: number }[]
    > => []
  ),
  markAllChannelsSeenMock: vi.fn(async (_accountId: number, _seenAt: Date): Promise<number> => 0),
  listAddByRssSeenStateMock: vi.fn(
    async (
      _accountId: number,
      _page: { limit: number; offset: number }
    ): Promise<{ count: number; results: { feed_url: string; last_seen_at: Date | null }[] }> => ({
      count: 0,
      results: [],
    })
  ),
  markAddByRSSChannelsSeenMock: vi.fn(
    async (
      _accountId: number,
      _entries: { feed_url: string; last_seen_at?: Date }[],
      _defaultSeenAt: Date
    ): Promise<{ feed_url: string; last_seen_at: Date | null }[]> => []
  ),
  markAllAddByRSSChannelsSeenMock: vi.fn(
    async (_accountId: number, _seenAt: Date): Promise<number> => 0
  ),
  notificationListPaginatedMock: vi.fn(async (): Promise<unknown[]> => []),
  notificationCountUnreadMock: vi.fn(async (): Promise<number> => 0),
  updateNotificationsLastReadAtMock: vi.fn(async (_accountId: number, readAt: Date) => readAt),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
    updateNotificationsLastReadAt = updateNotificationsLastReadAtMock;
  }

  class MockAccountFollowingChannelService {
    listSeenStateWithCount = listSeenStateWithCountMock;
    markChannelsSeen = markChannelsSeenMock;
    markAllChannelsSeen = markAllChannelsSeenMock;
  }

  class MockAccountFollowingAddByRSSChannelService {
    listSeenState = listAddByRssSeenStateMock;
    markAddByRSSChannelsSeen = markAddByRSSChannelsSeenMock;
    markAllAddByRSSChannelsSeen = markAllAddByRSSChannelsSeenMock;
  }

  // Present only so "nothing here is touched" can be asserted.
  class MockAccountNotificationService {
    listPaginatedForAccount = notificationListPaginatedMock;
    countUnread = notificationCountUnreadMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountFollowingChannelService: MockAccountFollowingChannelService,
    AccountFollowingAddByRSSChannelService: MockAccountFollowingAddByRSSChannelService,
    AccountNotificationService: MockAccountNotificationService,
  };
});

/** Apply the same keep-the-later rule the SQL `GREATEST` does, so replays can be asserted. */
const applyMonotonic = (store: Map<string, Date>, key: string, candidate: Date): Date => {
  const existing = store.get(key);
  const next =
    existing !== undefined && existing.getTime() > candidate.getTime() ? existing : candidate;
  store.set(key, next);
  return next;
};

let seenBase: string;

describe('account channel seen routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    seenBase = (await getBaseApiUrl()) + '/account/channel-seen';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(() => {
    channelLastSeenAt.clear();
    feedLastSeenAt.clear();
    vi.clearAllMocks();
    // The limiter store is in-memory for the process lifetime, so without this the case that
    // exhausts it would 429 every case after it.
    channelSeenReadRateLimit.resetForUser(TEST_USER_ID);

    getAccountMock.mockResolvedValue({
      id: TEST_USER_ID,
      id_text: TEST_USER_ACCOUNT_ID_TEXT,
      account_credentials: { email: TEST_EMAIL },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
        account_membership: { id: AccountMembershipEnum.Premium },
      },
      sharable_status: { id: 1 },
    });
  });

  describe('GET /account/channel-seen', () => {
    it('caps the count at 20 and flags anything beyond it', async () => {
      listSeenStateWithCountMock.mockResolvedValueOnce({
        count: 3,
        results: [
          // The ORM stops counting one past the cap, so 21 is what "more than 20" looks like here.
          {
            channel_id_text: 'busy',
            last_seen_at: new Date('2026-01-01T00:00:00.000Z'),
            raw_unseen_count: 21,
          },
          {
            channel_id_text: 'exactly-cap',
            last_seen_at: new Date('2026-01-01T00:00:00.000Z'),
            raw_unseen_count: 20,
          },
          { channel_id_text: 'never-opened', last_seen_at: null, raw_unseen_count: 0 },
        ],
      });

      const res = await request(app).get(seenBase).set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        {
          channel_id_text: 'busy',
          has_more_unseen: true,
          last_seen_at: '2026-01-01T00:00:00.000Z',
          unseen_count: 20,
        },
        {
          channel_id_text: 'exactly-cap',
          has_more_unseen: false,
          last_seen_at: '2026-01-01T00:00:00.000Z',
          unseen_count: 20,
        },
        {
          channel_id_text: 'never-opened',
          has_more_unseen: false,
          last_seen_at: null,
          unseen_count: 0,
        },
      ]);
    });

    it('bounds every query to one page, whatever page is asked for', async () => {
      await request(app).get(seenBase).set(authHeaders(TEST_USER_ID));
      expect(listSeenStateWithCountMock).toHaveBeenCalledWith(TEST_USER_ID, {
        limit: CHANNEL_SEEN_READ_PAGE_LIMIT,
        offset: 0,
      });

      await request(app).get(`${seenBase}?page=4`).set(authHeaders(TEST_USER_ID));
      expect(listSeenStateWithCountMock).toHaveBeenLastCalledWith(TEST_USER_ID, {
        limit: CHANNEL_SEEN_READ_PAGE_LIMIT,
        offset: CHANNEL_SEEN_READ_PAGE_LIMIT * 3,
      });
    });

    it('rejects a page below 1 rather than computing a negative offset', async () => {
      const res = await request(app).get(`${seenBase}?page=0`).set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(400);
      expect(listSeenStateWithCountMock).not.toHaveBeenCalled();
    });

    it('never reads notification rows', async () => {
      await request(app).get(seenBase).set(authHeaders(TEST_USER_ID));

      expect(notificationListPaginatedMock).not.toHaveBeenCalled();
      expect(notificationCountUnreadMock).not.toHaveBeenCalled();
    });

    /**
     * The page limit bounds one request; this bounds how many an account may make. Both are needed:
     * a page is only affordable because it is asked for at a human rate.
     */
    it('stops answering an account past its per-minute ceiling', async () => {
      const max = config.rateLimits.accountChannelSeenRead.max;

      for (let sent = 0; sent < max; sent += 1) {
        const allowed = await request(app).get(seenBase).set(authHeaders(TEST_USER_ID));
        expect(allowed.status).toBe(200);
      }

      const limited = await request(app).get(seenBase).set(authHeaders(TEST_USER_ID));
      expect(limited.status).toBe(429);
      expect(listSeenStateWithCountMock).toHaveBeenCalledTimes(max);
    });

    it('counts the two reads against one shared ceiling, since they cost the same account', async () => {
      const max = config.rateLimits.accountChannelSeenRead.max;

      for (let sent = 0; sent < max; sent += 1) {
        await request(app).get(`${seenBase}/add-by-rss`).set(authHeaders(TEST_USER_ID));
      }

      const limited = await request(app).get(seenBase).set(authHeaders(TEST_USER_ID));
      expect(limited.status).toBe(429);
      expect(listSeenStateWithCountMock).not.toHaveBeenCalled();
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(seenBase);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /account/channel-seen/add-by-rss', () => {
    it('returns timestamps without counts, because the server holds no add-by-RSS items', async () => {
      listAddByRssSeenStateMock.mockResolvedValueOnce({
        count: 2,
        results: [
          {
            feed_url: 'https://example.com/a.xml',
            last_seen_at: new Date('2026-02-02T00:00:00.000Z'),
          },
          { feed_url: 'https://example.com/b.xml', last_seen_at: null },
        ],
      });

      const res = await request(app).get(`${seenBase}/add-by-rss`).set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { feed_url: 'https://example.com/a.xml', last_seen_at: '2026-02-02T00:00:00.000Z' },
        { feed_url: 'https://example.com/b.xml', last_seen_at: null },
      ]);
      expect(listAddByRssSeenStateMock).toHaveBeenCalledWith(TEST_USER_ID, {
        limit: CHANNEL_SEEN_READ_PAGE_LIMIT,
        offset: 0,
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${seenBase}/add-by-rss`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /account/channel-seen/mark', () => {
    it('keeps the later timestamp when an older one is replayed', async () => {
      markChannelsSeenMock.mockImplementation(
        async (
          _accountId: number,
          entries: { channel_id_text: string; last_seen_at?: Date }[],
          defaultSeenAt: Date
        ) =>
          entries.map((entry) => ({
            channel_id_text: entry.channel_id_text,
            last_seen_at: applyMonotonic(
              channelLastSeenAt,
              entry.channel_id_text,
              entry.last_seen_at ?? defaultSeenAt
            ),
            raw_unseen_count: 0,
          }))
      );

      const later = '2026-05-01T00:00:00.000Z';
      const earlier = '2026-01-01T00:00:00.000Z';

      const first = await request(app)
        .post(`${seenBase}/mark`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries: [{ channel_id_text: 'show', last_seen_at: later }] });

      expect(first.status).toBe(200);
      expect(first.body.data[0].last_seen_at).toBe(later);

      const replay = await request(app)
        .post(`${seenBase}/mark`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries: [{ channel_id_text: 'show', last_seen_at: earlier }] });

      expect(replay.status).toBe(200);
      expect(replay.body.data[0].last_seen_at).toBe(later);
    });

    it('records now when no timestamp is supplied, which is what opening a channel does', async () => {
      markChannelsSeenMock.mockImplementation(
        async (
          _accountId: number,
          entries: { channel_id_text: string; last_seen_at?: Date }[],
          defaultSeenAt: Date
        ) =>
          entries.map((entry) => ({
            channel_id_text: entry.channel_id_text,
            last_seen_at: entry.last_seen_at ?? defaultSeenAt,
            raw_unseen_count: 0,
          }))
      );

      const before = Date.now();
      const res = await request(app)
        .post(`${seenBase}/mark`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries: [{ channel_id_text: 'show' }] });

      expect(res.status).toBe(200);
      const recorded = Date.parse(res.body.data[0].last_seen_at);
      expect(recorded).toBeGreaterThanOrEqual(before);
      expect(recorded).toBeLessThanOrEqual(Date.now());
    });

    it('rejects a batch larger than the write cap rather than accepting an unbounded write', async () => {
      const entries = Array.from(
        { length: CHANNEL_SEEN_MARK_BATCH_LIMIT + 1 },
        (_value, index) => ({
          channel_id_text: `show-${index}`,
        })
      );

      const res = await request(app)
        .post(`${seenBase}/mark`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries });

      expect(res.status).toBe(400);
      expect(markChannelsSeenMock).not.toHaveBeenCalled();
    });

    it('rejects a timestamp that is not ISO 8601', async () => {
      const res = await request(app)
        .post(`${seenBase}/mark`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries: [{ channel_id_text: 'show', last_seen_at: 'yesterday' }] });

      expect(res.status).toBe(400);
      expect(markChannelsSeenMock).not.toHaveBeenCalled();
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${seenBase}/mark`)
        .send({ entries: [{ channel_id_text: 'show' }] });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /account/channel-seen/mark-add-by-rss', () => {
    it('keeps the later timestamp when an older one is replayed', async () => {
      markAddByRSSChannelsSeenMock.mockImplementation(
        async (
          _accountId: number,
          entries: { feed_url: string; last_seen_at?: Date }[],
          defaultSeenAt: Date
        ) =>
          entries.map((entry) => ({
            feed_url: entry.feed_url,
            last_seen_at: applyMonotonic(
              feedLastSeenAt,
              entry.feed_url,
              entry.last_seen_at ?? defaultSeenAt
            ),
          }))
      );

      const feed_url = 'https://example.com/feed.xml';
      const later = '2026-05-01T00:00:00.000Z';

      await request(app)
        .post(`${seenBase}/mark-add-by-rss`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries: [{ feed_url, last_seen_at: later }] });

      const replay = await request(app)
        .post(`${seenBase}/mark-add-by-rss`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries: [{ feed_url, last_seen_at: '2026-01-01T00:00:00.000Z' }] });

      expect(replay.status).toBe(200);
      expect(replay.body.data).toEqual([{ feed_url, last_seen_at: later }]);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${seenBase}/mark-add-by-rss`)
        .send({ entries: [{ feed_url: 'https://example.com/feed.xml' }] });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /account/channel-seen/mark-all', () => {
    it('sweeps channels and add-by-RSS feeds at one shared moment', async () => {
      markAllChannelsSeenMock.mockResolvedValueOnce(7);
      markAllAddByRSSChannelsSeenMock.mockResolvedValueOnce(2);

      const res = await request(app).post(`${seenBase}/mark-all`).set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.data.updated_count).toBe(9);

      const channelSeenAt = markAllChannelsSeenMock.mock.calls[0]?.[1];
      const feedSeenAt = markAllAddByRSSChannelsSeenMock.mock.calls[0]?.[1];
      expect(channelSeenAt).toEqual(feedSeenAt);
      expect(res.body.data.last_seen_at).toBe(channelSeenAt?.toISOString());
    });

    it('never reads notification rows', async () => {
      await request(app).post(`${seenBase}/mark-all`).set(authHeaders(TEST_USER_ID));

      expect(notificationListPaginatedMock).not.toHaveBeenCalled();
      expect(notificationCountUnreadMock).not.toHaveBeenCalled();
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post(`${seenBase}/mark-all`);

      expect(res.status).toBe(401);
    });
  });

  /**
   * The two indicators answer different questions — how much of a show you have not looked at, and
   * how many inbox rows you have not opened — so clearing one must never clear the other. Asserted
   * from both directions because either one alone would let the coupling back in.
   */
  describe('read state and seen state do not touch each other', () => {
    it('opening the inbox leaves every channel where it was', async () => {
      const notificationsBase = (await getBaseApiUrl()) + '/account/notifications';

      const res = await request(app)
        .post(`${notificationsBase}/mark-read`)
        .set(authHeaders(TEST_USER_ID))
        .send({});

      expect(res.status).toBe(200);
      expect(updateNotificationsLastReadAtMock).toHaveBeenCalledTimes(1);
      expect(markChannelsSeenMock).not.toHaveBeenCalled();
      expect(markAllChannelsSeenMock).not.toHaveBeenCalled();
      expect(markAddByRSSChannelsSeenMock).not.toHaveBeenCalled();
      expect(markAllAddByRSSChannelsSeenMock).not.toHaveBeenCalled();
    });

    it('opening a channel leaves the inbox unread', async () => {
      const res = await request(app)
        .post(`${seenBase}/mark`)
        .set(authHeaders(TEST_USER_ID))
        .send({ entries: [{ channel_id_text: 'a-channel' }] });

      expect(res.status).toBe(200);
      expect(markChannelsSeenMock).toHaveBeenCalledTimes(1);
      expect(updateNotificationsLastReadAtMock).not.toHaveBeenCalled();
      expect(notificationCountUnreadMock).not.toHaveBeenCalled();
    });
  });
});
