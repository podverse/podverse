import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AccountMembershipEnum,
  buildOpmlImportHourlyKey,
  getOpmlImportHourBucket,
} from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_EMAIL = 'opml-import-test@example.com';
const TEST_USER_ID = 1;
// Per-run nonce so add-by-RSS burn URLs never collide with a prior run's dedupe
// entries (the add-by-RSS parse dedupe cache has a short TTL that can outlive
// back-to-back test invocations and otherwise returns a 429 duplicate response).
const RUN_NONCE = randomUUID();

const {
  feedGetByUrlMock,
  hasFollowedChannelMock,
  followChannelMock,
  hasFollowedAddByRSSChannelMock,
  addOrUpdateRSSChannelMock,
  addPendingFollowMock,
  getAccountMock,
  getAccountByIdTextMock,
  podcastGetByFeedUrlMock,
  mqOpmlImportAddMock,
  mqRSSAddMock,
  mqAddByRSSAddMock,
} = vi.hoisted(() => ({
  feedGetByUrlMock: vi.fn(async () => null),
  hasFollowedChannelMock: vi.fn(async () => false),
  followChannelMock: vi.fn(async () => ({})),
  hasFollowedAddByRSSChannelMock: vi.fn(async () => false),
  addOrUpdateRSSChannelMock: vi.fn(async () => ({})),
  addPendingFollowMock: vi.fn(async () => ({})),
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
  getAccountByIdTextMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
      account_membership: { id: AccountMembershipEnum.Premium },
    },
    sharable_status: { id: 1 },
  })),
  podcastGetByFeedUrlMock: vi.fn(async () => null),
  mqOpmlImportAddMock: vi.fn(async () => {}),
  mqRSSAddMock: vi.fn(async () => {}),
  mqAddByRSSAddMock: vi.fn(async () => {}),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();
  return {
    ...actual,
    AccountService: class {
      get = getAccountMock;
      getByIdText = getAccountByIdTextMock;
    },
    FeedService: class {
      getByUrl = feedGetByUrlMock;
    },
    AccountFollowingChannelService: class {
      hasFollowedChannel = hasFollowedChannelMock;
      followChannel = followChannelMock;
      getFollowedChannels = vi.fn(async () => []);
    },
    AccountFollowingAddByRSSChannelService: class {
      hasFollowedAddByRSSChannel = hasFollowedAddByRSSChannelMock;
      addOrUpdateRSSChannel = addOrUpdateRSSChannelMock;
      getFollowedAddByRSSChannels = vi.fn(async () => []);
    },
    AccountPendingFollowingChannelService: class {
      addPendingFollow = addPendingFollowMock;
    },
  };
});

vi.mock('@api/factories/podcastIndexService.js', () => ({
  podcastIndexService: {
    podcastGetByFeedUrl: podcastGetByFeedUrlMock,
  },
}));

vi.mock('@podverse/mq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/mq')>();
  return {
    ...actual,
    mqOpmlImportAdd: mqOpmlImportAddMock,
    mqRSSAdd: mqRSSAddMock,
    mqAddByRSSAdd: mqAddByRSSAddMock,
  };
});

