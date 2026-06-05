import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAYLIST_LIKES_MEMBERSHIP_MAX_IDS } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_EMAIL = 'playlist-test@example.com';
const TEST_USER_ID = 1;
const OTHER_USER_ID = 2;
const PLAYLIST_ID_TEXT = 'test-pl-abc';
const CLIP_ID_TEXT = 'pl-clip-xyz';
const ITEM_ID_TEXT = 'pl-item-123';
const SOUNDBITE_ID_TEXT = 'pl-sb-456';

const {
  playlistCreateMock,
  playlistUpdateMock,
  playlistDeleteMock,
  playlistGetByIdTextMock,
  playlistGetOnePrivateMock,
  playlistGetOnePublicMock,
  playlistGetManyPrivateMock,
  playlistGetAllLikesPrivateMock,
  playlistGetLikesMembershipMock,
  playlistGetOrCreateDefaultLikesPlaylistMock,
  playlistHasItemLikeMock,
  playlistHasClipLikeMock,
  playlistHasAddByRSSLikeMock,
  statsPlGetManyPublicMock,
  statsPlGetManyPrivateMock,
  statsPlGetManyPrivateByPlaylistsMock,
  followingPlGetFollowedPlaylistsPrivateWithCountMock,
  plResourceGetAllByPlaylistIdTextMock,
  plResourceGetManyByPlaylistIdTextMock,
  plResourceGetAllByPlaylistIdTextCountMock,
  plResourceGetManyByPlaylistShuffleMock,
  plResourceGetManyForQueueByListPositionMock,
  plResourceAddClipFirstMock,
  plResourceAddClipBetweenMock,
  plResourceAddClipLastMock,
  plResourceRemoveClipMock,
  plResourceAddItemFirstMock,
  plResourceAddItemBetweenMock,
  plResourceAddItemLastMock,
  plResourceRemoveItemMock,
  plResourceAddRssFirstMock,
  plResourceAddRssBetweenMock,
  plResourceAddRssLastMock,
  plResourceRemoveRssMock,
  plResourceAddSbFirstMock,
  plResourceAddSbBetweenMock,
  plResourceAddSbLastMock,
  plResourceRemoveSbMock,
  itemGetByIdTextMock,
  clipGetByIdTextMock,
  getAccountMock,
} = vi.hoisted(() => ({
  playlistCreateMock: vi.fn(async () => ({ id: 1, playlist_id_text: PLAYLIST_ID_TEXT })),
  playlistUpdateMock: vi.fn(async () => ({ id: 1, playlist_id_text: PLAYLIST_ID_TEXT })),
  playlistDeleteMock: vi.fn(async () => {}),
  playlistGetByIdTextMock: vi.fn(
    async (
      id: string | undefined
    ): Promise<{
      id: number;
      playlist_id_text: string;
      account: { id: number };
      sharable_status: { id: number };
    }> => ({
      id: 1,
      playlist_id_text: id ?? PLAYLIST_ID_TEXT,
      account: { id: TEST_USER_ID },
      sharable_status: { id: 1 },
    })
  ),
  playlistGetOnePrivateMock: vi.fn(async () => ({
    id: 1,
    title: 'Mine',
    account: { id: TEST_USER_ID },
  })),
  playlistGetOnePublicMock: vi.fn(async () => ({
    id: 1,
    title: 'Public',
    account: { id: TEST_USER_ID },
  })),
  playlistGetManyPrivateMock: vi.fn(async () => [[{ id: 1 }], 1]),
  playlistGetAllLikesPrivateMock: vi.fn(async () => [{ id: 1, title: 'Like' }]),
  playlistGetLikesMembershipMock: vi.fn(async () => ({
    item_id_texts: [],
    clip_id_texts: [],
    add_by_rss_hash_ids: [],
  })),
  playlistGetOrCreateDefaultLikesPlaylistMock: vi.fn(async () => ({
    id: 1,
    id_text: PLAYLIST_ID_TEXT,
  })),
  playlistHasItemLikeMock: vi.fn(async () => false),
  playlistHasClipLikeMock: vi.fn(async () => false),
  playlistHasAddByRSSLikeMock: vi.fn(async () => false),
  statsPlGetManyPublicMock: vi.fn(async () => [{ playlist: { id: 1, title: 'Top' } }]),
  statsPlGetManyPrivateMock: vi.fn(async () => [[{ playlist: { id: 1 } }], 1]),
  statsPlGetManyPrivateByPlaylistsMock: vi.fn(async () => [
    [{ playlist: { id: 1, title: 'FTop' } }],
    1,
  ]),
  followingPlGetFollowedPlaylistsPrivateWithCountMock: vi.fn(async () => [
    [{ playlist_id: 1, playlist: { id: 1, title: 'Followed' } }],
    1,
  ]),
  plResourceGetAllByPlaylistIdTextMock: vi.fn(async () => [{ id: 1 }]),
  plResourceGetManyByPlaylistIdTextMock: vi.fn(async () => []),
  plResourceGetAllByPlaylistIdTextCountMock: vi.fn(async () => 0),
  plResourceGetManyByPlaylistShuffleMock: vi.fn(async () => []),
  plResourceGetManyForQueueByListPositionMock: vi.fn(async () => []),
  plResourceAddClipFirstMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddClipBetweenMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddClipLastMock: vi.fn(async () => ({ id: 1 })),
  plResourceRemoveClipMock: vi.fn(async () => {}),
  plResourceAddItemFirstMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddItemBetweenMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddItemLastMock: vi.fn(async () => ({ id: 1 })),
  plResourceRemoveItemMock: vi.fn(async () => {}),
  plResourceAddRssFirstMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddRssBetweenMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddRssLastMock: vi.fn(async () => ({ id: 1 })),
  plResourceRemoveRssMock: vi.fn(async () => {}),
  plResourceAddSbFirstMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddSbBetweenMock: vi.fn(async () => ({ id: 1 })),
  plResourceAddSbLastMock: vi.fn(async () => ({ id: 1 })),
  plResourceRemoveSbMock: vi.fn(async () => {}),
  itemGetByIdTextMock: vi.fn(async () => ({
    id: 10,
    id_text: ITEM_ID_TEXT,
    channel: { medium_id: 20 },
  })),
  clipGetByIdTextMock: vi.fn(async () => ({
    id: 11,
    id_text: CLIP_ID_TEXT,
  })),
  getAccountMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    id_text: TEST_USER_ACCOUNT_ID_TEXT,
    verified: true,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
    },
    sharable_status: { id: 1 },
  })),
}));

