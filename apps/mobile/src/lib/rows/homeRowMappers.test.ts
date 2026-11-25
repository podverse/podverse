import { describe, expect, it } from 'vitest';

import type { DTOPlaylistResource, DTOQueueResource } from '@podverse/helpers/dto';

import { safeJsonParse } from '../../data/db/serialization';
import { addByRssPlaybackMediaId } from '../addByRss/resourceData';
import type { ItemHomeRowSource } from './homeRowMappers';
import {
  clipHomeRowSourceFromUnknown,
  clipListTimeRangeLabel,
  clipToHomeRow,
  playlistResourceToHomeRow,
  queueResourceToHomeRow,
} from './homeRowMappers';

const toQueueResource = (value: unknown): DTOQueueResource => {
  const parsed = safeJsonParse<DTOQueueResource>(JSON.stringify(value));
  if (parsed === null) {
    throw new Error('Failed to build DTOQueueResource fixture');
  }
  return parsed;
};

const buildItem = (overrides: Partial<ItemHomeRowSource> = {}): ItemHomeRowSource => {
  return {
    channel: {
      channel_images: [],
      medium_id: 2,
      title: 'Test channel',
    },
    id_text: 'item-1',
    item_about: {
      duration: '120',
    },
    item_description: {
      value: '<p>Example description</p>',
    },
    item_images: [],
    pub_date: '2026-01-01T00:00:00.000Z',
    title: 'Test episode',
    ...overrides,
  };
};

const buildResource = (overrides: Record<string, unknown> = {}): DTOQueueResource => {
  return toQueueResource({
    clip_id: null,
    completed: false,
    id: 1,
    item: buildItem(),
    item_id: 1,
    item_soundbite_id: null,
    list_position: '1',
    media_file_duration: '120',
    playback_position: '0',
    playlist_id: 1,
    ...overrides,
  });
};

const toPlaylistResource = (value: unknown): DTOPlaylistResource => {
  const parsed = safeJsonParse<DTOPlaylistResource>(JSON.stringify(value));
  if (parsed === null) {
    throw new Error('Failed to build DTOPlaylistResource fixture');
  }
  return parsed;
};

const buildPlaylistResource = (overrides: Record<string, unknown> = {}): DTOPlaylistResource => {
  return toPlaylistResource({
    clip_id: null,
    id: 1,
    item: buildItem(),
    item_id: 1,
    item_soundbite_id: null,
    list_position: '1',
    playlist_id: 10,
    ...overrides,
  });
};

