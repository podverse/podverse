import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

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

const token = randomUUID().replaceAll('-', '').slice(0, 8);
const hostOnlyIdText = `h${token}`;
const castIdText = `c${token}`;
const guestIdText = `g${token}`;
const hostOnlyName = `Host Only ${token}`;
const castName = `Cast Host ${token}`;
const guestName = `Item Guest ${token}`;
const guestImage = 'https://people.example/guest.jpg';

let podcastIndexSlot = 0;

function nextPodcastIndexId(): number {
  podcastIndexSlot += 1;
  const parsed = Number.parseInt(token.slice(0, 5), 16) % 20_000_000;
  return 1_810_000_000 + parsed + podcastIndexSlot;
}

type SeededChannel = {
  channelId: number;
  feedId: number;
};

describe('Channel person appearances', () => {
  let app: import('express').Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let appearancesBase = '';
  let hostOnlyChannel: SeededChannel | undefined;
  let guestChannel: SeededChannel | undefined;

  function requireManager(): EntityManager {
    if (ormContext === undefined) {
      throw new Error('Person appearances test has no database');
    }
    return ormContext.dataSourceReadWrite.manager;
  }

  async function seedChannel(title: string): Promise<SeededChannel> {
    const manager = requireManager();
    const { Channel, Feed } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        podcast_index_id: nextPodcastIndexId(),
        url: `https://person-appearances-${token}-${title.length}.example/feed.xml`,
      })
    );
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title,
      })
    );
    return { channelId: channel.id, feedId: feed.id };
  }

  async function seedPerson(idText: string, displayName: string): Promise<number> {
    const rows: unknown = await requireManager().query(
      `INSERT INTO person (id_text, name_key, display_name)
       VALUES ($1, public.person_name_key($2), $2)
       RETURNING id`,
      [idText, displayName]
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    const id =
      typeof row === 'object' && row !== null && 'id' in row
        ? row.id
        : null;
    if (typeof id === 'number' && Number.isInteger(id)) {
      return id;
    }
    if (typeof id === 'string' && /^[1-9][0-9]*$/.test(id)) {
      return Number(id);
    }
    throw new Error('Person appearances test did not insert a person');
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    appearancesBase = `${await getBaseApiUrl()}/channel`;

    hostOnlyChannel = await seedChannel(`Hosts only ${token}`);
    const hostOnlyPersonId = await seedPerson(hostOnlyIdText, hostOnlyName);
    await requireManager().query(
      `INSERT INTO channel_person (channel_id, name, role, person_group, person_id, person_id_text)
       VALUES ($1, $2, 'host', 'cast', $3, $4)`,
      [hostOnlyChannel.channelId, hostOnlyName, hostOnlyPersonId, hostOnlyIdText]
    );

    guestChannel = await seedChannel(`Hosts and guests ${token}`);
    const castPersonId = await seedPerson(castIdText, castName);
    const guestPersonId = await seedPerson(guestIdText, guestName);
    await requireManager().query(
      `INSERT INTO channel_person (channel_id, name, role, person_group, person_id, person_id_text)
       VALUES ($1, $2, 'host', 'cast', $3, $4)`,
      [guestChannel.channelId, castName, castPersonId, castIdText]
    );
    const { Item, ItemFlagStatusStatusEnum } = await import('@podverse/orm');
    const itemRepo = requireManager().getRepository(Item);
    const item = await itemRepo.save(
      itemRepo.create({
        channel_id: String(guestChannel.channelId),
        guid: `person-appearances-${token}`,
        item_flag_status: { id: ItemFlagStatusStatusEnum.Active },
        pub_date: new Date('2026-01-01T00:00:00.000Z'),
        title: `Guest episode ${token}`,
      })
    );
    await requireManager().query(
      `INSERT INTO item_person (
         item_id, name, role, person_group, img, person_id, person_id_text
       )
       VALUES ($1, $2, 'guest', 'cast', $3, $4, $5)`,
      [item.id, guestName, guestImage, guestPersonId, guestIdText]
    );
    await requireManager().query(
      `INSERT INTO channel_item_person_count (channel_id, person_id, item_count)
       VALUES ($1, $2, 1)`,
      [guestChannel.channelId, guestPersonId]
    );
  }, 120000);

  afterAll(async () => {
    const feedIds: number[] = [];
    if (hostOnlyChannel !== undefined) {
      feedIds.push(hostOnlyChannel.feedId);
    }
    if (guestChannel !== undefined) {
      feedIds.push(guestChannel.feedId);
    }
    if (ormContext !== undefined && feedIds.length > 0) {
      await ormContext.dataSourceReadWrite.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [
        feedIds,
      ]);
      await ormContext.dataSourceReadWrite.query(
        `DELETE FROM person WHERE id_text = ANY($1::text[])`,
        [[hostOnlyIdText, castIdText, guestIdText]]
      );
    }
    await stopTestApp(server, ormContext);
  });

  it('returns no appearances when the channel has cast and no item guests', async () => {
    if (app === undefined || hostOnlyChannel === undefined) {
      throw new Error('Person appearances test app did not start');
    }
    const response = await request(app).get(
      `${appearancesBase}/${hostOnlyChannel.channelId}/person-appearances`
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [], meta: { count: 0 } });
  });

  it('returns the item guest and leaves the cast-only host out', async () => {
    if (app === undefined || guestChannel === undefined) {
      throw new Error('Person appearances test app did not start');
    }
    const response = await request(app).get(
      `${appearancesBase}/${guestChannel.channelId}/person-appearances`
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [
        {
          display_name: guestName,
          id_text: guestIdText,
          img: guestImage,
          item_count: 1,
        },
      ],
      meta: { count: 1 },
    });
  });
});
