import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from '../test/helpers/index.js';

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

const showcaseBase = `${getBaseApiUrl()}/embed-demo`;

async function seedEmbedDemoShowcaseFixture(ormContext: ORMContext): Promise<{
  itemId: number;
  itemIdText: string;
}> {
  const { Channel, EmbedDemoShowcase, Feed, Item } = await import('@podverse/orm');

  const manager = ormContext.dataSourceReadWrite.manager;
  const runId = Date.now();

  const feedRepo = manager.getRepository(Feed);
  const feed = await feedRepo.save(
    feedRepo.create({
      url: `https://embed-demo-api-${runId}.example.com/feed.xml`,
      podcast_index_id: 920_000_000 + (runId % 79_000_000),
    })
  );

  const channelRepo = manager.getRepository(Channel);
  const channel = await channelRepo.save(
    channelRepo.create({
      id_text: `embApiCh${String(runId).slice(-6)}`,
      feed_id: feed.id,
      medium_id: MediumEnum.Podcast,
      title: 'Embed demo API integration channel',
    })
  );

  const itemIdText = `embApiIt${String(runId).slice(-6)}`;

  const itemRepo = manager.getRepository(Item);
  const item = await itemRepo.save(
    itemRepo.create({
      id_text: itemIdText,
      channel_id: channel.id,
      guid: `https://embed-demo-api-${runId}.example.com/item-guid`,
      title: 'Heavenly Bodies',
      item_flag_status_id: 1,
      pub_date: new Date(),
    })
  );

  const showcaseRepo = ormContext.dataSourceReadWrite.getRepository(EmbedDemoShowcase);
  await showcaseRepo.delete({ showcase_id: 'episode-audio' });
  await showcaseRepo.save(
    showcaseRepo.create({
      showcase_id: 'episode-audio',
      resource_id_text: itemIdText,
    })
  );

  return { itemId: item.id, itemIdText };
}

describe('Embed demo public API', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let seededItemId: number | undefined;
  let seededItemIdText: string | undefined;

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (ormContext === undefined) {
      throw new Error('Expected ORM context for embed demo integration test');
    }
    const fixture = await seedEmbedDemoShowcaseFixture(ormContext);
    seededItemId = fixture.itemId;
    seededItemIdText = fixture.itemIdText;
  });

  afterAll(async () => {
    if (ormContext !== undefined) {
      const { EmbedDemoShowcase, Item } = await import('@podverse/orm');
      await ormContext.dataSourceReadWrite
        .getRepository(EmbedDemoShowcase)
        .delete({ showcase_id: 'episode-audio' });
      if (seededItemId !== undefined) {
        await ormContext.dataSourceReadWrite.getRepository(Item).delete({ id: seededItemId });
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('GET /embed-demo/showcase returns configured showcase rows without authentication', async () => {
    const response = await request(server).get(`${showcaseBase}/showcase`).expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    const episodeAudio = response.body.data.find(
      (entry: { showcaseId: string }) => entry.showcaseId === 'episode-audio'
    );
    expect(episodeAudio).toBeDefined();
    expect(episodeAudio.resourceIdText).toBe(seededItemIdText);
    expect(episodeAudio.routeKind).toBe('episode');
    expect(episodeAudio.href).toContain(`/embed/episode/${seededItemIdText}`);
    expect(episodeAudio.href).toContain('chapter_markers=1');
    expect(episodeAudio.note).toBe('Heavenly Bodies');
  });
});