function ownershipPlaylist(ownerId: number) {
  return {
    id: 1,
    playlist_id_text: PLAYLIST_ID_TEXT,
    account: { id: ownerId },
    sharable_status: { id: 1 },
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

  class MockPlaylistService {
    create = playlistCreateMock;
    update = playlistUpdateMock;
    delete = playlistDeleteMock;
    getByIdText = playlistGetByIdTextMock;
    getOnePrivate = playlistGetOnePrivateMock;
    getOnePublic = playlistGetOnePublicMock;
    getManyPrivate = playlistGetManyPrivateMock;
    getAllLikesPrivate = playlistGetAllLikesPrivateMock;
    getLikesMembership = playlistGetLikesMembershipMock;
    getOrCreateDefaultLikesPlaylist = playlistGetOrCreateDefaultLikesPlaylistMock;
    hasItemLike = playlistHasItemLikeMock;
    hasClipLike = playlistHasClipLikeMock;
    hasAddByRSSLike = playlistHasAddByRSSLikeMock;
  }

  class MockPlaylistResourceService {
    getAllByPlaylistIdText = plResourceGetAllByPlaylistIdTextMock;
    getManyByPlaylistIdText = plResourceGetManyByPlaylistIdTextMock;
    getAllByPlaylistIdTextCount = plResourceGetAllByPlaylistIdTextCountMock;
    getManyByPlaylistShuffle = plResourceGetManyByPlaylistShuffleMock;
    getManyForQueueByListPosition = plResourceGetManyForQueueByListPositionMock;
    addClipToPlaylistFirst = plResourceAddClipFirstMock;
    addClipToPlaylistBetween = plResourceAddClipBetweenMock;
    addClipToPlaylistLast = plResourceAddClipLastMock;
    removeClipFromPlaylist = plResourceRemoveClipMock;
    addItemToPlaylistFirst = plResourceAddItemFirstMock;
    addItemToPlaylistBetween = plResourceAddItemBetweenMock;
    addItemToPlaylistLast = plResourceAddItemLastMock;
    removeItemFromPlaylist = plResourceRemoveItemMock;
    addItemAddByRSSToPlaylistFirst = plResourceAddRssFirstMock;
    addItemAddByRSSToPlaylistBetween = plResourceAddRssBetweenMock;
    addItemAddByRSSToPlaylistLast = plResourceAddRssLastMock;
    removeItemAddByRSSFromPlaylist = plResourceRemoveRssMock;
    addItemSoundbiteToPlaylistFirst = plResourceAddSbFirstMock;
    addItemSoundbiteToPlaylistBetween = plResourceAddSbBetweenMock;
    addItemSoundbiteToPlaylistLast = plResourceAddSbLastMock;
    removeItemSoundbiteFromPlaylist = plResourceRemoveSbMock;
  }

  class MockStatsAggregatedPlaylistService {
    getManyPublic = statsPlGetManyPublicMock;
    getManyPrivate = statsPlGetManyPrivateMock;
    getManyPrivateByPlaylists = statsPlGetManyPrivateByPlaylistsMock;
  }

  class MockAccountFollowingPlaylistService {
    getFollowedPlaylistsPrivateWithCount = followingPlGetFollowedPlaylistsPrivateWithCountMock;
  }

  class MockItemService {
    getByIdText = itemGetByIdTextMock;
  }

  class MockClipService {
    getByIdText = clipGetByIdTextMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    PlaylistService: MockPlaylistService,
    PlaylistResourceService: MockPlaylistResourceService,
    ItemService: MockItemService,
    ClipService: MockClipService,
    StatsAggregatedPlaylistService: MockStatsAggregatedPlaylistService,
    AccountFollowingPlaylistService: MockAccountFollowingPlaylistService,
  };
});