describe('queueResourceToHomeRow', () => {
  it('maps item resources', () => {
    const row = queueResourceToHomeRow(buildResource(), 'queue');

    expect(row).not.toBeNull();
    expect(row?.title).toBe('Test episode');
    expect(row?.subtitle).toBe('Test channel');
    expect(row?.mediaType).toBe('episodes');
    expect(row?.description).toBe('Example description');
  });

  it('reads the stored preview, and still derives a snippet from a payload with only value', () => {
    const withPreview = queueResourceToHomeRow(
      buildResource({
        item: buildItem({
          item_description: {
            is_truncated: true,
            preview: 'Stored preview text',
            value: '<h2>Heading</h2><p>Full notes body</p>',
          },
        }),
      }),
      'queue'
    );
    const legacyPayload = queueResourceToHomeRow(
      buildResource({
        item: buildItem({ item_description: { value: '<p>Notes from an older payload</p>' } }),
      }),
      'queue'
    );

    expect(withPreview?.description).toBe('Stored preview text');
    expect(legacyPayload?.description).toBe('Notes from an older payload');
  });

  it('maps clip resources that only carry clip.item on queue screens', () => {
    const row = queueResourceToHomeRow(
      buildResource({
        clip: {
          id_text: 'clip-1',
          item: buildItem({ id_text: 'clip-item-1', title: 'Clip source item' }),
          title: 'Clip title',
        },
        clip_id: 11,
        id: 2,
        item: null,
        item_id: null,
      }),
      'queue'
    );

    expect(row).not.toBeNull();
    expect(row?.mediaType).toBe('clips');
    expect(row?.title).toBe('Clip source item');
  });

  it('maps soundbite resources that only carry item_soundbite.item on queue screens', () => {
    const row = queueResourceToHomeRow(
      buildResource({
        id: 3,
        item: null,
        item_id: null,
        item_soundbite: {
          id_text: 'soundbite-1',
          item: buildItem({ id_text: 'soundbite-item-1', title: 'Soundbite source item' }),
          title: 'Soundbite title',
        },
        item_soundbite_id: 22,
      }),
      'queue'
    );

    expect(row).not.toBeNull();
    expect(row?.mediaType).toBe('clips');
    expect(row?.title).toBe('Soundbite source item');
  });

  it('maps add-by-RSS resources from resource data on queue screens', () => {
    const row = queueResourceToHomeRow(
      buildResource({
        add_by_rss_hash_id: 'rss-1',
        add_by_rss_resource_data: {
          channel_title: 'RSS channel',
          duration: 42,
          item_images: [{ image_width_size: 300, is_resized: false, url: 'https://example.com/a' }],
          medium_id: 4,
          pub_date: '2026-04-01T00:00:00.000Z',
          title: 'RSS episode',
        },
        id: 4,
        item: null,
        item_id: null,
      }),
      'queue'
    );

    expect(row).not.toBeNull();
    expect(row?.title).toBe('RSS episode');
    expect(row?.subtitle).toBe('RSS channel');
    expect(row?.duration).toBe('42');
    expect(row?.mediaType).toBe('tracks');
    expect(row?.imageUrl).toBe('https://example.com/a');
  });

  it('maps an add-by-RSS history row with its playback id', () => {
    const resourceData = {
      channel_title: 'RSS channel',
      duration: 42,
      feed_url: 'https://example.com/feed.xml',
      guid: 'episode-1',
      title: 'RSS episode',
    };
    const row = queueResourceToHomeRow(
      buildResource({
        add_by_rss_hash_id: 'rss-history-1',
        add_by_rss_resource_data: resourceData,
        id: 8,
        item: null,
        item_id: null,
      }),
      'history'
    );

    expect(row).not.toBeNull();
    expect(row?.id).toBe('history-8');
    expect(row?.title).toBe('RSS episode');
    expect(row?.playbackMediaId).toBe(addByRssPlaybackMediaId(resourceData));
    expect(row?.playable).not.toBe(false);
  });

  it('maps a redacted add-by-RSS history row as a title without playback', () => {
    const row = queueResourceToHomeRow(
      buildResource({
        add_by_rss_hash_id: 'rss-private-history',
        id: 9,
        is_add_by_rss_redacted: true,
        item: null,
        item_id: null,
      }),
      'history',
      { addByRssPrivateTitle: 'Private Add-by-RSS Item' }
    );

    expect(row).not.toBeNull();
    expect(row?.title).toBe('Private Add-by-RSS Item');
    expect(row?.playbackMediaId).toBeUndefined();
    expect(row?.playable).toBe(false);
  });

  it('maps redacted add-by-RSS rows with the provided localized placeholder', () => {
    const row = queueResourceToHomeRow(
      buildResource({
        add_by_rss_hash_id: 'rss-private-1',
        id: 5,
        is_add_by_rss_redacted: true,
        item: null,
        item_id: null,
      }),
      'queue',
      { addByRssPrivateTitle: 'Private Add-by-RSS Item' }
    );

    expect(row).not.toBeNull();
    expect(row?.title).toBe('Private Add-by-RSS Item');
    expect(row?.imageUrl).toBeNull();
    expect(row?.subtitle).toBeNull();
  });

  it('keeps history behavior unchanged for non-item resources', () => {
    const row = queueResourceToHomeRow(
      buildResource({
        clip: {
          id_text: 'clip-2',
          item: buildItem({ id_text: 'clip-item-2', title: 'Clip item two' }),
          title: 'Clip title two',
        },
        clip_id: 12,
        id: 6,
        item: null,
        item_id: null,
      }),
      'history'
    );

    expect(row).toBeNull();
  });

  it('returns null for unusable resources with no item source', () => {
    const row = queueResourceToHomeRow(
      buildResource({
        id: 7,
        item: null,
        item_id: null,
      }),
      'queue'
    );

    expect(row).toBeNull();
  });
});

