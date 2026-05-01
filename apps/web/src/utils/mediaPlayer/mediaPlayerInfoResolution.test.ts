import { describe, expect, it } from 'vitest';

import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { getMediaPlayerInfoResolution } from './mediaPlayerInfoResolution';

const chapter = (
  over: Pick<DTOItemChapter, 'id' | 'id_text' | 'table_of_contents'> & Partial<DTOItemChapter>
): DTOItemChapter => ({
  item_chapters_feed_id: 1,
  data_hash: 'hash',
  start_time: '0',
  end_time: '10',
  title: 'chapter',
  ...over,
});

describe('getMediaPlayerInfoResolution', () => {
  it('prefers toc:false chapter over overlapping toc:true chapter', () => {
    const tocTrue = chapter({
      id: 1,
      id_text: 'ch-toc-true',
      table_of_contents: true,
      title: 'Wrapper',
      start_time: '0',
      end_time: '30',
    });
    const tocFalse = chapter({
      id: 2,
      id_text: 'ch-toc-false',
      table_of_contents: false,
      title: 'Inner',
      start_time: '5',
      end_time: '20',
    });

    const result = getMediaPlayerInfoResolution({
      mpChannel: null,
      mpItem: null,
      mpAddByRSS: null,
      mpClip: null,
      mpItemSoundbite: null,
      mpItemChapter: null,
      mpItemChapters: [tocTrue, tocFalse],
      currentTimeSeconds: 10,
    });

    expect(result.itemTitle).toBe('Inner');
    expect(result.subsectionUrl).toBe('/chapter/ch-toc-false');
  });

  it('uses first-position tie-break when overlapping chapters are same tier', () => {
    const first = chapter({
      id: 10,
      id_text: 'chapter-first',
      table_of_contents: true,
      title: 'First chapter',
      start_time: '0',
      end_time: '60',
    });
    const second = chapter({
      id: 11,
      id_text: 'chapter-second',
      table_of_contents: true,
      title: 'Second chapter',
      start_time: '10',
      end_time: '50',
    });

    const result = getMediaPlayerInfoResolution({
      mpChannel: null,
      mpItem: null,
      mpAddByRSS: null,
      mpClip: null,
      mpItemSoundbite: null,
      mpItemChapter: null,
      mpItemChapters: [first, second],
      currentTimeSeconds: 20,
    });

    expect(result.itemTitle).toBe('First chapter');
    expect(result.subsectionUrl).toBe('/chapter/chapter-first');
  });

  it('falls back to item title when there is no matching chapter', () => {
    const mpChannel = {
      id: 1,
      id_text: 'podcast-1',
      slug: 'podcast-1',
      feed_id: 1,
      podcast_guid: null,
      title: 'Channel title',
      sortable_title: 'channel title',
      medium_id: MediumEnum.Podcast,
      has_podcast_index_value: false,
      has_value_time_splits: false,
    } as DTOChannel;

    const mpItem = {
      id: 1,
      id_text: 'episode-1',
      channel_id: 1,
      item_flag_status_id: 1,
      title: 'Episode title',
      item_about: { id: 1, item_id: 1 },
      item_chat: { id: 1, item_id: 1, server: 'chat.example.com' },
      item_license: { id: 1, item_id: 1, identifier: 'CC-BY', url: null },
      item_location: { id: 1, item_id: 1, name: null },
      item_season: { id: 1, channel_season_id: 1, item_id: 1, title: null },
      item_content_links: [],
      item_enclosures: [],
      item_fundings: [],
      item_images: [],
      item_persons: [],
      item_social_interacts: [],
      item_soundbites: [],
      item_transcripts: [],
      item_txts: [],
      item_values: [],
    } as DTOItem;

    const result = getMediaPlayerInfoResolution({
      mpChannel,
      mpItem,
      mpAddByRSS: null,
      mpClip: null,
      mpItemSoundbite: null,
      mpItemChapter: null,
      mpItemChapters: [],
      currentTimeSeconds: 3,
    });

    expect(result.itemTitle).toBe('Episode title');
    expect(result.itemLinkUrl).toBe('/episode/episode-1');
  });
});
