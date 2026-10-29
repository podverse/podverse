import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOItem,
  DTORemoteChannelStub,
  DTORemoteItemStub,
  RemoteItemsResponse,
} from '@podverse/helpers';

import type { RemoteItemListEntry } from './remoteItemListEntries';
import {
  remoteChannelStubKey,
  remoteItemStubKey,
  toRemoteChannelStubEntry,
  toRemoteItemListEntries,
} from './remoteItemListEntries';

const response = (overrides: Partial<RemoteItemsResponse> = {}): RemoteItemsResponse => ({
  channelsAdded: [],
  channelsUnadded: [],
  itemsAdded: [],
  itemsUnadded: [],
  ...overrides,
});

const parsedChannel = (input: {
  author?: string | null;
  id_text: string;
  medium_id?: number;
  title?: string | null;
}): DTOChannel => ({
  feed_id: 1,
  has_podcast_index_value: false,
  has_value_time_splits: false,
  id: 1,
  id_text: input.id_text,
  medium_id: input.medium_id ?? 1,
  podcast_guid: null,
  slug: null,
  sortable_title: null,
  title: input.title === undefined ? 'Channel' : input.title,
  ...(input.author !== undefined
    ? {
        channel_about: {
          author: input.author,
          channel_id: 1,
          episode_count: null,
          explicit: null,
          id: 1,
          itunes_type: null,
          language: null,
          last_pub_date: null,
          website_link_url: null,
        },
      }
    : {}),
});

const parsedItem = (input: {
  channel?: DTOChannel;
  id_text: string;
  title?: string | null;
}): DTOItem => ({
  channel_id: 1,
  id: 1,
  id_text: input.id_text,
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
  title: input.title === undefined ? 'Item' : input.title,
  ...(input.channel !== undefined ? { channel: input.channel } : {}),
});

const channelStub = (input: {
  author?: string | null;
  image_url?: string | null;
  provider_feed_id: string;
  title?: string | null;
}): DTORemoteChannelStub => ({
  author: input.author === undefined ? null : input.author,
  feed_guid: null,
  feed_url: 'https://example.com/feed.xml',
  image_url: input.image_url === undefined ? null : input.image_url,
  index_provider: 'podcast_index',
  is_remote_stub: true,
  medium_id: null,
  provider_feed_id: input.provider_feed_id,
  title: input.title === undefined ? 'Stub' : input.title,
});

const itemStub = (input: {
  channel_stub: DTORemoteChannelStub;
  image_url?: string | null;
  item_guid: string;
  title?: string | null;
}): DTORemoteItemStub => ({
  channel_stub: input.channel_stub,
  duration_seconds: null,
  image_url: input.image_url === undefined ? null : input.image_url,
  is_remote_stub: true,
  item_guid: input.item_guid,
  provider_item_id: null,
  pub_date: null,
  title: input.title === undefined ? 'Item stub' : input.title,
});

const itemStubEntry = (
  entry: RemoteItemListEntry | undefined
): Extract<RemoteItemListEntry, { kind: 'item_stub' }> => {
  if (entry === undefined || entry.kind !== 'item_stub') {
    throw new Error(`Expected an item stub, received ${entry?.kind ?? 'nothing'}`);
  }
  return entry;
};

