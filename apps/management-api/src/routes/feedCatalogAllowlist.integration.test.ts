import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import { TEST_ADMIN_SESSION_CLAIMS } from '@management-api/test/adminSessionStoreStub.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const feedsBase = `${config.api.prefix}${config.api.version}/feeds`;

const superuser = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com' },
  permissions: {
    id: 1,
    admin_account_id: 1,
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const reader = {
  ...superuser,
  id: 2,
  id_text: 'pvMgtAd002',
  permissions: { ...superuser.permissions, id: 2, admin_account_id: 2, feedsCrud: 2 },
};

const {
  getWithRoleAndPermissionsMock,
  insertAdminMock,
  listForManagementMock,
  mqRSSAddMock,
  removeAdminMock,
  searchPodcastsMock,
} = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuser;
    }
    if (id === 2) {
      return reader;
    }
    return null;
  }),
  insertAdminMock: vi.fn(),
  listForManagementMock: vi.fn(),
  mqRSSAddMock: vi.fn(),
  removeAdminMock: vi.fn(),
  searchPodcastsMock: vi.fn(),
}));

vi.mock('@podverse/mq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/mq')>();
  return { ...actual, mqRSSAdd: mqRSSAddMock };
});

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();
  return {
    ...actual,
    CatalogPodcastIndexAllowlistService: class {
      listForManagement = listForManagementMock;
      insertAdmin = insertAdminMock;
      removeAdmin = removeAdminMock;
    },
  };
});

vi.mock('@podverse/external-services-podcast-index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/external-services-podcast-index')>();
  return {
    ...actual,
    PodcastIndexService: class {
      searchPodcasts = searchPodcastsMock;
    },
  };
});

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async get(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

const savedCatalog = config.catalog;
const savedPodcastIndex = config.podcastIndex;

function auth(userId: number): { Authorization: string } {
  const idText = userId === 2 ? 'pvMgtAd002' : 'pvMgtSu001';
  return {
    Authorization: `Bearer ${jwt.sign(
      { id: userId, id_text: idText, ...TEST_ADMIN_SESSION_CLAIMS },
      JWT_SECRET,
      { expiresIn: '1h' }
    )}`,
  };
}

describe('catalog allowlist management routes', () => {
  beforeEach(() => {
    insertAdminMock.mockReset();
    listForManagementMock.mockReset();
    mqRSSAddMock.mockReset();
    removeAdminMock.mockReset();
    searchPodcastsMock.mockReset();
    config.catalog = { ...savedCatalog, podcastIndexIdAllowlist: [10] };
    config.podcastIndex = {
      authKey: 'test-key',
      baseUrl: 'https://podcastindex.example',
      secretKey: 'test-secret',
    };
    listForManagementMock.mockResolvedValue([
      {
        podcast_index_id: 10,
        resolved_podcast_index_id: null,
        origin: 'deployment',
        title: null,
        feed_url: null,
        stored: true,
        removable: false,
      },
    ]);
  });

  afterEach(() => {
    config.catalog = savedCatalog;
    config.podcastIndex = savedPodcastIndex;
  });

  it('returns 404 when the env allowlist is blank', async () => {
    config.catalog = { ...savedCatalog, podcastIndexIdAllowlist: null };
    const response = await request(app).get(`${feedsBase}/catalog-allowlist`).set(auth(1));
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('catalog_allowlist_disabled');
    expect(listForManagementMock).not.toHaveBeenCalled();
  });

  it('lists rows while the env allowlist is set', async () => {
    const response = await request(app).get(`${feedsBase}/catalog-allowlist`).set(auth(1));
    expect(response.status).toBe(200);
    expect(response.body.feeds).toEqual([
      expect.objectContaining({ podcast_index_id: 10, origin: 'deployment', removable: false }),
    ]);
  });

  it('adds an admin row and does not enqueue', async () => {
    insertAdminMock.mockResolvedValue('created');
    const response = await request(app)
      .post(`${feedsBase}/catalog-allowlist`)
      .set(auth(1))
      .send({
        podcast_index_id: 77,
        title: 'Directory Show',
        feed_url: 'https://dir.example/feed.xml',
      });
    expect(response.status).toBe(201);
    expect(insertAdminMock).toHaveBeenCalledWith(
      expect.objectContaining({
        podcastIndexId: 77,
        title: 'Directory Show',
        feedUrl: 'https://dir.example/feed.xml',
        adminId: 1,
        envIds: [10],
      })
    );
    expect(mqRSSAddMock).not.toHaveBeenCalled();
  });

  it('refuses a reader without feed update', async () => {
    const response = await request(app)
      .post(`${feedsBase}/catalog-allowlist`)
      .set(auth(2))
      .send({ podcast_index_id: 77 });
    expect(response.status).toBe(403);
    expect(insertAdminMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the id is already allowed', async () => {
    insertAdminMock.mockResolvedValue('already');
    const response = await request(app)
      .post(`${feedsBase}/catalog-allowlist`)
      .set(auth(1))
      .send({ podcast_index_id: 10 });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('already_allowed');
  });

  it('removes an admin row and leaves the response without deleting a feed', async () => {
    removeAdminMock.mockResolvedValue('removed');
    const response = await request(app)
      .delete(`${feedsBase}/catalog-allowlist/77`)
      .set(auth(1));
    expect(response.status).toBe(204);
    expect(removeAdminMock).toHaveBeenCalledWith(77, [10]);
  });

  it('refuses to remove an id that is still on the env list', async () => {
    removeAdminMock.mockResolvedValue('on_env_list');
    const response = await request(app)
      .delete(`${feedsBase}/catalog-allowlist/10`)
      .set(auth(1));
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('on_deployment_allowlist');
  });

  it('searches the directory and marks an id that is already allowed', async () => {
    searchPodcastsMock.mockResolvedValue({
      status: 'true',
      count: 2,
      query: 'show',
      description: 'Found matching feeds.',
      feeds: [
        { id: 10, title: 'Listed', url: 'https://listed.example/feed.xml', author: 'Ada' },
        { id: 77, title: 'New', url: 'https://new.example/feed.xml', author: 'Bea' },
      ],
    });
    const response = await request(app)
      .get(`${feedsBase}/catalog-allowlist/directory-search`)
      .query({ q: 'show' })
      .set(auth(1));
    expect(response.status).toBe(200);
    expect(response.body.feeds).toEqual([
      expect.objectContaining({ podcast_index_id: 10, already_allowed: true }),
      expect.objectContaining({ podcast_index_id: 77, already_allowed: false }),
    ]);
  });
});
