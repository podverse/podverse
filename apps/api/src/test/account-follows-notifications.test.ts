import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AccountMembershipEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_EMAIL = 'follows-test@example.com';
const TEST_USER_ID = 1;
const TEST_ACCOUNT_ID_TEXT = 'follows-test-user';

const {
  followAccountMock,
  unfollowAccountMock,
  followChannelMock,
  unfollowChannelMock,
  followPlaylistMock,
  unfollowPlaylistMock,
  addOrUpdateRSSChannelMock,
  getFollowedAddByRSSChannelsMock,
  removeRSSChannelMock,
  getAccountByIdTextMock,
  getAccountMock,
  getManyPublicMock,
  notificationChannelGetByAccountAndChannelMock,
  notificationChannelGetAllByAccountMock,
  notificationChannelCreateMock,
  notificationChannelDeleteMock,
  notificationChannelTypeCreateMock,
  notificationChannelTypeDeleteMock,
  statsAggregatedGetManyMock,
  statsAggregatedGetManyByAccountsAndCountMock,
  followingAccountGetAllWithCountMock,
  hasFollowedAddByRSSChannelMock,
  getFollowedAddByRSSChannelCountMock,
  getFollowedChannelsMock,
} = vi.hoisted(() => ({
  followAccountMock: vi.fn(async () => {}),
  unfollowAccountMock: vi.fn(async () => {}),
  followChannelMock: vi.fn(async () => {}),
  unfollowChannelMock: vi.fn(async () => {}),
  followPlaylistMock: vi.fn(async () => {}),
  unfollowPlaylistMock: vi.fn(async () => {}),
  addOrUpdateRSSChannelMock: vi.fn(async () => {}),
  getFollowedAddByRSSChannelsMock: vi.fn(async () => []),
  removeRSSChannelMock: vi.fn(async () => {}),
  getAccountByIdTextMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
      account_membership: { id: AccountMembershipEnum.Premium },
    },
    sharable_status: { id: 1 },
  })),
  getAccountMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    id_text: TEST_USER_ACCOUNT_ID_TEXT,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
      account_membership: { id: AccountMembershipEnum.Premium },
    },
    sharable_status: { id: 1 },
  })),
  getManyPublicMock: vi.fn(async () => []),
  notificationChannelGetByAccountAndChannelMock: vi.fn(async () => ({
    id: 1,
    channel_id_text: 'test-channel',
  })),
  notificationChannelGetAllByAccountMock: vi.fn(async () => []),
  notificationChannelCreateMock: vi.fn(async () => ({
    id: 1,
    channel_id_text: 'test-channel',
  })),
  notificationChannelDeleteMock: vi.fn(async () => {}),
  notificationChannelTypeCreateMock: vi.fn(async () => ({
    id: 1,
    channel_id_text: 'test-channel',
    type: 'new-item',
  })),
  notificationChannelTypeDeleteMock: vi.fn(async () => {}),
  statsAggregatedGetManyMock: vi.fn(async () => []),
  statsAggregatedGetManyByAccountsAndCountMock: vi.fn(async () => []),
  followingAccountGetAllWithCountMock: vi.fn(async () => ({ results: [], count: 0 })),
  hasFollowedAddByRSSChannelMock: vi.fn(async () => false),
  getFollowedAddByRSSChannelCountMock: vi.fn(async () => 0),
  getFollowedChannelsMock: vi.fn(async () => []),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
    getByIdText = getAccountByIdTextMock;
    getManyPublic = getManyPublicMock;
  }

  class MockAccountFollowingAccountService {
    followAccount = followAccountMock;
    unfollowAccount = unfollowAccountMock;
    _getAllWithCount = followingAccountGetAllWithCountMock;
    async getFollowedAccountsPrivate(): Promise<Array<{ following_account?: { id: number } }>> {
      return [];
    }
  }

  class MockAccountFollowingChannelService {
    followChannel = followChannelMock;
    unfollowChannel = unfollowChannelMock;
    getFollowedChannels = getFollowedChannelsMock;
  }

  class MockAccountFollowingPlaylistService {
    followPlaylist = followPlaylistMock;
    unfollowPlaylist = unfollowPlaylistMock;
  }

  class MockAccountFollowingAddByRSSChannelService {
    addOrUpdateRSSChannel = addOrUpdateRSSChannelMock;
    getFollowedAddByRSSChannels = getFollowedAddByRSSChannelsMock;
    removeRSSChannel = removeRSSChannelMock;
    hasFollowedAddByRSSChannel = hasFollowedAddByRSSChannelMock;
    getFollowedAddByRSSChannelCount = getFollowedAddByRSSChannelCountMock;
    async getCredentialsForFeed(): Promise<{ username: string; password: string } | null> {
      return null;
    }
  }

  class MockAccountNotificationChannelService {
    getByAccountIdAndChannelIdText = notificationChannelGetByAccountAndChannelMock;
    getAllByAccountId = notificationChannelGetAllByAccountMock;
    create = notificationChannelCreateMock;
    delete = notificationChannelDeleteMock;
  }

  class MockAccountNotificationChannelTypeService {
    create = notificationChannelTypeCreateMock;
    delete = notificationChannelTypeDeleteMock;
  }

  class MockStatsAggregatedAccountService {
    getMany = statsAggregatedGetManyMock;
    getManyByAccountsAndCount = statsAggregatedGetManyByAccountsAndCountMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountFollowingAccountService: MockAccountFollowingAccountService,
    AccountFollowingChannelService: MockAccountFollowingChannelService,
    AccountFollowingPlaylistService: MockAccountFollowingPlaylistService,
    AccountFollowingAddByRSSChannelService: MockAccountFollowingAddByRSSChannelService,
    AccountNotificationChannelService: MockAccountNotificationChannelService,
    AccountNotificationChannelTypeService: MockAccountNotificationChannelTypeService,
    StatsAggregatedAccountService: MockStatsAggregatedAccountService,
  };
});

