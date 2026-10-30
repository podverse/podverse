import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  buildRemoteStubPromoteDedupeKey,
  buildRemoteStubRecheckDedupeKey,
  buildRemoteStubRepointDedupeKey,
  REMOTE_STUB_RECHECK_JOB_TYPE,
} from '@podverse/orm';

import { getRemoteStub, listRemoteStubs } from './feedRemoteStubsAppDb.js';

const ALPHA_PROVIDER_FEED_ID = '876543270';
const BETA_PROVIDER_FEED_ID = '876543271';
const ALPHA_TITLE = 'Rst72FxA9k Alpha';
const BETA_TITLE = 'Rst72FxA9k Beta';
const SEARCH_TOKEN = 'Rst72FxA9k';
const ALPHA_GUID = 'a72f0000-0000-4000-8000-000000000270';
const BETA_GUID = 'a72f0000-0000-4000-8000-000000000271';
const ALPHA_URL = 'https://rst72-fx-270.example/podcast.xml';
const BETA_URL = 'https://rst72-fx-271.example/podcast.xml';
const ALPHA_IMAGE = 'https://rst72-fx-270.example/art.jpg';
const JOB_RUN_AFTER = '2026-04-01T12:00:00.000Z';

function asId(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  throw new Error('expected an integer id');
}

function rowField(row: unknown, key: string): unknown {
  if (typeof row !== 'object' || row === null) {
    throw new Error('expected a row');
  }
  return Reflect.get(row, key);
}

function rowsOf(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('expected rows');
  }
  return value;
}

async function cleanup(): Promise<void> {
  const existing = rowsOf(
    await AppDbDataSourceReadWrite.query(
      `SELECT id
       FROM remote_channel_stub
       WHERE index_provider = 'podcast_index'
         AND provider_feed_id IN ($1, $2)`,
      [ALPHA_PROVIDER_FEED_ID, BETA_PROVIDER_FEED_ID]
    )
  );
  const ids = existing.map((row) => asId(rowField(row, 'id')));
  const keys = [
    buildRemoteStubPromoteDedupeKey('podcast_index', ALPHA_PROVIDER_FEED_ID),
    buildRemoteStubPromoteDedupeKey('podcast_index', BETA_PROVIDER_FEED_ID),
    ...ids.flatMap((id) => [
      buildRemoteStubRecheckDedupeKey(id),
      buildRemoteStubRepointDedupeKey(id),
    ]),
  ];
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  await AppDbDataSourceReadWrite.query(
    `DELETE FROM scheduled_job WHERE dedupe_key IN (${placeholders})`,
    keys
  );
  await AppDbDataSourceReadWrite.query(
    `DELETE FROM remote_channel_stub
     WHERE index_provider = 'podcast_index'
       AND provider_feed_id IN ($1, $2)`,
    [ALPHA_PROVIDER_FEED_ID, BETA_PROVIDER_FEED_ID]
  );
}

