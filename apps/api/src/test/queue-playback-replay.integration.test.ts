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

/**
 * Timestamps are anchored in the past because the server clamps client timestamps that sit beyond
 * its own clock, which would collapse the ordering these tests are about.
 */
const MINUTE_MS = 60_000;
const isoMinutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * MINUTE_MS).toISOString();

type PlaybackAccount = {
  accountId: number;
  accountIdText: string;
  queueIdText: string;
};

type PlaybackFixture = {
  arrivalOrderAccount: PlaybackAccount;
  oneAtATimeAccount: PlaybackAccount;
  replayAccount: PlaybackAccount;
  itemIdTexts: [string, string, string];
  itemTitles: [string, string, string];
};

async function seedPlaybackFixture(ormContext: ORMContext): Promise<PlaybackFixture> {
  const { AccountService, Channel, Feed, Item, QueueService } = await import('@podverse/orm');

  const manager = ormContext.dataSourceReadWrite.manager;
  const runId = Date.now();

  const feedRepo = manager.getRepository(Feed);
  const feed = await feedRepo.save(
    feedRepo.create({
      url: `https://queue-playback-replay-${runId}.example.com/feed.xml`,
      podcast_index_id: 910_000_000 + (runId % 89_000_000),
    })
  );

  const channelRepo = manager.getRepository(Channel);
  const channel = await channelRepo.save(
    channelRepo.create({
      feed_id: feed.id,
      medium_id: MediumEnum.AV,
      title: 'Queue playback replay channel',
    })
  );

  const itemRepo = manager.getRepository(Item);
  const itemTitles: [string, string, string] = [
    'Playback replay item one',
    'Playback replay item two',
    'Playback replay item three',
  ];
  const itemIdTexts: string[] = [];
  for (const [index, title] of itemTitles.entries()) {
    const item = await itemRepo.save(
      itemRepo.create({
        channel_id: String(channel.id),
        title,
        item_flag_status: { id: 1 },
        guid: `queue-playback-replay-${runId}-${index}@example.com`,
      })
    );
    itemIdTexts.push(item.id_text);
  }

  const [firstItemIdText, secondItemIdText, thirdItemIdText] = itemIdTexts;
  if (
    firstItemIdText === undefined ||
    secondItemIdText === undefined ||
    thirdItemIdText === undefined
  ) {
    throw new Error('Expected three seeded playback items');
  }

  const accountService = new AccountService();
  const queueService = new QueueService();

  const seedAccount = async (label: string): Promise<PlaybackAccount> => {
    const email = `queue-playback-replay-${label}-${runId}@example.com`;
    await accountService.create({ email, password: 'IntegrationTest1!', locale: 'en-US' });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error(`Failed to load account after create: ${label}`);
    }
    const queues = await queueService.getAllPrivate(account.id);
    const avQueue = queues.find((queue) => queue.medium_id === MediumEnum.AV);
    if (!avQueue) {
      throw new Error(`Expected AV queue for account: ${label}`);
    }
    return {
      accountId: account.id,
      accountIdText: account.id_text,
      queueIdText: avQueue.id_text,
    };
  };

  return {
    arrivalOrderAccount: await seedAccount('arrival'),
    itemIdTexts: [firstItemIdText, secondItemIdText, thirdItemIdText],
    itemTitles,
    oneAtATimeAccount: await seedAccount('one-at-a-time'),
    replayAccount: await seedAccount('replay'),
  };
}

type PlaybackWrite = {
  itemIdText: string;
  lastPlayedAt: string;
  playbackPosition: number;
};

/** State that must match between a replayed batch and the same writes applied one at a time. */
type ComparableRow = {
  completed: boolean;
  lastPlayedAt: string | null;
  listPosition: string;
  playbackPosition: string;
  title: string | null;
};