describe('toRemoteItemListEntries', () => {
  it('keeps response order: parsed channels, channel stubs, parsed items, then item stubs', () => {
    const parent = parsedChannel({ id_text: 'show', medium_id: 4, title: 'Parent' });
    const entries = toRemoteItemListEntries(
      response({
        channelsAdded: [
          parsedChannel({ author: 'Ann', id_text: 'a', medium_id: 8, title: 'Alpha' }),
          parsedChannel({ id_text: 'b', title: null }),
        ],
        channelsUnadded: [
          channelStub({ author: 'Author', provider_feed_id: '11', title: 'Stub One' }),
          channelStub({ provider_feed_id: '22', title: 'Stub Two' }),
        ],
        itemsAdded: [
          parsedItem({ channel: parent, id_text: 'i1', title: 'Item One' }),
          parsedItem({ id_text: 'i2', title: null }),
        ],
        itemsUnadded: [
          itemStub({
            channel_stub: channelStub({ provider_feed_id: '33', title: 'Feed' }),
            item_guid: 'g1',
            title: 'Track',
          }),
          itemStub({
            channel_stub: channelStub({ provider_feed_id: '44', title: 'Other' }),
            item_guid: 'g2',
            title: 'Item Stub Two',
          }),
        ],
      })
    );

    expect(
      entries.map((entry) => ({ key: entry.key, kind: entry.kind, title: entry.title }))
    ).toEqual([
      { key: 'channel:a', kind: 'channel', title: 'Alpha' },
      { key: 'channel:b', kind: 'channel', title: 'b' },
      { key: 'podcast_index:11', kind: 'channel_stub', title: 'Stub One' },
      { key: 'podcast_index:22', kind: 'channel_stub', title: 'Stub Two' },
      { key: 'item:i1', kind: 'item', title: 'Item One' },
      { key: 'item:i2', kind: 'item', title: 'i2' },
      { key: 'podcast_index:33:g1', kind: 'item_stub', title: 'Track' },
      { key: 'podcast_index:44:g2', kind: 'item_stub', title: 'Item Stub Two' },
    ]);
    expect(entries[0]).toMatchObject({ kind: 'channel', mediumId: 8, subtitle: 'Ann' });
    expect(entries[4]).toMatchObject({ kind: 'item', mediumId: 4, subtitle: 'Parent' });
    expect(entries[5]).toMatchObject({ kind: 'item', mediumId: null, subtitle: null });
  });

  it('skips a parsed row whose id is blank and trims the id it keeps', () => {
    const entries = toRemoteItemListEntries(
      response({
        channelsAdded: [
          parsedChannel({ id_text: '  c1  ', title: 'Kept' }),
          parsedChannel({ id_text: '   ', title: 'Dropped channel' }),
        ],
        itemsAdded: [
          parsedItem({ id_text: '', title: 'Dropped item' }),
          parsedItem({ id_text: ' ep ', title: 'Episode' }),
        ],
      })
    );

    expect(entries.map((entry) => entry.key)).toEqual(['channel:c1', 'item:ep']);
    expect(entries[0]).toMatchObject({ channelIdText: 'c1', kind: 'channel', title: 'Kept' });
    expect(entries[1]).toMatchObject({ itemIdText: 'ep', kind: 'item', title: 'Episode' });
  });

  it('uses stable keys and emits a repeated key once', () => {
    const show = channelStub({ provider_feed_id: '9', title: 'First stub' });
    const repeatedItem = itemStub({
      channel_stub: show,
      item_guid: 'guid-1',
      title: 'First item stub',
    });
    const entries = toRemoteItemListEntries(
      response({
        channelsAdded: [
          parsedChannel({ id_text: 'same', title: 'First channel' }),
          parsedChannel({ id_text: ' same ', title: 'Second channel' }),
        ],
        channelsUnadded: [show, channelStub({ provider_feed_id: '9', title: 'Second stub' })],
        itemsUnadded: [
          repeatedItem,
          itemStub({
            channel_stub: show,
            item_guid: 'guid-1',
            title: 'Second item stub',
          }),
        ],
      })
    );

    expect(entries.map((entry) => entry.key)).toEqual([
      'channel:same',
      remoteChannelStubKey(show),
      remoteItemStubKey(repeatedItem),
    ]);
    expect(entries.map((entry) => entry.title)).toEqual([
      'First channel',
      'First stub',
      'First item stub',
    ]);
    expect(remoteChannelStubKey(show)).toBe('podcast_index:9');
    expect(remoteItemStubKey(repeatedItem)).toBe('podcast_index:9:guid-1');
  });

  it('opens an item stub on its channel stub and falls back to that stub for title and image', () => {
    const show = channelStub({
      image_url: 'https://example.com/show.jpg',
      provider_feed_id: '44',
      title: 'Fallback Show',
    });
    const stub = itemStub({
      channel_stub: show,
      image_url: '  ',
      item_guid: 'ep-9',
      title: '   ',
    });
    const entry = itemStubEntry(toRemoteItemListEntries(response({ itemsUnadded: [stub] }))[0]);

    expect(entry.target).toBe(show);
    expect(entry).toMatchObject({
      imageUrl: 'https://example.com/show.jpg',
      key: 'podcast_index:44:ep-9',
      kind: 'item_stub',
      subtitle: 'Fallback Show',
      title: 'Fallback Show',
    });
  });

  it('treats a blank channel stub title, author, and image as absent', () => {
    const stub = channelStub({
      author: ' ',
      image_url: '',
      provider_feed_id: '5',
      title: '   ',
    });
    const entries = toRemoteItemListEntries(response({ channelsUnadded: [stub] }));

    expect(entries).toEqual([toRemoteChannelStubEntry(stub)]);
    expect(entries[0]).toMatchObject({
      imageUrl: null,
      key: 'podcast_index:5',
      kind: 'channel_stub',
      subtitle: null,
      title: null,
    });
  });

  it('reads mediumId from the channel and from the item channel', () => {
    const album = parsedChannel({ id_text: 'album', medium_id: 8, title: 'Album' });
    const entries = toRemoteItemListEntries(
      response({
        channelsAdded: [album],
        itemsAdded: [
          parsedItem({
            channel: parsedChannel({ id_text: 'parent', medium_id: 4, title: 'Parent' }),
            id_text: 'track',
          }),
          parsedItem({ id_text: 'orphan' }),
        ],
      })
    );

    expect(
      entries.map((entry) =>
        entry.kind === 'channel' || entry.kind === 'item' ? entry.mediumId : null
      )
    ).toEqual([8, 4, null]);
  });

  it('returns an empty list when every array is empty', () => {
    expect(toRemoteItemListEntries(response())).toEqual([]);
  });
});
