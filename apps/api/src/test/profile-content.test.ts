import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const TEST_EMAIL = 'profile-content-test@example.com';
const TEST_USER_ID = 1;
const ACCOUNT_ID_TEXT = 'test-profile-id-text';
const mockChannel = { id: 101, title: 'Test channel', sortable_title: 'test channel' };
const mockPlaylist = { id: 201, title: 'A playlist' };
const mockClip = { id: 301, title: 'A clip' };

const {
  getAccountMock,
  getByIdTextMock,
  getFollowedByIdTextWithCountMock,
  getFollowedWithCountMock,
  playlistGetManyPublicAndCountMock,
  playlistGetManyAndCountMock,
  clipGetManyPublicAndCountMock,
  clipGetManyAndCountMock,
} = vi.hoisted(() => ({
  getAccountMock: vi.fn(
    async (): Promise<{
      id: number;
      id_text: string;
      verified: boolean;
      account_credentials: { email: string };
      account_membership_status: { membership_expires_at: Date };
    } | null> => ({
      id: TEST_USER_ID,
      id_text: ACCOUNT_ID_TEXT,
      verified: true,
      account_credentials: { email: TEST_EMAIL },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
      },
    })
  ),
  getByIdTextMock: vi.fn(
    async (
      idText: string,
      _options?: { relations?: string[] }
    ): Promise<{
      id: number;
      id_text: string;
      sharable_status: { id: number };
    } | null> => ({
      id: 1,
      id_text: idText,
      sharable_status: { id: 1 },
    })
  ),
  getFollowedByIdTextWithCountMock: vi.fn(
    async (_accountIdText: string, _type: 'av' | 'music', _config: object) => ({
      results: [{ channel: mockChannel }],
      count: 1,
    })
  ),
  getFollowedWithCountMock: vi.fn(
    async (_accountId: number, _type: 'av' | 'music', _config: object) => ({
      results: [{ channel: { ...mockChannel, id: 102 } }],
      count: 1,
    })
  ),
  playlistGetManyPublicAndCountMock: vi.fn(async () => [[mockPlaylist], 1] as const),
  playlistGetManyAndCountMock: vi.fn(async () => [[{ ...mockPlaylist, id: 202 }], 1] as const),
  clipGetManyPublicAndCountMock: vi.fn(async () => [[mockClip], 1] as const),
  clipGetManyAndCountMock: vi.fn(async () => [[{ ...mockClip, id: 302 }], 1] as const),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
    getByIdText = getByIdTextMock;
  }

  class MockAccountFollowingChannelService {
    getFollowedChannelsByAccountIdTextWithCount = getFollowedByIdTextWithCountMock;
    getFollowedChannelsWithCount = getFollowedWithCountMock;
  }

  class MockPlaylistService {
    getManyByAccountIdTextPublicAndCount = playlistGetManyPublicAndCountMock;
    getManyByAccountIdTextAndCount = playlistGetManyAndCountMock;
  }

  class MockClipService {
    getManyByAccountIdTextPublicAndCount = clipGetManyPublicAndCountMock;
    getManyByAccountIdTextAndCount = clipGetManyAndCountMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountFollowingChannelService: MockAccountFollowingChannelService,
    PlaylistService: MockPlaylistService,
    ClipService: MockClipService,
  };
});