const validCreateBody = {
  title: 'My list',
  description: '',
  medium: 'music',
  sharable_status_id: 1,
};

const validUpdateBody = {
  title: 'Updated',
  description: '',
  sharable_status_id: 1,
};

let playlistBase: string;

describe('playlist routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    playlistBase = (await getBaseApiUrl()) + '/playlist';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  describe('POST /', () => {
    it('returns 201 with valid data', async () => {
      const res = await request(app)
        .post(`${playlistBase}/`)
        .set(authHeaders(TEST_USER_ID))
        .send(validCreateBody);

      expect(res.status).toBe(201);
      expect(playlistCreateMock).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          medium_id: expect.any(Number),
          sharable_status_id: 1,
          title: 'My list',
        })
      );
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post(`${playlistBase}/`).send(validCreateBody);

      expect(res.status).toBe(401);
    });

    it('returns 400 with missing required fields', async () => {
      const res = await request(app)
        .post(`${playlistBase}/`)
        .set(authHeaders(TEST_USER_ID))
        .send({ title: 'x' });

      expect(res.status).toBe(400);
    });

    it('returns 403 when membership is expired', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: new Date(0) },
      });

      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).post(`${playlistBase}/`).set(authHeaders(TEST_USER_ID)).send(validCreateBody)
      );

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /:playlist_id_text', () => {
    it('returns 200 when owner updates', async () => {
      playlistGetByIdTextMock.mockResolvedValueOnce(ownershipPlaylist(TEST_USER_ID) as never);

      const res = await request(app)
        .patch(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID))
        .send(validUpdateBody);

      expect(res.status).toBe(200);
      expect(playlistUpdateMock).toHaveBeenCalled();
    });

    it('returns 403 when not the owner', async () => {
      playlistGetByIdTextMock.mockResolvedValueOnce(ownershipPlaylist(OTHER_USER_ID) as never);

      const res = await request(app)
        .patch(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID))
        .send(validUpdateBody);

      expect(res.status).toBe(403);
    });

    it('returns 404 when playlist not found', async () => {
      playlistGetByIdTextMock.mockResolvedValueOnce(null as never);

      const res = await request(app)
        .patch(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID))
        .send(validUpdateBody);

      expect(res.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .send(validUpdateBody);

      expect(res.status).toBe(401);
    });

    it('returns 403 when membership is expired', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: new Date(0) },
      });
      playlistGetByIdTextMock.mockResolvedValueOnce(ownershipPlaylist(TEST_USER_ID) as never);

      const res = await withMutedExpectedErrorLogs(async () =>
        request(app)
          .patch(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
          .set(authHeaders(TEST_USER_ID))
          .send(validUpdateBody)
      );

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /:playlist_id_text', () => {
    beforeEach(() => {
      playlistGetByIdTextMock.mockReset();
    });

    it('returns 204 when owner deletes', async () => {
      playlistGetByIdTextMock.mockResolvedValue(ownershipPlaylist(TEST_USER_ID) as never);
      playlistDeleteMock.mockResolvedValue({} as never);

      const res = await request(app)
        .delete(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(204);
    });

    it('returns 403 when not the owner', async () => {
      playlistGetByIdTextMock.mockResolvedValue(ownershipPlaylist(OTHER_USER_ID) as never);

      const res = await request(app)
        .delete(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(403);
    });

    it('returns 404 when playlist not found', async () => {
      playlistGetByIdTextMock.mockResolvedValue(null as never);

      const res = await request(app)
        .delete(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).delete(`${playlistBase}/${PLAYLIST_ID_TEXT}`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /:playlist_id_text', () => {
    beforeEach(() => {
      playlistGetByIdTextMock.mockReset();
      playlistGetOnePrivateMock.mockReset();
      playlistGetOnePublicMock.mockReset();
    });

    it('returns 200 for public playlist without auth', async () => {
      playlistGetByIdTextMock.mockResolvedValue({
        id: 1,
        playlist_id_text: PLAYLIST_ID_TEXT,
        account: { id: OTHER_USER_ID },
        sharable_status: { id: 1 },
      } as never);
      playlistGetOnePublicMock.mockResolvedValue({
        id: 1,
        title: 'Pub',
        sharable_status: { id: 1 },
      });

      const res = await request(app).get(`${playlistBase}/${PLAYLIST_ID_TEXT}`);

      expect(res.status).toBe(200);
      expect(res.body.sharable_status_id).toBe(1);
      expect(res.body.sharable_status).toBeUndefined();
    });

    it('returns 200 for private playlist when owner is authenticated', async () => {
      playlistGetByIdTextMock.mockResolvedValue({
        id: 1,
        playlist_id_text: PLAYLIST_ID_TEXT,
        account: { id: TEST_USER_ID },
        sharable_status: { id: 3 },
      } as never);
      playlistGetOnePrivateMock.mockResolvedValue({
        id: 1,
        title: 'Priv',
        sharable_status: { id: 3 },
      });

      const res = await request(app)
        .get(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.sharable_status_id).toBe(3);
      expect(res.body.sharable_status).toBeUndefined();
      expect(playlistGetOnePrivateMock).toHaveBeenCalledWith(
        TEST_USER_ACCOUNT_ID_TEXT,
        PLAYLIST_ID_TEXT
      );
    });

    it('returns 404 for private playlist when not the owner', async () => {
      playlistGetByIdTextMock.mockResolvedValue({
        id: 1,
        playlist_id_text: PLAYLIST_ID_TEXT,
        account: { id: OTHER_USER_ID },
        sharable_status: { id: 3 },
      } as never);

      const res = await request(app)
        .get(`${playlistBase}/${PLAYLIST_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(404);
    });

    it('returns 404 for private playlist when anonymous', async () => {
      playlistGetByIdTextMock.mockResolvedValue({
        id: 1,
        playlist_id_text: PLAYLIST_ID_TEXT,
        account: { id: OTHER_USER_ID },
        sharable_status: { id: 3 },
      } as never);

      const res = await request(app).get(`${playlistBase}/${PLAYLIST_ID_TEXT}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /private/* list endpoints', () => {
    beforeEach(() => {
      getAccountMock.mockReset();
      getAccountMock.mockImplementation(async () => ({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        verified: true,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
        sharable_status: { id: 1 },
      }));
    });

    it('GET /private/top returns 200 with auth', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app)
        .get(`${playlistBase}/private/top?medium=music&page=1&range=day`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /private/top returns 401 without auth', async () => {
      const res = await request(app).get(
        `${playlistBase}/private/top?medium=music&page=1&range=day`
      );

      expect(res.status).toBe(401);
    });

    it('GET /private/recent returns 200 with auth', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app)
        .get(`${playlistBase}/private/recent?medium=music&page=1`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
    });

    it('GET /private/recent returns 401 without auth', async () => {
      const res = await request(app).get(`${playlistBase}/private/recent?medium=music&page=1`);

      expect(res.status).toBe(401);
    });

    it('GET /private/likes returns 200 with auth', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app)
        .get(`${playlistBase}/private/likes`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /private/likes?include_resources=0 calls getAllLikesPrivate with false', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      playlistGetAllLikesPrivateMock.mockClear();
      const res = await request(app)
        .get(`${playlistBase}/private/likes?include_resources=0`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(playlistGetAllLikesPrivateMock).toHaveBeenCalledWith(TEST_USER_ID, false);
    });

    it('GET /private/likes returns 401 without auth', async () => {
      const res = await request(app).get(`${playlistBase}/private/likes`);

      expect(res.status).toBe(401);
    });

    it('POST /private/likes/membership returns 200 with auth', async () => {
      playlistGetLikesMembershipMock.mockResolvedValueOnce({
        item_id_texts: [ITEM_ID_TEXT],
        clip_id_texts: [],
        add_by_rss_hash_ids: [],
      });

      const res = await request(app)
        .post(`${playlistBase}/private/likes/membership`)
        .set(authHeaders(TEST_USER_ID))
        .send({ item_id_texts: [ITEM_ID_TEXT, 'item-not-liked'] });

      expect(res.status).toBe(200);
      expect(res.body.item_id_texts).toEqual([ITEM_ID_TEXT]);
    });

    it('POST /private/likes/membership returns 400 when ids exceed max', async () => {
      const overLimit = Array.from(
        { length: PLAYLIST_LIKES_MEMBERSHIP_MAX_IDS + 1 },
        (_, index) => `item-${index}`
      );

      const res = await request(app)
        .post(`${playlistBase}/private/likes/membership`)
        .set(authHeaders(TEST_USER_ID))
        .send({ item_id_texts: overLimit });

      expect(res.status).toBe(400);
    });

    it('POST /private/likes/membership accepts exactly max ids', async () => {
      const atLimit = Array.from(
        { length: PLAYLIST_LIKES_MEMBERSHIP_MAX_IDS },
        (_, index) => `item-${index}`
      );

      playlistGetLikesMembershipMock.mockResolvedValueOnce({
        item_id_texts: [],
        clip_id_texts: [],
        add_by_rss_hash_ids: [],
      });

      const res = await request(app)
        .post(`${playlistBase}/private/likes/membership`)
        .set(authHeaders(TEST_USER_ID))
        .send({ item_id_texts: atLimit });

      expect(res.status).toBe(200);
    });

    it('POST /private/likes/toggle toggles item likes with auth', async () => {
      playlistHasItemLikeMock.mockResolvedValueOnce(false);

      const res = await request(app)
        .post(`${playlistBase}/private/likes/toggle`)
        .set(authHeaders(TEST_USER_ID))
        .send({ resource_type: 'item', item_id_text: ITEM_ID_TEXT });

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(plResourceAddItemLastMock).toHaveBeenCalled();
    });
  });

  describe('GET /private/followed/*', () => {
    it('GET /private/followed/top returns 200 with auth', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      statsPlGetManyPrivateByPlaylistsMock.mockResolvedValueOnce([
        [{ playlist: { id: 1, title: 'From followed' } }],
        1,
      ]);

      const res = await request(app)
        .get(`${playlistBase}/private/followed/top?medium=music&page=1&range=day`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /private/followed/top returns 401 without auth', async () => {
      const res = await request(app).get(
        `${playlistBase}/private/followed/top?medium=music&page=1&range=day`
      );

      expect(res.status).toBe(401);
    });
  });

  describe('GET /public/top', () => {
    it('returns 200 with public top playlists', async () => {
      const res = await request(app).get(
        `${playlistBase}/public/top?medium=music&page=1&range=day`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('resources', () => {
    beforeEach(() => {
      playlistGetByIdTextMock.mockReset();
    });

    it('GET /:playlist_id_text/resources returns 200 for public playlist', async () => {
      playlistGetByIdTextMock.mockResolvedValue({
        id: 1,
        playlist_id_text: PLAYLIST_ID_TEXT,
        account: { id: OTHER_USER_ID },
        sharable_status: { id: 1 },
      } as never);
      plResourceGetManyByPlaylistIdTextMock.mockResolvedValue([{ id: 1 }]);
      plResourceGetAllByPlaylistIdTextCountMock.mockResolvedValue(1);

      const res = await request(app).get(`${playlistBase}/${PLAYLIST_ID_TEXT}/resources`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /:playlist_id_text/resources/private-all returns 200 for owner', async () => {
      playlistGetByIdTextMock.mockResolvedValue(ownershipPlaylist(TEST_USER_ID) as never);
      plResourceGetAllByPlaylistIdTextMock.mockResolvedValue([{ id: 1 }]);

      const res = await request(app)
        .get(`${playlistBase}/${PLAYLIST_ID_TEXT}/resources/private-all`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
    });

    it('GET /:playlist_id_text/resources/private-all returns 401 without auth', async () => {
      const res = await request(app).get(
        `${playlistBase}/${PLAYLIST_ID_TEXT}/resources/private-all`
      );

      expect(res.status).toBe(401);
    });

    it('GET /:playlist_id_text/resources/shuffle returns 200 with shuffleHash and page', async () => {
      playlistGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        playlist_id_text: PLAYLIST_ID_TEXT,
        account: { id: 1 },
        sharable_status: { id: 1 },
      } as never);
      plResourceGetManyByPlaylistShuffleMock.mockResolvedValueOnce([{ id: 1 }]);
      plResourceGetAllByPlaylistIdTextCountMock.mockResolvedValueOnce(2);

      const res = await request(app).get(
        `${playlistBase}/${PLAYLIST_ID_TEXT}/resources/shuffle?shuffleHash=abc&page=1`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /:playlist_id_text/resources/queue-by-list-position returns 200', async () => {
      plResourceGetManyForQueueByListPositionMock.mockResolvedValueOnce([{ id: 1 }]);
      const res = await request(app)
        .get(
          `${playlistBase}/${PLAYLIST_ID_TEXT}/resources/queue-by-list-position?` +
            'clip_id_text=clip&direction=forward'
        )
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('clip resources on playlist', () => {
    beforeEach(() => {
      playlistGetByIdTextMock.mockImplementation(
        async () => ownershipPlaylist(TEST_USER_ID) as never
      );
    });

    it('POST .../clip/.../first returns 201', async () => {
      const res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/clip/${CLIP_ID_TEXT}/first`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(201);
      expect(plResourceAddClipFirstMock).toHaveBeenCalledWith(PLAYLIST_ID_TEXT, CLIP_ID_TEXT);
    });

    it('POST .../clip/.../between returns 201', async () => {
      const res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/clip/${CLIP_ID_TEXT}/between`)
        .set(authHeaders(TEST_USER_ID))
        .send({ position1: 0, position2: 1 });

      expect(res.status).toBe(201);
    });

    it('POST .../clip/.../last returns 201', async () => {
      const res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/clip/${CLIP_ID_TEXT}/last`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(201);
    });

    it('DELETE .../clip/... returns 204', async () => {
      const res = await request(app)
        .delete(`${playlistBase}/${PLAYLIST_ID_TEXT}/clip/${CLIP_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(204);
    });

    it('returns 403 when not the playlist owner (add first)', async () => {
      playlistGetByIdTextMock.mockReset();
      playlistGetByIdTextMock.mockResolvedValueOnce(ownershipPlaylist(OTHER_USER_ID) as never);
      const res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/clip/${CLIP_ID_TEXT}/first`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(403);
    });

    it('returns 401 without auth (add first)', async () => {
      const res = await request(app).post(
        `${playlistBase}/${PLAYLIST_ID_TEXT}/clip/${CLIP_ID_TEXT}/first`
      );

      expect(res.status).toBe(401);
    });
  });

  describe('item resources on playlist', () => {
    beforeEach(() => {
      playlistGetByIdTextMock.mockReset();
      playlistGetByIdTextMock.mockImplementation(
        async () => ownershipPlaylist(TEST_USER_ID) as never
      );
    });

    it('add first, between, last, remove return expected statuses', async () => {
      let res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/item/${ITEM_ID_TEXT}/first`)
        .set(authHeaders(TEST_USER_ID));
      expect(res.status).toBe(201);

      res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/item/${ITEM_ID_TEXT}/between`)
        .set(authHeaders(TEST_USER_ID))
        .send({ position1: 0, position2: 2 });
      expect(res.status).toBe(201);

      res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/item/${ITEM_ID_TEXT}/last`)
        .set(authHeaders(TEST_USER_ID));
      expect(res.status).toBe(201);

      res = await request(app)
        .delete(`${playlistBase}/${PLAYLIST_ID_TEXT}/item/${ITEM_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));
      expect(res.status).toBe(204);
    });

    it('returns 403 when not the playlist owner (add first)', async () => {
      playlistGetByIdTextMock.mockReset();
      playlistGetByIdTextMock.mockResolvedValueOnce(ownershipPlaylist(OTHER_USER_ID) as never);
      const res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/item/${ITEM_ID_TEXT}/first`)
        .set(authHeaders(TEST_USER_ID));
      expect(res.status).toBe(403);
    });
  });

  describe('item-add-by-rss on playlist', () => {
    beforeEach(() => {
      playlistGetByIdTextMock.mockReset();
      playlistGetByIdTextMock.mockImplementation(
        async () => ownershipPlaylist(TEST_USER_ID) as never
      );
    });

    it('add first returns 201 with add_by_rss_resource_data', async () => {
      const res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/item-add-by-rss/first`)
        .set(authHeaders(TEST_USER_ID))
        .send({ add_by_rss_resource_data: { feed_url: 'https://a.com' } });

      expect(res.status).toBe(201);
      expect(plResourceAddRssFirstMock).toHaveBeenCalled();
    });
  });

  describe('item-soundbite on playlist', () => {
    beforeEach(() => {
      playlistGetByIdTextMock.mockReset();
      playlistGetByIdTextMock.mockImplementation(
        async () => ownershipPlaylist(TEST_USER_ID) as never
      );
    });

    it('add and remove return expected statuses', async () => {
      let res = await request(app)
        .post(`${playlistBase}/${PLAYLIST_ID_TEXT}/item-soundbite/${SOUNDBITE_ID_TEXT}/first`)
        .set(authHeaders(TEST_USER_ID));
      expect(res.status).toBe(201);

      res = await request(app)
        .delete(`${playlistBase}/${PLAYLIST_ID_TEXT}/item-soundbite/${SOUNDBITE_ID_TEXT}`)
        .set(authHeaders(TEST_USER_ID));
      expect(res.status).toBe(204);
    });
  });
});