describe('queue playback writes and replay (real QueueResourceService)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let queueBase: string;
  let fixture: PlaybackFixture;

  const postNowPlaying = async (account: PlaybackAccount, write: PlaybackWrite) =>
    request(app)
      .post(`${queueBase}/${account.queueIdText}/item/${write.itemIdText}/now-playing`)
      .set(authHeaders(account.accountId, account.accountIdText))
      .send({
        last_played_at: write.lastPlayedAt,
        media_file_duration: 300,
        playback_event_kind: 'play',
        playback_position: write.playbackPosition,
      });

  const postReplay = async (account: PlaybackAccount, writes: PlaybackWrite[]) =>
    request(app)
      .post(`${queueBase}/${account.queueIdText}/playback-events/replay`)
      .set(authHeaders(account.accountId, account.accountIdText))
      .send({
        events: writes.map((write) => ({
          item_id_text: write.itemIdText,
          last_played_at: write.lastPlayedAt,
          media_file_duration: 300,
          playback_event_kind: 'play',
          playback_position: write.playbackPosition,
        })),
      });

  const getHistoryRows = async (account: PlaybackAccount): Promise<ComparableRow[]> => {
    const res = await request(app)
      .get(`${queueBase}/${account.queueIdText}/resources/history-paginated`)
      .set(authHeaders(account.accountId, account.accountIdText));
    expect(res.status).toBe(200);
    return res.body.data.map(
      (row: {
        completed?: boolean;
        item?: { title?: string | null } | null;
        last_played_at?: string | null;
        list_position?: string | number;
        playback_position?: string | number;
      }): ComparableRow => ({
        completed: row.completed === true,
        lastPlayedAt:
          row.last_played_at !== null && row.last_played_at !== undefined
            ? new Date(row.last_played_at).toISOString()
            : null,
        listPosition: String(row.list_position),
        playbackPosition: String(Number(row.playback_position)),
        title: row.item?.title ?? null,
      })
    );
  };

  const getNowPlayingTitle = async (account: PlaybackAccount): Promise<string | null> => {
    const res = await request(app)
      .get(`${queueBase}/${account.queueIdText}/resources/now-playing`)
      .set(authHeaders(account.accountId, account.accountIdText));
    expect(res.status).toBe(200);
    const body: { item?: { title?: string | null } | null } | null = res.body;
    if (body === null) {
      return null;
    }
    return body.item?.title ?? null;
  };

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for queue playback replay integration test');
    }
    fixture = await seedPlaybackFixture(ormContext);
    queueBase = `${await getBaseApiUrl()}/queue`;
  }, 60000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('orders history by when playback happened, not by when writes arrived', async () => {
    const { arrivalOrderAccount, itemIdTexts, itemTitles } = fixture;

    // Arrival order deliberately disagrees with playback order.
    for (const write of [
      { itemIdText: itemIdTexts[0], lastPlayedAt: isoMinutesAgo(30), playbackPosition: 11.5 },
      { itemIdText: itemIdTexts[2], lastPlayedAt: isoMinutesAgo(10), playbackPosition: 33.5 },
      { itemIdText: itemIdTexts[1], lastPlayedAt: isoMinutesAgo(20), playbackPosition: 22.5 },
    ]) {
      const res = await postNowPlaying(arrivalOrderAccount, write);
      expect(res.status).toBe(201);
    }

    const rows = await getHistoryRows(arrivalOrderAccount);

    expect(rows.map((row) => row.title)).toEqual([itemTitles[2], itemTitles[1], itemTitles[0]]);
    expect(rows.map((row) => row.playbackPosition)).toEqual(['33.5', '22.5', '11.5']);
  });

  it('replays an out-of-order batch to the same state as one-at-a-time chronological writes', async () => {
    const { itemIdTexts, itemTitles, oneAtATimeAccount, replayAccount } = fixture;

    const chronologicalWrites: [PlaybackWrite, PlaybackWrite, PlaybackWrite] = [
      { itemIdText: itemIdTexts[0], lastPlayedAt: isoMinutesAgo(30), playbackPosition: 11.5 },
      { itemIdText: itemIdTexts[1], lastPlayedAt: isoMinutesAgo(20), playbackPosition: 22.5 },
      { itemIdText: itemIdTexts[2], lastPlayedAt: isoMinutesAgo(10), playbackPosition: 33.5 },
    ];

    for (const write of chronologicalWrites) {
      const res = await postNowPlaying(oneAtATimeAccount, write);
      expect(res.status).toBe(201);
    }

    // Same events, shuffled, delivered as one batch.
    const replayRes = await postReplay(replayAccount, [
      chronologicalWrites[2],
      chronologicalWrites[0],
      chronologicalWrites[1],
    ]);
    expect(replayRes.status).toBe(200);

    const oneAtATimeRows = await getHistoryRows(oneAtATimeAccount);
    const replayRows = await getHistoryRows(replayAccount);

    expect(replayRows).toEqual(oneAtATimeRows);

    // Sorting by timestamp is what makes the batch equivalent: the newest event ends up
    // now-playing even though it was first in the submitted array.
    expect(await getNowPlayingTitle(replayAccount)).toBe(itemTitles[2]);
    expect(await getNowPlayingTitle(oneAtATimeAccount)).toBe(itemTitles[2]);
  });
});