describe('clipToHomeRow', () => {
  const clip = {
    end_time: '125',
    id_text: 'clip-1',
    item: buildItem({
      id_text: 'clip-item-1',
      item_images: [
        {
          id: 1,
          image_width_size: 300,
          is_resized: true,
          item_id: 1,
          url: 'https://example.com/episode.jpg',
        },
      ],
      title: 'Clip source item',
    }),
    start_time: '65',
    title: 'Clip title',
  };

  it('names the podcast and the episode on a mixed-source list', () => {
    const row = clipToHomeRow(clip, { showChannelInfo: true, showItemInfo: true });

    expect(row.title).toBe('Clip title');
    expect(row.subtitle).toBe('Test channel • Clip source item');
    expect(row.imageUrl).toBe('https://example.com/episode.jpg');
    expect(row.duration).toBeNull();
    expect(row.clipStartTime).toBe('65');
    expect(row.clipEndTime).toBe('125');
  });

  it('names only the episode when the screen is already a podcast', () => {
    const row = clipToHomeRow(clip, { showItemInfo: true });

    expect(row.subtitle).toBe('Clip source item');
  });

  it('omits parent titles when the screen is already the episode', () => {
    const row = clipToHomeRow(clip);

    expect(row.subtitle).toBeNull();
    expect(row.title).toBe('Clip title');
  });

  it('formats the clip start–end range instead of the episode duration', () => {
    expect(
      clipListTimeRangeLabel('65', '125', (timeStart, timeEnd) => `${timeStart} to ${timeEnd}`)
    ).toBe('1:05 to 2:05');
  });

  it('maps a clip whose source item is missing', () => {
    const row = clipToHomeRow({
      id_text: 'clip-orphan',
      title: 'Orphan clip',
    });

    expect(row.id).toBe('clip-orphan');
    expect(row.title).toBe('Orphan clip');
    expect(row.subtitle).toBeNull();
    expect(row.description).toBeNull();
    expect(row.imageUrl).toBeNull();
  });

  it('shows snapshot titles for a removed clip and does not mark it playable', () => {
    const row = clipToHomeRow(
      {
        id_text: 'clip-removed',
        removed_source: {
          channel_title: 'E2E Removed Show',
          item_title: 'E2E Removed Episode',
          kind: 'item',
          pub_date: null,
          soundbite_title: null,
        },
        source_removed_at: '2026-01-02T00:00:00.000Z',
        title: 'E2E Removed Clip',
      },
      { showChannelInfo: true, showItemInfo: true }
    );

    expect(row.title).toBe('E2E Removed Clip');
    expect(row.subtitle).toBe('E2E Removed Episode • E2E Removed Show');
    expect(row.imageUrl).toBeNull();
    expect(row.playable).toBe(false);
    expect(row.removed).toBe(true);
  });

  it('keeps a cached clip that omits removed fields on the existing item path', () => {
    const source = clipHomeRowSourceFromUnknown({
      end_time: '2',
      id_text: 'clip-old',
      item: {
        channel: { title: 'Show' },
        id_text: 'item-1',
        item_images: [],
        title: 'Episode',
      },
      start_time: '1',
      title: 'Old clip',
    });

    expect(source).not.toBeNull();
    if (source === null) {
      return;
    }
    expect(source.source_removed_at).toBeUndefined();
    const row = clipToHomeRow(source, { showChannelInfo: true, showItemInfo: true });
    expect(row.title).toBe('Old clip');
    expect(row.subtitle).toBe('Show • Episode');
    expect(row.removed).toBeUndefined();
    expect(row.playable).toBeUndefined();
  });
});

