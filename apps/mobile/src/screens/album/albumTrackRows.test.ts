import { describe, expect, it } from 'vitest';

import { LiveItemStatusEnum } from '@podverse/helpers';
import type { DTOItem, DTOLiveItem } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';

import { isAlbumLivestreamRow, toAlbumTrackRows } from './albumTrackRows';

type ItemFixture = {
  channel: { id_text?: string; medium_id?: MediumEnum; title: string };
  description?: string;
  id_text: string;
  live_item?: DTOLiveItem;
  pub_date?: string;
  title: string;
};

const liveItem = (statusId: LiveItemStatusEnum, startTime: string): DTOLiveItem => ({
  id: 1,
  item_id: 1,
  live_item_status: { id: statusId },
  live_item_status_id: statusId,
  start_time: startTime,
});

const itemFixture = (fixture: ItemFixture): DTOItem => ({
  channel: {
    feed_id: 1,
    has_value_time_splits: false,
    id: 1,
    id_text: fixture.channel.id_text ?? '',
    medium_id: fixture.channel.medium_id ?? MediumEnum.Podcast,
    podcast_guid: null,
    slug: null,
    sortable_title: null,
    title: fixture.channel.title,
  },
  channel_id: 1,
  id: 1,
  id_text: fixture.id_text,
  item_about: { id: 1, item_id: 1 },
  item_chat: { id: 1, item_id: 1, server: '' },
  item_content_links: [],
  item_description:
    fixture.description === undefined
      ? undefined
      : { id: 1, item_id: 1, value: fixture.description },
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
  live_item: fixture.live_item ?? null,
  pub_date: fixture.pub_date,
  title: fixture.title,
});

describe('toAlbumTrackRows', () => {
  it('keeps an ordinary track compact and carries the album', () => {
    const rows = toAlbumTrackRows(
      [
        itemFixture({
          channel: { title: 'Channel Title' },
          description: '<p>A liner note.</p>',
          id_text: 'tr-1',
          pub_date: '2026-03-04T12:00:00.000Z',
          title: 'Track One',
        }),
      ],
      'album-1',
      'The Album'
    );

    expect(rows).toEqual([
      {
        channelId: 'album-1',
        channelKind: 'albums',
        id: 'tr-1',
        imageUrl: null,
        subtitle: 'The Album',
        title: 'Track One',
      },
    ]);
    const row = rows[0];
    expect(row).not.toHaveProperty('updatedAt');
    expect(row).not.toHaveProperty('description');
    expect(row !== undefined && isAlbumLivestreamRow(row)).toBe(false);
  });

  it('gives a livestream the full item row a podcast livestream gets', () => {
    const rows = toAlbumTrackRows(
      [
        itemFixture({
          channel: {
            id_text: 'album-9',
            medium_id: MediumEnum.Music,
            title: 'Nested Album',
          },
          description: '<p>A weekly look at the news.</p>',
          id_text: 'live-1',
          live_item: liveItem(LiveItemStatusEnum.Live, '2026-06-01T15:00:00.000Z'),
          pub_date: '2026-03-04T12:00:00.000Z',
          title: 'On the Air',
        }),
      ],
      'album-1',
      'The Album'
    );

    const row = rows[0];
    expect(row?.liveStatusId).toBe(LiveItemStatusEnum.Live);
    expect(row?.updatedAt).toBe('2026-03-04T12:00:00.000Z');
    expect(row?.description).toBe('A weekly look at the news.');
    expect(row?.subtitle).toBe('Nested Album');
    expect(row).not.toHaveProperty('channelId');
    expect(row).not.toHaveProperty('channelKind');
    expect(row !== undefined && isAlbumLivestreamRow(row)).toBe(true);
  });

  it('dates a livestream with no publish date by its start time', () => {
    const startTime = '2026-06-01T15:00:00.000Z';
    const rows = toAlbumTrackRows(
      [
        itemFixture({
          channel: { title: 'Nested Album' },
          id_text: 'live-2',
          live_item: liveItem(LiveItemStatusEnum.Pending, startTime),
          title: 'Scheduled',
        }),
      ],
      'album-1',
      'The Album'
    );

    expect(rows[0]?.updatedAt).toBe(Date.parse(startTime));
  });

  it('drops an item with an empty id', () => {
    const rows = toAlbumTrackRows(
      [
        itemFixture({
          channel: { title: 'Nested Album' },
          id_text: '',
          title: 'Missing',
        }),
      ],
      'album-1',
      'The Album'
    );

    expect(rows).toEqual([]);
  });
});
