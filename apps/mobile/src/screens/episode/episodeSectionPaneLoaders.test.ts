import { describe, expect, it } from 'vitest';

import type { DTOClip, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers/dto';

import {
  loadEpisodeChaptersPane,
  loadEpisodeClipsPane,
  loadEpisodeSoundbitesPane,
  loadEpisodeTranscriptPane,
} from './episodeSectionPaneLoaders';

const notFoundError = { response: { status: 404 } };

const makeClip = (): DTOClip => {
  return {
    account: {
      id: 1,
      id_text: 'acct',
      verified: true,
    },
    end_time: null,
    id: 1,
    id_text: 'clip1',
    item: {
      channel_id: 1,
      id: 1,
      id_text: 'item1',
      item_about: { id: 1, item_id: 1 },
      item_chat: { id: 1, item_id: 1, server: '' },
      item_content_links: [],
      item_enclosures: [],
      item_flag_status_id: 1,
      item_fundings: [],
      item_images: [],
      item_license: { id: 1, identifier: '', item_id: 1, url: null },
      item_location: { id: 1, item_id: 1, name: null },
      item_persons: [],
      item_season: { channel_season_id: 1, id: 1, item_id: 1, title: null },
      item_social_interacts: [],
      item_soundbites: [],
      item_transcripts: [],
      item_txts: [],
      item_values: [],
    },
    item_id: 'item1',
    sharable_status: { id: 1, status: 'public' },
    start_time: '0',
  };
};

describe('episodeSectionPaneLoaders', () => {
  it('reads nested 404 chapters as an empty list', async () => {
    await expect(
      loadEpisodeChaptersPane(async () => {
        throw notFoundError;
      })
    ).resolves.toEqual([]);
  });

  it('reads nested 404 soundbites as an empty list', async () => {
    await expect(
      loadEpisodeSoundbitesPane(async () => {
        throw notFoundError;
      })
    ).resolves.toEqual([]);
  });

  it('reads nested 404 clips as an empty page', async () => {
    await expect(
      loadEpisodeClipsPane(async () => {
        throw notFoundError;
      }, 1)
    ).resolves.toEqual({ hasMore: false, rows: [] });
  });

  it('reads nested 404 transcripts as empty text', async () => {
    await expect(
      loadEpisodeTranscriptPane(async () => {
        throw notFoundError;
      })
    ).resolves.toBe('');
  });

  it('filters non-table-of-contents chapters out of chapter rows', async () => {
    const chapters: DTOItemChapter[] = [
      {
        data_hash: 'hash-1',
        id: 1,
        id_text: 'c1',
        item_chapters_feed_id: 1,
        start_time: '0',
        table_of_contents: true,
        title: 'One',
      },
      {
        data_hash: 'hash-2',
        id: 2,
        id_text: 'c2',
        item_chapters_feed_id: 1,
        start_time: '30',
        table_of_contents: false,
        title: 'Two',
      },
    ];

    await expect(
      loadEpisodeChaptersPane(async () => ({
        data: chapters,
      }))
    ).resolves.toEqual([chapters[0]]);
  });

  it('returns clip paging metadata for non-404 responses', async () => {
    const clip = makeClip();

    await expect(
      loadEpisodeClipsPane(async () => ({ data: [clip], meta: { count: 2, limit: 1, page: 1 } }), 1)
    ).resolves.toEqual({ hasMore: true, rows: [clip] });
  });

  it('returns transcript text when present', async () => {
    await expect(
      loadEpisodeTranscriptPane(async () => ({
        data: 'Transcript',
      }))
    ).resolves.toBe('Transcript');
  });

  it('returns soundbites from a normal response', async () => {
    const soundbite: DTOItemSoundbite = {
      duration: '15',
      id: 1,
      id_text: 'sb1',
      item_id: 1,
      start_time: '30',
      title: 'Soundbite',
    };

    await expect(
      loadEpisodeSoundbitesPane(async () => ({
        data: [soundbite],
      }))
    ).resolves.toEqual([soundbite]);
  });
});