describe('playlistResourceToHomeRow', () => {
  it('maps item resources', () => {
    const row = playlistResourceToHomeRow(buildPlaylistResource());

    expect(row).not.toBeNull();
    expect(row?.title).toBe('Test episode');
    expect(row?.subtitle).toBe('Test channel');
    expect(row?.mediaType).toBe('episodes');
  });

  it('maps clip resources', () => {
    const row = playlistResourceToHomeRow(
      buildPlaylistResource({
        clip: {
          id_text: 'clip-1',
          item: buildItem({ id_text: 'clip-item-1', title: 'Clip source item' }),
          title: 'Clip title',
        },
        clip_id: 22,
        id: 2,
        item: null,
        item_id: null,
      })
    );

    expect(row).not.toBeNull();
    expect(row?.id).toBe('clip-clip-1');
    expect(row?.mediaType).toBe('clips');
    expect(row?.title).toBe('Clip title');
    expect(row?.subtitle).toBe('Test channel • Clip source item');
  });

  it('maps soundbite resources', () => {
    const row = playlistResourceToHomeRow(
      buildPlaylistResource({
        id: 3,
        item: null,
        item_id: null,
        item_soundbite: {
          duration: '31',
          id_text: 'soundbite-1',
          item: buildItem({ id_text: 'soundbite-item-1', title: 'Soundbite source item' }),
          title: 'Soundbite title',
        },
        item_soundbite_id: 7,
      })
    );

    expect(row).not.toBeNull();
    expect(row?.id).toBe('soundbite-soundbite-1');
    expect(row?.mediaType).toBe('clips');
    expect(row?.title).toBe('Soundbite title');
  });

  it('maps add-by-RSS resources from resource data', () => {
    const row = playlistResourceToHomeRow(
      buildPlaylistResource({
        add_by_rss_hash_id: 'rss-1',
        add_by_rss_resource_data: {
          channel_title: 'RSS channel',
          duration: 77,
          item_images: [{ image_width_size: 300, is_resized: false, url: 'https://example.com/a' }],
          medium_id: 4,
          pub_date: '2026-04-01T00:00:00.000Z',
          title: 'RSS episode',
        },
        id: 4,
        item: null,
        item_id: null,
      })
    );

    expect(row).not.toBeNull();
    expect(row?.id).toBe('add-by-rss-4');
    expect(row?.title).toBe('RSS episode');
    expect(row?.subtitle).toBe('RSS channel');
    expect(row?.duration).toBe('77');
    expect(row?.mediaType).toBe('tracks');
  });

  it('maps redacted add-by-RSS resources with localized placeholder text', () => {
    const row = playlistResourceToHomeRow(
      buildPlaylistResource({
        add_by_rss_hash_id: 'rss-private-1',
        id: 5,
        is_add_by_rss_redacted: true,
        item: null,
        item_id: null,
      }),
      { addByRssPrivateTitle: 'Private Add-by-RSS Item' }
    );

    expect(row).not.toBeNull();
    expect(row?.id).toBe('add-by-rss-5');
    expect(row?.title).toBe('Private Add-by-RSS Item');
    expect(row?.imageUrl).toBeNull();
  });

  it('keeps a removed item entry with its snapshot title and the removed label slot', () => {
    const row = playlistResourceToHomeRow(
      buildPlaylistResource({
        id: 9,
        item: null,
        item_id: null,
        removed_source: {
          channel_title: 'Gone show',
          item_title: 'Gone episode',
          kind: 'item',
          pub_date: null,
          soundbite_title: null,
        },
        source_removed_at: '2026-01-02T00:00:00.000Z',
      }),
      { playlistEntryRemovedLabel: 'This item was removed from Podverse Next.' }
    );

    expect(row).not.toBeNull();
    expect(row?.title).toBe('Gone episode');
    expect(row?.subtitle).toBe('Gone show');
    expect(row?.imageUrl).toBeNull();
    expect(row?.playable).toBe(false);
    expect(row?.removed).toBe(true);
  });

  it('uses the removed-entry label when a removed row has no snapshot title', () => {
    const row = playlistResourceToHomeRow(
      buildPlaylistResource({
        id: 10,
        item: null,
        item_id: null,
        removed_source: {
          channel_title: null,
          item_title: null,
          kind: 'soundbite',
          pub_date: null,
          soundbite_title: null,
        },
        source_removed_at: '2026-01-02T00:00:00.000Z',
      }),
      { playlistEntryRemovedLabel: 'This item was removed from Podverse Next.' }
    );

    expect(row?.title).toBe('This item was removed from Podverse Next.');
    expect(row?.playable).toBe(false);
  });

  it('returns null for unusable resources', () => {
    const row = playlistResourceToHomeRow(
      buildPlaylistResource({
        id: 6,
        item: null,
        item_id: null,
      })
    );

    expect(row).toBeNull();
  });
});
