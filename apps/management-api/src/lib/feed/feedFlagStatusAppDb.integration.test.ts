import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findFeedByInternalId } from './feedFlagStatusAppDb.js';

const FEED_URL = 'https://e2e-seed-lookup-no-channel.example/podcast.xml';
const PODCAST_INDEX_ID = 876543241;
const CHANNEL_ID_TEXT = 'e2eLkNoCh01';

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

describe('feed lookup after the channel row is gone', () => {
  let feedId = 0;

  beforeAll(async () => {
    if (!AppDbDataSourceRead.isInitialized) {
      await AppDbDataSourceRead.initialize();
    }
    if (!AppDbDataSourceReadWrite.isInitialized) {
      await AppDbDataSourceReadWrite.initialize();
    }
    await AppDbDataSourceReadWrite.query(
      `DELETE FROM channel_merge
       WHERE from_podcast_index_id = $1 OR to_podcast_index_id = $1`,
      [PODCAST_INDEX_ID]
    );
    await AppDbDataSourceReadWrite.query(`DELETE FROM feed WHERE podcast_index_id = $1`, [
      PODCAST_INDEX_ID,
    ]);
    const feedRows: unknown = await AppDbDataSourceReadWrite.query(
      `INSERT INTO feed (url, podcast_index_id) VALUES ($1, $2) RETURNING id`,
      [FEED_URL, PODCAST_INDEX_ID]
    );
    const feedRow = Array.isArray(feedRows) ? feedRows[0] : undefined;
    feedId = asId(
      typeof feedRow === 'object' && feedRow !== null ? Reflect.get(feedRow, 'id') : undefined
    );
    const mediumRows: unknown = await AppDbDataSourceReadWrite.query(
      `SELECT id FROM medium WHERE value = 'podcast' LIMIT 1`
    );
    const mediumRow = Array.isArray(mediumRows) ? mediumRows[0] : undefined;
    const mediumId = asId(
      typeof mediumRow === 'object' && mediumRow !== null ? Reflect.get(mediumRow, 'id') : undefined
    );
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO channel (id_text, feed_id, medium_id, title) VALUES ($1, $2, $3, $4)`,
      [CHANNEL_ID_TEXT, feedId, mediumId, 'Lookup show']
    );
    await AppDbDataSourceReadWrite.query(`DELETE FROM channel WHERE feed_id = $1`, [feedId]);
  });

  afterAll(async () => {
    try {
      if (AppDbDataSourceReadWrite.isInitialized && feedId !== 0) {
        await AppDbDataSourceReadWrite.query(`DELETE FROM feed WHERE id = $1`, [feedId]);
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

  it('still finds the feed and shows the feed URL as the channel title', async () => {
    const found = await findFeedByInternalId(feedId);
    expect(found).not.toBeNull();
    expect(found?.url).toBe(FEED_URL);
    expect(found?.channel_title).toBe(FEED_URL);
  });
});
