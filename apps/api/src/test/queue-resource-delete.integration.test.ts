import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

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

type QueueDeleteFixture = {
  accountId: number;
  accountIdText: string;
  queueIdText: string;
  itemIdText: string;
};

async function seedQueueDeleteFixture(ormContext: ORMContext): Promise<QueueDeleteFixture> {
  const { AccountService, Channel, Feed, Item, QueueResource, QueueService } =
    await import('@podverse/orm');

  const manager = ormContext.dataSourceReadWrite.manager;
  const runId = Date.now();

  const accountService = new AccountService();
  const email = `queue-resource-delete-${runId}@example.com`;
  await accountService.create({
    email,
    password: 'IntegrationTest1!',
    locale: 'en-US',
  });
  const account = await accountService.getByEmail(email);
  if (!account) {
    throw new Error('Failed to load account after create');
  }

  const feedRepo = manager.getRepository(Feed);
  const feed = await feedRepo.save(
    feedRepo.create({
      url: `https://queue-resource-delete-${runId}.example.com/feed.xml`,
      podcast_index_id: 900_000_000 + (runId % 99_000_000),
    })
  );

  const channelRepo = manager.getRepository(Channel);
  const channel = await channelRepo.save(
    channelRepo.create({
      feed_id: feed.id,
      medium_id: MediumEnum.AV,
      title: 'Queue delete integration channel',
    })
  );

  const itemRepo = manager.getRepository(Item);
  const item = await itemRepo.save(
    itemRepo.create({
      channel_id: String(channel.id),
      title: 'Queue delete integration item',
      item_flag_status: { id: 1 },
      guid: `queue-resource-delete-${runId}@example.com`,
    })
  );

  const queueService = new QueueService();
  const queues = await queueService.getAllPrivate(account.id);
  const avQueue = queues.find((q) => q.medium_id === MediumEnum.AV);
  if (!avQueue) {
    throw new Error('Expected AV queue for test account');
  }

  const queueResourceRepo = manager.getRepository(QueueResource);
  await queueResourceRepo.save(
    queueResourceRepo.create({
      queue: avQueue,
      item_id: String(item.id),
      list_position: '1',
      playback_position: '0',
      media_file_duration: '0',
      completed: false,
    })
  );

  return {
    accountId: account.id,
    accountIdText: account.id_text,
    queueIdText: avQueue.id_text,
    itemIdText: item.id_text,
  };
}

describe('DELETE /queue/:queue_id_text/item/:item_id_text (real QueueResourceService)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let queueBase: string;
  let fixture: QueueDeleteFixture;

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for queue delete integration test');
    }
    fixture = await seedQueueDeleteFixture(ormContext);
    queueBase = `${await getBaseApiUrl()}/queue`;
  }, 60000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('returns 204 when removing a queued item (TypeORM v1 parent where uses id only)', async () => {
    const deleteUrl = `${queueBase}/${fixture.queueIdText}/item/${fixture.itemIdText}`;
    const res = await request(app)
      .delete(deleteUrl)
      .set(authHeaders(fixture.accountId, fixture.accountIdText));

    expect(res.status).toBe(204);
  });
});