describe('profile content GET routes (public + my-profile)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let profileBase: string;
  let myProfileBase: string;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    const base = await getBaseApiUrl();
    profileBase = `${base}/profile`;
    myProfileBase = `${base}/my-profile`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(() => {
    getByIdTextMock.mockImplementation(async (idText: string) => ({
      id: 1,
      id_text: idText,
      sharable_status: { id: 1 },
    }));
  });

  const page1 = { page: 1 };

  describe('public profile', () => {
    it('returns 200 with podcasts (A–Z) for a public account', async () => {
      getFollowedByIdTextWithCountMock.mockClear();
      const res = await request(app)
        .get(`${profileBase}/${ACCOUNT_ID_TEXT}/podcasts/az`)
        .query(page1);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([mockChannel]);
      expect(res.body.meta).toMatchObject({ page: 1, count: 1, limit: expect.any(Number) });
      expect(getFollowedByIdTextWithCountMock).toHaveBeenCalledWith(
        ACCOUNT_ID_TEXT,
        'av',
        expect.objectContaining({ skip: 0, take: expect.any(Number) })
      );
    });

    it('returns 200 with albums (A–Z) for a public account', async () => {
      const res = await request(app)
        .get(`${profileBase}/${ACCOUNT_ID_TEXT}/albums/az`)
        .query(page1);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([mockChannel]);
      expect(res.body.meta).toMatchObject({ page: 1, count: 1 });
    });

    it('returns 200 with playlists for a public account (public only)', async () => {
      playlistGetManyPublicAndCountMock.mockClear();
      const res = await request(app)
        .get(`${profileBase}/${ACCOUNT_ID_TEXT}/playlists/az`)
        .query(page1);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([mockPlaylist]);
      expect(playlistGetManyPublicAndCountMock).toHaveBeenCalledTimes(1);
      expect(playlistGetManyAndCountMock).not.toHaveBeenCalled();
    });

    it('returns 200 with recent clips for a public account (public only)', async () => {
      clipGetManyPublicAndCountMock.mockClear();
      const res = await request(app)
        .get(`${profileBase}/${ACCOUNT_ID_TEXT}/clips/recent`)
        .query(page1);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([mockClip]);
      expect(clipGetManyPublicAndCountMock).toHaveBeenCalledTimes(1);
      expect(clipGetManyAndCountMock).not.toHaveBeenCalled();
    });

    it('returns 404 when account is missing', async () => {
      getByIdTextMock.mockResolvedValueOnce(null);
      const res = await request(app).get(`${profileBase}/missing-user/podcasts/az`).query(page1);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Account not found');
    });

    it('returns 404 when account is private (not public/unlisted)', async () => {
      getByIdTextMock.mockResolvedValueOnce({
        id: 2,
        id_text: 'private',
        sharable_status: { id: 3 },
      });
      const res = await request(app).get(`${profileBase}/private/albums/az`).query(page1);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Account not found');
    });
  });

  describe('my profile (authenticated)', () => {
    it('returns 200 with podcasts (A–Z) for the logged-in user', async () => {
      getFollowedWithCountMock.mockClear();
      const res = await request(app)
        .get(`${myProfileBase}/podcasts/az`)
        .query(page1)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL));
      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toBe(102);
      expect(res.body.meta).toMatchObject({ page: 1, count: 1 });
      expect(getFollowedWithCountMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        'av',
        expect.objectContaining({ skip: 0 })
      );
    });

    it('returns 200 with albums (A–Z) for the logged-in user', async () => {
      const res = await request(app)
        .get(`${myProfileBase}/albums/az`)
        .query(page1)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL));
      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ page: 1, count: 1 });
    });

    it('returns 200 with playlists (all sharable) for the logged-in user', async () => {
      playlistGetManyAndCountMock.mockClear();
      playlistGetManyPublicAndCountMock.mockClear();
      const res = await request(app)
        .get(`${myProfileBase}/playlists/az`)
        .query(page1)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL));
      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toBe(202);
      expect(playlistGetManyAndCountMock).toHaveBeenCalled();
      expect(playlistGetManyAndCountMock).toHaveBeenCalledWith(
        ACCOUNT_ID_TEXT,
        expect.objectContaining({ skip: 0, take: expect.any(Number) })
      );
      expect(playlistGetManyPublicAndCountMock).not.toHaveBeenCalled();
    });

    it('returns 200 with recent clips (all sharable) for the logged-in user', async () => {
      clipGetManyAndCountMock.mockClear();
      clipGetManyPublicAndCountMock.mockClear();
      const res = await request(app)
        .get(`${myProfileBase}/clips/recent`)
        .query(page1)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL));
      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toBe(302);
      expect(clipGetManyAndCountMock).toHaveBeenCalled();
      expect(clipGetManyAndCountMock).toHaveBeenCalledWith(
        ACCOUNT_ID_TEXT,
        expect.objectContaining({ skip: 0, take: expect.any(Number) })
      );
      expect(clipGetManyPublicAndCountMock).not.toHaveBeenCalled();
    });

    it('returns 401 without auth for /podcasts/az', async () => {
      const res = await request(app).get(`${myProfileBase}/podcasts/az`).query(page1);
      expect(res.status).toBe(401);
    });

    it('returns 401 without auth for /albums/az', async () => {
      const res = await request(app).get(`${myProfileBase}/albums/az`).query(page1);
      expect(res.status).toBe(401);
    });

    it('returns 401 without auth for /playlists/az', async () => {
      const res = await request(app).get(`${myProfileBase}/playlists/az`).query(page1);
      expect(res.status).toBe(401);
    });

    it('returns 401 without auth for /clips/recent', async () => {
      const res = await request(app).get(`${myProfileBase}/clips/recent`).query(page1);
      expect(res.status).toBe(401);
    });
  });
});