describe('remote stub app db reads', () => {
  let alphaId = 0;

  beforeAll(async () => {
    if (!AppDbDataSourceRead.isInitialized) {
      await AppDbDataSourceRead.initialize();
    }
    if (!AppDbDataSourceReadWrite.isInitialized) {
      await AppDbDataSourceReadWrite.initialize();
    }
    await cleanup();
    const mediumRows = rowsOf(
      await AppDbDataSourceReadWrite.query(`SELECT id FROM medium WHERE value = 'podcast' LIMIT 1`)
    );
    const mediumId = asId(rowField(mediumRows[0], 'id'));
    const alphaRows = rowsOf(
      await AppDbDataSourceReadWrite.query(
        `INSERT INTO remote_channel_stub (
           index_provider, provider_feed_id, feed_guid, feed_url, title, author, image_url, medium_id
         ) VALUES ('podcast_index', $1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          ALPHA_PROVIDER_FEED_ID,
          ALPHA_GUID,
          ALPHA_URL,
          ALPHA_TITLE,
          'Alpha Host',
          ALPHA_IMAGE,
          mediumId,
        ]
      )
    );
    alphaId = asId(rowField(alphaRows[0], 'id'));
    const betaRows = rowsOf(
      await AppDbDataSourceReadWrite.query(
        `INSERT INTO remote_channel_stub (
           index_provider, provider_feed_id, feed_guid, feed_url, title, author, medium_id
         ) VALUES ('podcast_index', $1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [BETA_PROVIDER_FEED_ID, BETA_GUID, BETA_URL, BETA_TITLE, 'Beta Host', mediumId]
      )
    );
    const betaId = asId(rowField(betaRows[0], 'id'));
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO remote_channel_stub_alias (remote_channel_stub_id, key_kind, key_value)
       VALUES ($1, 'feed_guid', $2), ($1, 'feed_url', $3), ($4, 'feed_guid', $5), ($4, 'feed_url', $6)`,
      [alphaId, ALPHA_GUID, ALPHA_URL, betaId, BETA_GUID, BETA_URL]
    );
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO remote_item_stub (
         remote_channel_stub_id, item_guid, title, pub_date, duration_seconds
       ) VALUES
         ($1, 'rst72-item-270-old', 'Older', '2026-01-01T00:00:00.000Z', 60),
         ($1, 'rst72-item-270-new', 'Newer', '2026-02-01T00:00:00.000Z', 120),
         ($2, 'rst72-item-271', 'Beta Item', '2026-03-01T00:00:00.000Z', 90)`,
      [alphaId, betaId]
    );
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO scheduled_job (
         job_type, dedupe_key, run_after, status, attempts, max_attempts, payload
       ) VALUES ($1, $2, $3, 'pending', 0, 3, '{}'::jsonb)`,
      [REMOTE_STUB_RECHECK_JOB_TYPE, buildRemoteStubRecheckDedupeKey(alphaId), JOB_RUN_AFTER]
    );
  });

  afterAll(async () => {
    try {
      if (AppDbDataSourceReadWrite.isInitialized) {
        await cleanup();
      }
    } finally {
      if (AppDbDataSourceRead.isInitialized) {
        await AppDbDataSourceRead.destroy();
      }
      if (AppDbDataSourceReadWrite.isInitialized) {
        await AppDbDataSourceReadWrite.destroy();
      }
    }
  });

  it('searches by title and by provider feed id', async () => {
    const byTitle = await listRemoteStubs({
      page: 1,
      limit: 25,
      q: ALPHA_TITLE,
      sort: 'created_at',
      order: 'desc',
    });
    expect(byTitle.total).toBe(1);
    expect(byTitle.rows[0]?.provider_feed_id).toBe(ALPHA_PROVIDER_FEED_ID);
    expect(byTitle.rows[0]?.title).toBe(ALPHA_TITLE);
    expect(byTitle.rows[0]?.alias_count).toBe(2);
    expect(byTitle.rows[0]?.item_stub_count).toBe(2);
    expect(byTitle.rows[0]?.pending_action).toBe('recheck');
    expect(byTitle.rows[0]?.medium_value).toBe('podcast');

    const byProvider = await listRemoteStubs({
      page: 1,
      limit: 25,
      q: ALPHA_PROVIDER_FEED_ID,
      sort: 'title',
      order: 'asc',
    });
    expect(byProvider.total).toBe(1);
    expect(byProvider.rows[0]?.title).toBe(ALPHA_TITLE);
  });

  it('sorts by item stub count and reports the page total', async () => {
    const page = await listRemoteStubs({
      page: 1,
      limit: 1,
      q: SEARCH_TOKEN,
      sort: 'item_stub_count',
      order: 'desc',
    });
    expect(page.total).toBe(2);
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0]?.provider_feed_id).toBe(ALPHA_PROVIDER_FEED_ID);
    expect(page.rows[0]?.item_stub_count).toBe(2);
    expect(page.rows[0]?.pending_action).toBe('recheck');

    const nextPage = await listRemoteStubs({
      page: 2,
      limit: 1,
      q: SEARCH_TOKEN,
      sort: 'item_stub_count',
      order: 'desc',
    });
    expect(nextPage.total).toBe(2);
    expect(nextPage.rows[0]?.provider_feed_id).toBe(BETA_PROVIDER_FEED_ID);
    expect(nextPage.rows[0]?.item_stub_count).toBe(1);
    expect(nextPage.rows[0]?.pending_action).toBeNull();
  });

  it('returns aliases, item stubs, and jobs for one stub', async () => {
    const detail = await getRemoteStub(alphaId);
    expect(detail).not.toBeNull();
    expect(detail?.image_url).toBe(ALPHA_IMAGE);
    expect(detail?.aliases).toEqual([
      { key_kind: 'feed_guid', key_value: ALPHA_GUID },
      { key_kind: 'feed_url', key_value: ALPHA_URL },
    ]);
    expect(detail?.item_stubs.map((item) => item.title)).toEqual(['Newer', 'Older']);
    expect(detail?.item_stubs[0]).toMatchObject({
      item_guid: 'rst72-item-270-new',
      pub_date: '2026-02-01T00:00:00.000Z',
      duration_seconds: 120,
    });
    expect(detail?.jobs).toEqual([
      expect.objectContaining({
        job_type: REMOTE_STUB_RECHECK_JOB_TYPE,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        last_error: null,
        run_after: JOB_RUN_AFTER,
      }),
    ]);
    expect(detail?.resolved_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(detail?.jobs[0]?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
