import { handleOpmlImportMessage } from '@workers/commands/mq/rss/runOpmlImport.js';
import { getKeyvaldbConfig, getMQConfig, getOpmlImportConfig } from '@workers/config/index.js';
import { cacheGetJson, cacheSetJson, initKeyvaldb } from '@workers/lib/keyvaldb/keyvaldb.js';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getOpmlImportCacheEntry, MQ_QUEUES } from '@podverse/helpers';
import { LoggerService } from '@podverse/helpers-backend';
import {
  applyPodverseTestEnv,
  assertConfigValid,
  buildPodverseApiTestEnv,
  validateORMConfig,
} from '@podverse/helpers-config';
import type { MQOpmlImportFeed } from '@podverse/mq';
import { ActiveMQArtemisService, mqOpmlImportAdd } from '@podverse/mq';
import type { ORMContext } from '@podverse/orm';
import { AccountService, Channel, createORMContext, Feed } from '@podverse/orm';

const shouldRunMqIntegration = process.env.PODVERSE_RUN_MQ_INTEGRATION === '1';
const describeMqIntegration = shouldRunMqIntegration ? describe : describe.skip;

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const requireTestEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing env var ${name} for the OPML import broker integration test`);
  }
  return value;
};

const createWorkersOrmContext = (): ORMContext => {
  const ormConfig = {
    nodeEnv: process.env.NODE_ENV ?? 'test',
    database: {
      host: requireTestEnv('DB_HOST'),
      port: Number.parseInt(requireTestEnv('DB_PORT'), 10),
      read_username: requireTestEnv('DB_APP_READ_USER'),
      read_password: requireTestEnv('DB_APP_READ_PASSWORD'),
      read_write_username: requireTestEnv('DB_APP_READ_WRITE_USER'),
      read_write_password: requireTestEnv('DB_APP_READ_WRITE_PASSWORD'),
      database: requireTestEnv('DB_APP_NAME'),
      ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
    },
    log: {
      level: process.env.LOG_LEVEL ?? 'error',
      dir: process.env.LOG_DIR ?? '',
      timer: process.env.LOG_TIMER === 'true',
    },
    defaults: {
      account: {
        settings: {
          locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE ?? 'en-US',
        },
      },
    },
    addByRssCredentialsEncryptionKey:
      process.env.ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY ?? undefined,
    addByRssCredentialsEncryptionKeyOld:
      process.env.ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD ?? undefined,
  };

  assertConfigValid(validateORMConfig(ormConfig), 'podverse-orm');
  return createORMContext(ormConfig);
};

const waitForCompletedOpmlEntry = async (requestId: string, timeoutMs = 20_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const entry = await getOpmlImportCacheEntry(cacheGetJson, requestId);
    if (entry?.status === 'completed') {
      return entry;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for completed OPML cache entry for requestId=${requestId}`);
};