describe('OPML import endpoints', () => {
  let app: import('express').Express;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let accountBase = '';

  beforeAll(async () => {
    process.env.PODVERSE_E2E_FIXTURES = '1';
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    accountBase = `${await getBaseApiUrl()}/account`;
  });

  afterAll(async () => {
    delete process.env.PODVERSE_E2E_FIXTURES;
    await stopTestApp(server, ormContext);
  });

  beforeEach(async () => {
    // Hermetic hourly rate-limit counter: the OPML importer increments a Valkey
    // counter that persists across runs within the same hour. Clear it (current
    // plus adjacent buckets to cover hour boundaries) so budget-dependent tests
    // are deterministic on same-hour re-runs.
    const { keyvaldb } = await import('@api/lib/keyvaldb/keyvaldb.js');
    const currentBucket = getOpmlImportHourBucket();
    await Promise.all(
      [currentBucket - 1, currentBucket, currentBucket + 1].map((bucket) =>
        keyvaldb.del(buildOpmlImportHourlyKey(TEST_USER_ID, bucket))
      )
    );

    // The OPML enqueue HTTP limiter uses express-rate-limit's in-memory store,
    // which persists for the whole process. The burn-in test intentionally
    // exhausts it, so reset the per-user counter before each test to keep
    // budget-dependent cases (201/400 outcomes) deterministic.
    const { opmlImportEnqueueRateLimit } = await import(
      '@api/controllers/account/accountOpmlImport.js'
    );
    opmlImportEnqueueRateLimit.resetForUser(TEST_USER_ID);

    feedGetByUrlMock.mockReset();
    hasFollowedChannelMock.mockReset();
    followChannelMock.mockReset();
    hasFollowedAddByRSSChannelMock.mockReset();
    addOrUpdateRSSChannelMock.mockReset();
    addPendingFollowMock.mockReset();
    podcastGetByFeedUrlMock.mockReset();
    mqOpmlImportAddMock.mockReset();
    mqRSSAddMock.mockReset();
    mqAddByRSSAddMock.mockReset();

    feedGetByUrlMock.mockResolvedValue(null);
    hasFollowedChannelMock.mockResolvedValue(false);
    followChannelMock.mockResolvedValue({});
    hasFollowedAddByRSSChannelMock.mockResolvedValue(false);
    addOrUpdateRSSChannelMock.mockResolvedValue({});
    addPendingFollowMock.mockResolvedValue({});
    podcastGetByFeedUrlMock.mockResolvedValue(null);
  });

  const sampleOpml = (feeds: Array<{ title: string; url: string }>): string => {
    const outlines = feeds
      .map(
        (feed) =>
          `    <outline type="rss" text="${feed.title}" title="${feed.title}" xmlUrl="${feed.url}" />`
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
${outlines}
  </body>
</opml>`;
  };

  const expectRateLimitedResponseContract = (res: request.Response): void => {
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ tooManyRequests: true });
    expect(typeof res.body.timeUntilResetMs).toBe('number');
    expect(res.body.timeUntilResetMs).toBeGreaterThan(0);
    expect(typeof res.body.minutesRemaining).toBe('number');
    expect(res.body.minutesRemaining).toBeGreaterThan(0);
    const retryAfterHeader = res.headers['retry-after'];
    expect(retryAfterHeader).toBeTruthy();
    expect(Number.parseInt(String(retryAfterHeader), 10)).toBeGreaterThan(0);
  };

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post(`${accountBase}/opml/import`)
      .send({ opml: sampleOpml([{ title: 'A', url: 'https://example.com/a.xml' }]) });
    expect(res.status).toBe(401);
  });

  it('returns 429 for OPML enqueue after the per-account/hour request cap', async () => {
    // Keep OPML parsing work trivial and deterministic: a single feed URL that resolves via DB path.
    feedGetByUrlMock.mockResolvedValue({ channel: { id_text: 'ch-dir' } });
    const opml = sampleOpml([{ title: 'Subscribed', url: 'https://example.com/db-sub.xml' }]);

    let limitedResponse: request.Response | null = null;

    // Other tests in this file may have already consumed some limiter budget.
    // Assert we eventually hit 429 within a bounded burn loop.
    for (let i = 0; i < 30; i++) {
      const res = await request(app)
        .post(`${accountBase}/opml/import`)
        .set(authHeaders(TEST_USER_ID))
        .send({ opml });

      if (res.status === 429) {
        limitedResponse = res;
        break;
      }
    }

    expect(limitedResponse).not.toBeNull();
    if (limitedResponse === null) {
      throw new Error('Expected OPML enqueue limiter to return 429.');
    }
    expectRateLimitedResponseContract(limitedResponse);
  });

  it('returns 429 for add-by-RSS parse enqueue after the per-account/hour request cap', async () => {
    let limitedResponse: request.Response | null = null;

    // Use per-run-unique feed URLs to avoid dedupe-429 responses (this test
    // targets HTTP limiter 429s; RUN_NONCE avoids collisions with prior runs).
    for (let i = 0; i < 50; i++) {
      const res = await request(app)
        .post(`${accountBase}/add-by-rss/parse`)
        .set(authHeaders(TEST_USER_ID))
        .send({ feed_url: `https://example.com/rl-parse-${RUN_NONCE}-${i}.xml` });

      if (res.status === 429) {
        limitedResponse = res;
        break;
      }
    }

    expect(limitedResponse).not.toBeNull();
    if (limitedResponse === null) {
      throw new Error('Expected add-by-RSS parse limiter to return 429.');
    }
    expectRateLimitedResponseContract(limitedResponse);
  });

  it('imports subscribed + PI-indexed + add-by-RSS + failed isolation via fixtures sync path', async () => {
    // Under PODVERSE_E2E_FIXTURES the controller resolves feed URLs with the
    // deterministic local fixture resolver (no Podcast Index network). The
    // resolver returns a podcast_index_id only for URLs containing the
    // `e2e-directory` sentinel; everything else resolves to add-by-RSS.
    feedGetByUrlMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes('db-sub')) {
        return { channel: { id_text: 'ch-dir' } };
      }
      if (url.includes('boom')) {
        throw new Error('lookup failed');
      }
      return null;
    });

    const opml = sampleOpml([
      { title: 'Subscribed', url: 'https://example.com/db-sub.xml' },
      { title: 'Indexed', url: 'https://example.com/e2e-directory.xml' },
      { title: 'Unknown', url: 'https://example.com/unknown.xml' },
      { title: 'Boom', url: 'https://example.com/boom.xml' },
    ]);

    const enqueue = await request(app)
      .post(`${accountBase}/opml/import`)
      .set(authHeaders(TEST_USER_ID))
      .send({ opml });

    expect(enqueue.status).toBe(201);
    expect(enqueue.body.request_id).toBeTruthy();
    expect(mqOpmlImportAddMock).not.toHaveBeenCalled();

    const status = await request(app)
      .get(`${accountBase}/opml/import/status/${enqueue.body.request_id}`)
      .set(authHeaders(TEST_USER_ID));

    expect(status.status).toBe(200);
    expect(status.body.status).toBe('completed');
    expect(status.body.results.map((row: { outcome: string }) => row.outcome)).toEqual([
      'subscribed',
      'enqueued_indexed',
      'added_by_rss',
      'failed',
    ]);
    expect(addPendingFollowMock).toHaveBeenCalled();
    expect(addOrUpdateRSSChannelMock).toHaveBeenCalled();
    // Fixtures path must not enqueue any downstream MQ work.
    expect(mqRSSAddMock).not.toHaveBeenCalled();
    expect(mqAddByRSSAddMock).not.toHaveBeenCalled();
    // Fixtures path must never touch the live Podcast Index service.
    expect(podcastGetByFeedUrlMock).not.toHaveBeenCalled();
  });

  it('rate-limits new feeds beyond the hourly cap and reports rateLimited in the status', async () => {
    const feeds = Array.from({ length: 60 }, (_, index) => ({
      title: `Feed ${index}`,
      url: `https://example.com/rate-${index}.xml`,
    }));

    const enqueue = await request(app)
      .post(`${accountBase}/opml/import`)
      .set(authHeaders(TEST_USER_ID))
      .send({ opml: sampleOpml(feeds) });

    expect(enqueue.status).toBe(201);

    const status = await request(app)
      .get(`${accountBase}/opml/import/status/${enqueue.body.request_id}`)
      .set(authHeaders(TEST_USER_ID));

    expect(status.status).toBe(200);
    expect(status.body.status).toBe('completed');
    // 60 new feeds exceeds the 50/hour cap regardless of prior test increments.
    expect(status.body.totals.rateLimited).toBeGreaterThan(0);
    expect(status.body.rateLimited.limit).toBe(50);
    expect(status.body.rateLimited.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('returns 400 when OPML exceeds the maximum feed count', async () => {
    const feeds = Array.from({ length: 1001 }, (_, index) => ({
      title: `Feed ${index}`,
      url: `https://example.com/max-${index}.xml`,
    }));

    const res = await request(app)
      .post(`${accountBase}/opml/import`)
      .set(authHeaders(TEST_USER_ID))
      .send({ opml: sampleOpml(feeds) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OPML_TOO_MANY_FEEDS');
    expect(res.body.message).toContain('Maximum feeds allowed: 1000');
    expect(res.body.opml_max_feeds).toBe(1000);
    expect(res.body.opml_received_feeds).toBe(1001);
  });

  it('returns 400 with explicit size details when OPML body exceeds max chars', async () => {
    const oversizedOpml = `<opml><body>${'a'.repeat(1_000_001)}</body></opml>`;

    const res = await request(app)
      .post(`${accountBase}/opml/import`)
      .set(authHeaders(TEST_USER_ID))
      .send({ opml: oversizedOpml });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OPML_BODY_TOO_LARGE');
    expect(res.body.message).toContain('Maximum characters allowed: 1000000');
    expect(res.body.opml_max_body_chars).toBe(1000000);
    expect(res.body.opml_received_body_chars).toBeGreaterThan(1000000);
  });

  it('returns 400 when OPML body is empty', async () => {
    const res = await request(app)
      .post(`${accountBase}/opml/import`)
      .set(authHeaders(TEST_USER_ID))
      .send({ opml: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OPML_BODY_REQUIRED');
    expect(res.body.message).toContain('OPML content is required');
  });

  it('returns 400 when OPML has no valid feeds', async () => {
    const res = await request(app)
      .post(`${accountBase}/opml/import`)
      .set(authHeaders(TEST_USER_ID))
      .send({ opml: '<opml version="2.0"><body></body></opml>' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OPML_NO_VALID_FEEDS');
    expect(res.body.message).toContain('No valid feed URLs');
  });

  it('returns 404 for unknown import status request', async () => {
    const res = await request(app)
      .get(`${accountBase}/opml/import/status/does-not-exist`)
      .set(authHeaders(TEST_USER_ID));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('OPML_REQUEST_NOT_FOUND');
    expect(res.body.message).toContain('Request not found');
  });
});