let accountBase: string;

describe('account follows and notification routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    accountBase = (await getBaseApiUrl()) + '/account';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  // ─── Follow/Unfollow Account ────────────────────────────────────────

  describe('POST /follow/account', () => {
    it('returns 201 when following an account with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/account`)
        .set(authHeaders(TEST_USER_ID))
        .send({ following_account_id_text: 'some-user' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Successfully followed account');
      expect(followAccountMock).toHaveBeenCalledWith(TEST_USER_ID, {
        following_account_id_text: 'some-user',
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/account`)
        .send({ following_account_id_text: 'some-user' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /unfollow/account', () => {
    it('returns 204 when unfollowing an account with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/account`)
        .set(authHeaders(TEST_USER_ID))
        .send({ following_account_id_text: 'some-user' });

      expect(res.status).toBe(204);
      expect(unfollowAccountMock).toHaveBeenCalledWith(TEST_USER_ID, {
        following_account_id_text: 'some-user',
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/account`)
        .send({ following_account_id_text: 'some-user' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Follow/Unfollow Channel ────────────────────────────────────────

  describe('POST /follow/channel', () => {
    it('returns 201 when following a channel with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/channel`)
        .set(authHeaders(TEST_USER_ID))
        .send({ channel_id_text: 'some-channel' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Successfully followed channel');
      expect(followChannelMock).toHaveBeenCalledWith(TEST_USER_ID, 'some-channel');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/channel`)
        .send({ channel_id_text: 'some-channel' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /unfollow/channel', () => {
    it('returns 204 when unfollowing a channel with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/channel`)
        .set(authHeaders(TEST_USER_ID))
        .send({ channel_id_text: 'some-channel' });

      expect(res.status).toBe(204);
      expect(unfollowChannelMock).toHaveBeenCalledWith(TEST_USER_ID, 'some-channel');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/channel`)
        .send({ channel_id_text: 'some-channel' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Follow/Unfollow Playlist ───────────────────────────────────────

  describe('POST /follow/playlist', () => {
    it('returns 201 when following a playlist with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/playlist`)
        .set(authHeaders(TEST_USER_ID))
        .send({ playlist_id_text: 'some-playlist' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Successfully followed playlist');
      expect(followPlaylistMock).toHaveBeenCalledWith(TEST_USER_ID, 'some-playlist');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/playlist`)
        .send({ playlist_id_text: 'some-playlist' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /unfollow/playlist', () => {
    it('returns 204 when unfollowing a playlist with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/playlist`)
        .set(authHeaders(TEST_USER_ID))
        .send({ playlist_id_text: 'some-playlist' });

      expect(res.status).toBe(204);
      expect(unfollowPlaylistMock).toHaveBeenCalledWith(TEST_USER_ID, 'some-playlist');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/playlist`)
        .send({ playlist_id_text: 'some-playlist' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Follow/Unfollow Add-by-RSS Channel ─────────────────────────────

  describe('POST /follow/add-by-rss-channel', () => {
    it('returns 201 when adding an RSS channel with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/add-by-rss-channel`)
        .set(authHeaders(TEST_USER_ID))
        .send({ feed_url: 'https://example.com/feed.xml' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('RSS channel added/updated successfully');
      expect(addOrUpdateRSSChannelMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({ feed_url: 'https://example.com/feed.xml' })
      );
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/follow/add-by-rss-channel`)
        .send({ feed_url: 'https://example.com/feed.xml' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /follow/add-by-rss-channel/:account_id_text', () => {
    it('returns 200 with channels when authenticated as the owner', async () => {
      getAccountByIdTextMock.mockResolvedValueOnce({ id: TEST_USER_ID });
      getFollowedAddByRSSChannelsMock.mockResolvedValueOnce([
        { feed_url: 'https://example.com/feed.xml' },
      ]);

      const res = await request(app)
        .get(`${accountBase}/follow/add-by-rss-channel/${TEST_ACCOUNT_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(
        `${accountBase}/follow/add-by-rss-channel/${TEST_ACCOUNT_ID_TEXT}`
      );

      expect(res.status).toBe(401);
    });
  });

  describe('POST /unfollow/add-by-rss-channel', () => {
    it('returns 204 when removing an RSS channel with valid auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/add-by-rss-channel`)
        .set(authHeaders(TEST_USER_ID))
        .send({ feed_url: 'https://example.com/feed.xml' });

      expect(res.status).toBe(204);
      expect(removeRSSChannelMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        'https://example.com/feed.xml'
      );
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/unfollow/add-by-rss-channel`)
        .send({ feed_url: 'https://example.com/feed.xml' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Notification Channels ──────────────────────────────────────────

  describe('GET /notification/channels', () => {
    it('returns 200 with array of notification channels', async () => {
      notificationChannelGetAllByAccountMock.mockResolvedValueOnce([
        { id: 1, channel_id_text: 'ch-1' },
      ]);

      const res = await request(app)
        .get(`${accountBase}/notification/channels`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/notification/channels`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /notification/channel/:channel_id_text', () => {
    it('returns 200 with notification channel when found', async () => {
      notificationChannelGetByAccountAndChannelMock.mockResolvedValueOnce({
        id: 1,
        channel_id_text: 'test-channel',
      });

      const res = await request(app)
        .get(`${accountBase}/notification/channel/test-channel`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
    });

    it('returns 404 when notification channel not found', async () => {
      notificationChannelGetByAccountAndChannelMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`${accountBase}/notification/channel/nonexistent`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Notification channel not found');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/notification/channel/test-channel`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /notification/channel', () => {
    it('returns 201 when creating a notification channel', async () => {
      notificationChannelCreateMock.mockResolvedValueOnce({
        id: 1,
        channel_id_text: 'new-channel',
      });

      const res = await request(app)
        .post(`${accountBase}/notification/channel`)
        .set(authHeaders(TEST_USER_ID))
        .send({ channel_id_text: 'new-channel' });

      expect(res.status).toBe(201);
      expect(notificationChannelCreateMock).toHaveBeenCalledWith(TEST_USER_ID, 'new-channel');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/notification/channel`)
        .send({ channel_id_text: 'new-channel' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /notification/channel/:channel_id_text', () => {
    it('returns 204 when deleting a notification channel', async () => {
      const res = await request(app)
        .delete(`${accountBase}/notification/channel/test-channel`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(204);
      expect(notificationChannelDeleteMock).toHaveBeenCalledWith(TEST_USER_ID, 'test-channel');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).delete(`${accountBase}/notification/channel/test-channel`);

      expect(res.status).toBe(401);
    });
  });

  // ─── Notification Channel Types ─────────────────────────────────────

  describe('POST /notification/channel/type', () => {
    it('returns 201 when creating a notification channel type', async () => {
      notificationChannelTypeCreateMock.mockResolvedValueOnce({
        id: 1,
        channel_id_text: 'test-channel',
        type: 'new-item',
      });

      const res = await request(app)
        .post(`${accountBase}/notification/channel/type`)
        .set(authHeaders(TEST_USER_ID))
        .send({ channel_id_text: 'test-channel', type: 'new-item' });

      expect(res.status).toBe(201);
      expect(notificationChannelTypeCreateMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        'test-channel',
        'new-item'
      );
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/notification/channel/type`)
        .send({ channel_id_text: 'test-channel', type: 'new-item' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('returns 403 when auth is valid but membership is expired', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() - 86400000),
        },
        sharable_status: { id: 1 },
      });

      const res = await withMutedExpectedErrorLogs(async () =>
        request(app)
          .post(`${accountBase}/notification/channel/type`)
          .set(authHeaders(TEST_USER_ID))
          .send({ channel_id_text: 'test-channel', type: 'new-item' })
      );

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Your membership has expired. Renew to use this feature.');
      expect(res.body.code).toBe('membership_expired');
    });
  });

  describe('DELETE /notification/channel/:channel_id_text/type/:type', () => {
    it('returns 204 when deleting a notification channel type', async () => {
      const res = await request(app)
        .delete(`${accountBase}/notification/channel/test-channel/type/new-item`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(204);
      expect(notificationChannelTypeDeleteMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        'test-channel',
        'new-item'
      );
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).delete(
        `${accountBase}/notification/channel/test-channel/type/new-item`
      );

      expect(res.status).toBe(401);
    });
  });

  // ─── Account Browse (Public) ────────────────────────────────────────

  describe('GET /recent', () => {
    it('returns 200 with public recent accounts', async () => {
      getManyPublicMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${accountBase}/recent?page=1`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /top', () => {
    it('returns 200 with public top accounts', async () => {
      statsAggregatedGetManyMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${accountBase}/top?page=1&range=day`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  // ─── Account Browse (Authenticated) ─────────────────────────────────

  describe('GET /subscribed/az', () => {
    it('returns 200 with subscribed accounts sorted A-Z', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      followingAccountGetAllWithCountMock.mockResolvedValueOnce({ results: [], count: 0 });

      const res = await request(app)
        .get(`${accountBase}/subscribed/az?page=1`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/subscribed/az?page=1`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /subscribed/recent', () => {
    it('returns 200 with recently subscribed accounts', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      followingAccountGetAllWithCountMock.mockResolvedValueOnce({ results: [], count: 0 });

      const res = await request(app)
        .get(`${accountBase}/subscribed/recent?page=1`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/subscribed/recent?page=1`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /subscribed/top', () => {
    it('returns 200 with top subscribed accounts', async () => {
      statsAggregatedGetManyByAccountsAndCountMock.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`${accountBase}/subscribed/top?page=1&range=day`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/subscribed/top?page=1&range=day`);

      expect(res.status).toBe(401);
    });
  });

  // ─── Add-by-RSS Chapters/Transcript ─────────────────────────────────

  describe('POST /add-by-rss/chapters-transcript', () => {
    it('returns 400 when neither chaptersFeedUrl nor transcriptUrl is provided', async () => {
      const res = await request(app)
        .post(`${accountBase}/add-by-rss/chapters-transcript`)
        .set(authHeaders(TEST_USER_ID))
        .send({ itemIdText: 'item-1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('chaptersFeedUrl');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/add-by-rss/chapters-transcript`)
        .send({ itemIdText: 'item-1', chaptersFeedUrl: 'https://example.com/chapters.json' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Add-by-RSS Parse ───────────────────────────────────────────────

  describe('POST /add-by-rss/parse', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/add-by-rss/parse`)
        .send({ feed_url: 'https://example.com/feed.xml' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /add-by-rss/parse/all', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post(`${accountBase}/add-by-rss/parse/all`).send({});

      expect(res.status).toBe(401);
    });
  });

  describe('GET /add-by-rss/parse/status/:request_id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/add-by-rss/parse/status/some-request-id`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /opml/export', () => {
    it('returns 200 with OPML payload when authenticated', async () => {
      getFollowedChannelsMock.mockResolvedValueOnce([
        {
          channel: {
            title: 'Directory Feed',
            feed: {
              url: 'https://example.com/directory.xml',
            },
          },
        },
      ]);
      getFollowedAddByRSSChannelsMock.mockResolvedValueOnce([
        {
          feed_url: 'https://example.com/add-by-rss.xml',
          title: 'Add by RSS Feed',
        },
      ]);

      const res = await request(app)
        .get(`${accountBase}/opml/export`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/x-opml');
      expect(res.headers['content-disposition']).toContain('podverse-opml-export-');
      expect(res.headers['content-disposition']).toContain('.opml');
      expect(res.text).toContain('<opml version="2.0">');
      expect(res.text).toContain('xmlUrl="https://example.com/directory.xml"');
      expect(res.text).toContain('xmlUrl="https://example.com/add-by-rss.xml"');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/opml/export`);
      expect(res.status).toBe(401);
    });
  });
});
