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

type EntityManager = ORMContext['dataSourceReadWrite']['manager'];

type SeededAccount = { id: number; idText: string };

type SeededShow = {
  channelId: number;
  channelIdText: string;
  channelTitle: string;
  itemId: number;
  itemIdText: string;
  itemTitle: string;
  clipId: number;
  clipIdText: string;
  playlistId: number;
  playlistIdText: string;
};

const LISTEN_CREATED_AT = '2026-10-01T15:04:05.000Z';
const TASTE_UPDATED_AT = '2026-09-01T00:00:00.000Z';
const HIDDEN_AT = '2026-09-02T00:00:00.000Z';
const OPENED_AT = '2026-09-03T00:00:00.000Z';
const OPTED_OUT_AT = '2026-09-04T08:30:00.000Z';
const SHARABLE_STATUS_PUBLIC = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value.filter(isRecord)[0] : undefined;
  if (row === undefined) {
    throw new Error('expected a row');
  }
  return row;
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('expected a text value');
}

function asId(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  throw new Error('expected an id');
}

function asIsoTimestamp(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('expected a timestamp');
    }
    return parsed.toISOString();
  }
  throw new Error('expected a timestamp');
}

describe('account data export includes listening data (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager;
  const runId = Date.now();
  const suffix = String(runId).slice(-8);
  const createdAccountIds: number[] = [];
  const createdFeedIds: number[] = [];

  let owner: SeededAccount;
  let show: SeededShow;

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> =>
    manager.query(sql, params);

  const seedAccount = async (label: string): Promise<SeededAccount> => {
    const { AccountService } = await import('@podverse/orm');
    const accountService = new AccountService();
    const email = `data-export-popularity-${label}-${runId}@example.com`;
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error(`Failed to load account ${label}`);
    }
    createdAccountIds.push(account.id);
    return { id: account.id, idText: account.id_text };
  };

  const seedListeningData = async (accountId: number): Promise<string> => {
    const listenerId = asText(
      firstRow(
        await query(
          'INSERT INTO listener_identity.stats_listener (account_id) VALUES ($1) RETURNING listener_id::text AS listener_id',
          [accountId]
        )
      ).listener_id
    );
    await query(
      `INSERT INTO stats_taste_profile
         (listener_id, channel_id, listen_count, completion_count, first_listened_at,
          last_listened_at, recent_score, long_term_score, scores_updated_at)
       VALUES ($1::uuid, $2, 2, 1, $3::timestamptz, $3::timestamptz, 4, 7, $3::timestamptz)`,
      [listenerId, show.channelId, TASTE_UPDATED_AT]
    );
    await query(
      `INSERT INTO stats_taste_profile_hidden (listener_id, channel_id, hidden_at)
       VALUES ($1::uuid, $2, $3::timestamptz)`,
      [listenerId, show.channelId, HIDDEN_AT]
    );
    await query(
      `INSERT INTO stats_channel_hidden (listener_id, channel_id, hidden_at)
       VALUES ($1::uuid, $2, $3::timestamptz)`,
      [listenerId, show.channelId, HIDDEN_AT]
    );
    const listenCreatedAt = asIsoTimestamp(
      firstRow(
        await query(
          `INSERT INTO stats_listen_event
             (listener_id, channel_id, item_id, clip_id, seconds_heard, completed, created_at)
           VALUES ($1::uuid, $2, $3, $4, 90, true, $5::timestamptz)
           RETURNING created_at`,
          [listenerId, show.channelId, show.itemId, show.clipId, LISTEN_CREATED_AT]
        )
      ).created_at
    );
    if (listenCreatedAt !== LISTEN_CREATED_AT) {
      throw new Error(`seeded listen created_at was ${listenCreatedAt}`);
    }
    await query(
      `INSERT INTO stats_open_event (listener_id, playlist_id, created_at)
       VALUES ($1::uuid, $2, $3::timestamptz)`,
      [listenerId, show.playlistId, OPENED_AT]
    );
    return listenerId;
  };

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for the account data export integration test');
    }
    manager = ormContext.dataSourceReadWrite.manager;

    owner = await seedAccount('owner');

    const { Channel, Feed, Item } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: `https://data-export-popularity-${runId}.example.com/feed.xml`,
        podcast_index_id: 1_872_000_000 + (runId % 10_000_000),
      })
    );
    createdFeedIds.push(feed.id);
    const channelTitle = `Data export popularity ${runId}`;
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title: channelTitle,
      })
    );
    const itemTitle = `Data export episode ${runId}`;
    const itemRepo = manager.getRepository(Item);
    const item = await itemRepo.save(
      itemRepo.create({
        channel_id: String(channel.id),
        title: itemTitle,
        item_flag_status: { id: 1 },
        guid: `https://data-export-popularity.example.com/${runId}/episode`,
      })
    );
    const clipIdText = `d72c${suffix}`;
    const clipId = asId(
      firstRow(
        await query(
          `INSERT INTO clip
             (id_text, account_id, item_id, start_time, created_at, sharable_status_id)
           VALUES ($1, $2, $3, 0, now(), $4)
           RETURNING id`,
          [clipIdText, owner.id, item.id, SHARABLE_STATUS_PUBLIC]
        )
      ).id
    );
    const playlistIdText = `d72p${suffix}`;
    const playlistId = asId(
      firstRow(
        await query(
          `INSERT INTO playlist (id_text, account_id, sharable_status_id, title, medium_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            playlistIdText,
            owner.id,
            SHARABLE_STATUS_PUBLIC,
            `Data export playlist ${runId}`,
            MediumEnum.Podcast,
          ]
        )
      ).id
    );
    show = {
      channelId: channel.id,
      channelIdText: channel.id_text,
      channelTitle,
      itemId: item.id,
      itemIdText: item.id_text,
      itemTitle,
      clipId,
      clipIdText,
      playlistId,
      playlistIdText,
    };
  }, 60000);

  afterAll(async () => {
    if (ormContext) {
      const { AccountService } = await import('@podverse/orm');
      const accountService = new AccountService();
      for (const accountId of createdAccountIds) {
        await accountService.delete(accountId);
      }
      if (createdFeedIds.length > 0) {
        await query('DELETE FROM feed WHERE id = ANY($1::int[])', [createdFeedIds]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('exports taste, hidden, listen, and open rows and omits the listener id', async () => {
    const listenerId = await seedListeningData(owner.id);
    const { AccountDataExportService } = await import('@podverse/orm');
    const result = await new AccountDataExportService().exportUserData(owner.id);
    const listen = result.listening_data.listen_events[0];
    if (listen === undefined) {
      throw new Error('expected a listen event');
    }

    expect(result.listening_data.taste_profile).toEqual([
      {
        channel_id_text: show.channelIdText,
        channel_title: show.channelTitle,
        listen_count: 2,
        completion_count: 1,
        first_listened_at: TASTE_UPDATED_AT,
        last_listened_at: TASTE_UPDATED_AT,
        recent_score: 4,
        long_term_score: 7,
        scores_updated_at: TASTE_UPDATED_AT,
        weight_override: null,
        weight_override_at: null,
      },
    ]);
    expect(result.listening_data.hidden_from_taste_profile).toEqual([
      {
        channel_id_text: show.channelIdText,
        channel_title: show.channelTitle,
        hidden_at: HIDDEN_AT,
      },
    ]);
    expect(result.listening_data.hidden_channels).toEqual([
      {
        channel_id_text: show.channelIdText,
        channel_title: show.channelTitle,
        hidden_at: HIDDEN_AT,
      },
    ]);
    expect(listen).toEqual({
      created_at: LISTEN_CREATED_AT,
      channel_id_text: show.channelIdText,
      item_id_text: show.itemIdText,
      item_title: show.itemTitle,
      clip_id_text: show.clipIdText,
      seconds_heard: 90,
      completed: true,
    });
    expect(result.listening_data.open_events).toEqual([
      {
        opened_at: OPENED_AT,
        account_id_text: null,
        playlist_id_text: show.playlistIdText,
      },
    ]);
    expect(result.listen_stats_opted_out_at).toBeNull();
    expect(listen).not.toHaveProperty('listened_at');
    expect(listen).not.toHaveProperty('listener_id');
    expect(JSON.stringify(result)).not.toContain(listenerId);
    expect(JSON.stringify(result)).not.toContain('listener_id');
  });

  it('exports empty listening data lists when the account has no listener row', async () => {
    const quiet = await seedAccount('no-listener');
    const { AccountDataExportService } = await import('@podverse/orm');
    const result = await new AccountDataExportService().exportUserData(quiet.id);

    expect(result.listening_data).toEqual({
      taste_profile: [],
      hidden_from_taste_profile: [],
      hidden_channels: [],
      listen_events: [],
      open_events: [],
    });
    expect(result).not.toHaveProperty('popularity_tracking');
  });

  it('exports the last opt-out time', async () => {
    const returning = await seedAccount('opted-out');
    await query(
      'UPDATE account_settings SET listen_stats_opted_out_at = $2::timestamptz WHERE account_id = $1',
      [returning.id, OPTED_OUT_AT]
    );
    const { AccountDataExportService } = await import('@podverse/orm');
    const result = await new AccountDataExportService().exportUserData(returning.id);

    expect(result.listen_stats_opted_out_at).toBe(OPTED_OUT_AT);
  });
});
