import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { startTestApp, stopTestApp } from './helpers/index.js';

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

type StatsGuidRotationFixture = {
  accountId: number;
  channelId: number;
  channelIdText: string;
  guidRowId: number;
  originalAccountGuid: string;
};

async function seedStatsGuidRotationFixture(
  ormContext: ORMContext
): Promise<StatsGuidRotationFixture> {
  const { AccountService, Channel, Feed, StatsTrackAccountGuidService, StatsTrackEventChannel } =
    await import('@podverse/orm');

  const manager = ormContext.dataSourceReadWrite.manager;
  const runId = Date.now();

  const accountService = new AccountService();
  const email = `stats-guid-rotation-${runId}@example.com`;
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
      url: `https://stats-guid-rotation-${runId}.example.com/feed.xml`,
      podcast_index_id: 910_000_000 + (runId % 89_000_000),
    })
  );

  const channelRepo = manager.getRepository(Channel);
  const channel = await channelRepo.save(
    channelRepo.create({
      feed_id: feed.id,
      medium_id: MediumEnum.AV,
      title: 'Stats guid rotation integration channel',
    })
  );

  const guidService = new StatsTrackAccountGuidService();
  const guidRow = await guidService.getByAccountId(account.id);
  if (!guidRow) {
    throw new Error('Expected stats_track_account_guid row for test account');
  }

  const originalAccountGuid = guidRow.account_guid;

  await manager.query(
    `UPDATE stats_track_account_guid
     SET updated_at = NOW() - INTERVAL '8 days'
     WHERE id = $1`,
    [guidRow.id]
  );

  const eventRepo = manager.getRepository(StatsTrackEventChannel);
  await eventRepo.save(
    eventRepo.create({
      account_guid: originalAccountGuid,
      stats_track_account_guid_id: guidRow.id,
      channel_id: channel.id,
    })
  );

  return {
    accountId: account.id,
    channelId: channel.id,
    channelIdText: channel.id_text,
    guidRowId: guidRow.id,
    originalAccountGuid,
  };
}

describe('stats account_guid rotation with existing events (issue #242)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let fixture: StatsGuidRotationFixture;

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for stats guid rotation integration test');
    }
    fixture = await seedStatsGuidRotationFixture(ormContext);
  }, 60000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('rotates parent account_guid without failing when child events exist', async () => {
    const { StatsTrackAccountGuidService, StatsTrackEventChannelService, StatsTrackEventChannel } =
      await import('@podverse/orm');

    if (!ormContext) {
      throw new Error('ORM context required');
    }

    const guidService = new StatsTrackAccountGuidService();
    const rotated = await guidService.getByAccountId(fixture.accountId);
    expect(rotated).not.toBeNull();
    expect(rotated?.account_guid).not.toBe(fixture.originalAccountGuid);

    const channelEventService = new StatsTrackEventChannelService();
    await channelEventService._create(fixture.accountId, fixture.channelIdText);

    const manager = ormContext.dataSourceReadWrite.manager;
    const eventRepo = manager.getRepository(StatsTrackEventChannel);
    const events = await eventRepo.find({
      where: { stats_track_account_guid_id: fixture.guidRowId },
      order: { id: 'ASC' },
    });

    expect(events).toHaveLength(2);
    expect(events[0]?.account_guid).toBe(fixture.originalAccountGuid);
    expect(events[1]?.account_guid).toBe(rotated?.account_guid);
    expect(events[0]?.stats_track_account_guid_id).toBe(fixture.guidRowId);
    expect(events[1]?.stats_track_account_guid_id).toBe(fixture.guidRowId);
  });

  it('cascades delete of all stats events when stats_track_account_guid row is removed', async () => {
    const { StatsTrackAccountGuid, StatsTrackEventChannel } = await import('@podverse/orm');

    if (!ormContext) {
      throw new Error('ORM context required');
    }

    const manager = ormContext.dataSourceReadWrite.manager;
    const eventRepo = manager.getRepository(StatsTrackEventChannel);
    const eventsBefore = await eventRepo.count({
      where: { stats_track_account_guid_id: fixture.guidRowId },
    });
    expect(eventsBefore).toBeGreaterThan(0);

    const guidRepo = manager.getRepository(StatsTrackAccountGuid);
    await guidRepo.delete({ id: fixture.guidRowId });

    const eventsAfter = await eventRepo.count({
      where: { stats_track_account_guid_id: fixture.guidRowId },
    });
    expect(eventsAfter).toBe(0);
  });
});