describeMqIntegration('mqOpmlImportRun broker integration', () => {
  let ormContext: ORMContext;
  let keyvaldbClient: Redis;
  let activeMQArtemisService: ActiveMQArtemisService;
  let accountId = 0;
  const observedRequestIds: string[] = [];

  const testRunPrefix = `opml-int-${Date.now()}`;

  const podcastGetByFeedUrl = async (feedUrl: string) => {
    if (feedUrl.includes('/indexed/')) {
      return { podcast_index_id: 991_000_001 };
    }
    return null;
  };

  const clearOpmlTestState = async (): Promise<void> => {
    const opmlKeys = await keyvaldbClient.keys('opml:import:*');
    if (opmlKeys.length > 0) {
      await keyvaldbClient.del(...opmlKeys);
    }
  };

  beforeAll(async () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));

    ormContext = createWorkersOrmContext();
    await ormContext.dataSourceRead.initialize();
    await ormContext.dataSourceReadWrite.initialize();

    keyvaldbClient = new Redis({
      host: requireTestEnv('KEYVALDB_HOST'),
      port: Number.parseInt(requireTestEnv('KEYVALDB_PORT'), 10),
      password: requireTestEnv('KEYVALDB_PASSWORD'),
      lazyConnect: false,
      maxRetriesPerRequest: null,
    });
    initKeyvaldb(keyvaldbClient, getKeyvaldbConfig());

    const accountService = new AccountService();
    const testEmail = `${testRunPrefix}@example.com`;
    await accountService.create({
      email: testEmail,
      password: 'IntegrationTest1!',
      locale: 'en-US',
    });
    const account = await accountService.getByEmail(testEmail);
    if (!account) {
      throw new Error('Failed to load integration test account');
    }
    accountId = account.id;

    const manager = ormContext.dataSourceReadWrite.manager;
    const feedRepo = manager.getRepository(Feed);
    const channelRepo = manager.getRepository(Channel);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: `https://example.com/${testRunPrefix}/directory.xml`,
        podcast_index_id: 991_000_000,
      })
    );
    await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        title: 'OPML integration channel',
        medium_id: 1,
      })
    );

    const logger = new LoggerService({ logLevel: 'error', logDir: '' });
    activeMQArtemisService = new ActiveMQArtemisService(getMQConfig(), logger);
    await activeMQArtemisService.initialize();

    await activeMQArtemisService.consumeMessages(
      MQ_QUEUES['opml-import'].queueName,
      async (context, receiver) => {
        const body = (context.message?.body as string) ?? '';
        try {
          const parsed = JSON.parse(body) as { requestId?: string };
          if (typeof parsed.requestId === 'string') {
            observedRequestIds.push(parsed.requestId);
          }
        } catch {
          // Ignore malformed bodies; handler asserts required fields.
        }

        await handleOpmlImportMessage({
          context,
          receiver,
          queueName: MQ_QUEUES['opml-import'].queueName,
          maxFeedsPerHour: getOpmlImportConfig().maxFeedsPerHour,
          isDev: false,
          logger,
          activeMQArtemisService,
          podcastGetByFeedUrl,
          cacheGetJsonAdapter: cacheGetJson,
          cacheSetJsonAdapter: cacheSetJson,
        });
      }
    );
  }, 120_000);

  afterAll(async () => {
    await clearOpmlTestState();
    await activeMQArtemisService.close();
    await keyvaldbClient.quit();
    await ormContext.dataSourceRead.destroy();
    await ormContext.dataSourceReadWrite.destroy();
  });

  beforeEach(async () => {
    observedRequestIds.length = 0;
    await clearOpmlTestState();
  });

  it('processes OPML imports via broker and dedupes on requestId', async () => {
    const makeFeeds = (suffix: string): MQOpmlImportFeed[] => [
      {
        feedUrl: `https://example.com/${testRunPrefix}/directory.xml`,
        title: `Directory ${suffix}`,
      },
      {
        feedUrl: `https://example.com/${testRunPrefix}/indexed/${suffix}.xml`,
        title: `Indexed ${suffix}`,
      },
      {
        feedUrl: `https://example.com/${testRunPrefix}/unknown/${suffix}.xml`,
        title: `Unknown ${suffix}`,
      },
    ];

    const happyRequestId = `${testRunPrefix}-happy`;
    await mqOpmlImportAdd(activeMQArtemisService, {
      ...MQ_QUEUES['opml-import'],
      closeAfterSend: false,
      accountId,
      requestId: happyRequestId,
      feeds: makeFeeds('happy'),
    });
    const happyEntry = await waitForCompletedOpmlEntry(happyRequestId);
    expect(happyEntry.results.map((row) => row.outcome)).toEqual([
      'subscribed',
      'enqueued_indexed',
      'added_by_rss',
    ]);

    const requestA = `${testRunPrefix}-dedupe-A`;
    const requestB = `${testRunPrefix}-dedupe-B`;
    await mqOpmlImportAdd(activeMQArtemisService, {
      ...MQ_QUEUES['opml-import'],
      closeAfterSend: false,
      accountId,
      requestId: requestA,
      feeds: [{ feedUrl: `https://example.com/${testRunPrefix}/unknown/a.xml` }],
    });
    await mqOpmlImportAdd(activeMQArtemisService, {
      ...MQ_QUEUES['opml-import'],
      closeAfterSend: false,
      accountId,
      requestId: requestB,
      feeds: [{ feedUrl: `https://example.com/${testRunPrefix}/unknown/b.xml` }],
    });
    await waitForCompletedOpmlEntry(requestA);
    await waitForCompletedOpmlEntry(requestB);

    const observedA = observedRequestIds.filter((id) => id === requestA).length;
    const observedB = observedRequestIds.filter((id) => id === requestB).length;
    expect(observedA).toBe(1);
    expect(observedB).toBe(1);

    const duplicateRequestId = `${testRunPrefix}-dedupe-same`;
    const duplicateFeeds: MQOpmlImportFeed[] = [
      { feedUrl: `https://example.com/${testRunPrefix}/unknown/same.xml` },
    ];

    await mqOpmlImportAdd(activeMQArtemisService, {
      ...MQ_QUEUES['opml-import'],
      closeAfterSend: false,
      accountId,
      requestId: duplicateRequestId,
      feeds: duplicateFeeds,
    });
    await mqOpmlImportAdd(activeMQArtemisService, {
      ...MQ_QUEUES['opml-import'],
      closeAfterSend: false,
      accountId,
      requestId: duplicateRequestId,
      feeds: duplicateFeeds,
    });

    await waitForCompletedOpmlEntry(duplicateRequestId);
    await sleep(1500);

    const observedDuplicate = observedRequestIds.filter((id) => id === duplicateRequestId).length;
    expect(observedDuplicate).toBe(1);
  }, 60_000);
});
