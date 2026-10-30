import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(async (): Promise<unknown> => [{ id: 1 }]),
  find: vi.fn(async (): Promise<unknown[]> => []),
}));

vi.mock('@orm/context.js', () => {
  const repository = { find: mocks.find, findOne: vi.fn() };
  return {
    getDataSourceRead: () => ({ getRepository: () => repository }),
    getDataSourceReadWrite: () => ({ getRepository: () => repository, query: mocks.query }),
  };
});

import { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import { RemoteItemStub } from '@orm/entities/remoteStub/remoteItemStub.js';

import type { IndexProviderItem } from '@podverse/helpers';

import { RemoteChannelStubService } from './remoteChannelStub.js';
import { RemoteItemStubService } from './remoteItemStub.js';
import { toDTORemoteChannelStub, toDTORemoteItemStub } from './remoteStubDto.js';

function channelStub(id: number, providerFeedId: string): RemoteChannelStub {
  return Object.assign(new RemoteChannelStub(), {
    id,
    index_provider: 'podcast_index',
    provider_feed_id: providerFeedId,
    feed_guid: '917393e3-1b1e-5cef-ace4-edaa54e1f810',
    feed_url: 'https://example.com/feed.xml',
    title: 'Show',
    author: 'Host',
    image_url: 'https://example.com/art.png',
    medium_id: 2,
  });
}

function itemStub(id: number, channelStubId: number, itemGuid: string): RemoteItemStub {
  return Object.assign(new RemoteItemStub(), {
    id,
    remote_channel_stub_id: channelStubId,
    item_guid: itemGuid,
    provider_item_id: null,
    title: `Episode ${id}`,
    image_url: null,
    pub_date: new Date('2026-01-02T03:04:05.000Z'),
    duration_seconds: 300,
  });
}

function providerItem(overrides: Partial<IndexProviderItem> = {}): IndexProviderItem {
  return {
    indexProvider: 'podcast_index',
    providerFeedId: '920666',
    providerItemId: '123',
    itemGuid: 'episode-1',
    title: 'Episode',
    imageUrl: null,
    pubDate: null,
    durationSeconds: 60,
    ...overrides,
  };
}

describe('RemoteItemStubService.upsertItemStub', () => {
  beforeEach(() => {
    mocks.query.mockClear();
  });

  it('throws without writing when the item belongs to another feed id', async () => {
    await expect(
      new RemoteItemStubService().upsertItemStub(
        channelStub(1, '920666'),
        providerItem({ providerFeedId: '111' })
      )
    ).rejects.toThrow('does not belong to channel stub');
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('throws without writing when the item comes from another provider', async () => {
    const stub = Object.assign(channelStub(1, '920666'), { index_provider: 'other_provider' });

    await expect(new RemoteItemStubService().upsertItemStub(stub, providerItem())).rejects.toThrow(
      'does not belong to channel stub'
    );
    expect(mocks.query).not.toHaveBeenCalled();
  });
});

describe('RemoteItemStubService.getItemStubsForRefs', () => {
  beforeEach(() => {
    mocks.find.mockReset();
    vi.restoreAllMocks();
  });

  it('returns item stubs aligned with refs, each with its channel stub loaded', async () => {
    const first = channelStub(1, '100');
    const second = channelStub(2, '200');
    vi.spyOn(RemoteChannelStubService.prototype, 'getChannelStubsForRefs').mockResolvedValue([
      second,
      null,
      first,
      first,
    ]);
    mocks.find.mockResolvedValue([itemStub(10, 1, 'a'), itemStub(20, 2, 'b')]);

    const result = await new RemoteItemStubService().getItemStubsForRefs([
      { feedGuid: null, feedUrl: 'https://example.com/2.xml', itemGuid: ' b ' },
      { feedGuid: null, feedUrl: 'https://example.com/none.xml', itemGuid: 'a' },
      { feedGuid: null, feedUrl: 'https://example.com/1.xml', itemGuid: 'missing' },
      { feedGuid: null, feedUrl: 'https://example.com/1.xml', itemGuid: 'a' },
    ]);

    expect(result.map((stub) => stub?.id ?? null)).toEqual([20, null, null, 10]);
    expect(result[0]?.remote_channel_stub).toBe(second);
    expect(result[3]?.remote_channel_stub).toBe(first);
    expect(mocks.find).toHaveBeenCalledTimes(1);
  });

  it('skips the item query when no ref has a channel stub', async () => {
    vi.spyOn(RemoteChannelStubService.prototype, 'getChannelStubsForRefs').mockResolvedValue([
      null,
    ]);

    const result = await new RemoteItemStubService().getItemStubsForRefs([
      { feedGuid: null, feedUrl: 'https://example.com/none.xml', itemGuid: 'a' },
    ]);

    expect(result).toEqual([null]);
    expect(mocks.find).not.toHaveBeenCalled();
  });
});

describe('remote stub DTOs', () => {
  it('marks a channel stub as a remote stub and leaves out the database id', () => {
    expect(toDTORemoteChannelStub(channelStub(1, '920666'))).toEqual({
      is_remote_stub: true,
      index_provider: 'podcast_index',
      provider_feed_id: '920666',
      feed_guid: '917393e3-1b1e-5cef-ace4-edaa54e1f810',
      feed_url: 'https://example.com/feed.xml',
      title: 'Show',
      author: 'Host',
      image_url: 'https://example.com/art.png',
      medium_id: 2,
    });
  });

  it('serializes the item pub date as ISO 8601 and nests its channel stub', () => {
    const dto = toDTORemoteItemStub(itemStub(10, 1, 'a'), channelStub(1, '920666'));

    expect(dto.is_remote_stub).toBe(true);
    expect(dto.pub_date).toBe('2026-01-02T03:04:05.000Z');
    expect(dto.channel_stub.is_remote_stub).toBe(true);
    expect(dto.channel_stub.provider_feed_id).toBe('920666');
    expect(
      toDTORemoteItemStub(
        Object.assign(itemStub(11, 1, 'b'), { pub_date: null }),
        channelStub(1, '920666')
      ).pub_date
    ).toBeNull();
  });
});
