import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  itemValueUpdateMock,
  itemValueUpdateManyMock,
  itemValueDeleteAllMock,
  itemValueRecipientUpdateManyMock,
  itemValueTimeSplitUpdateMock,
  itemValueTimeSplitDeleteAllMock,
  itemValueTimeSplitRecipientUpdateMock,
  itemValueTimeSplitRecipientDeleteAllMock,
  itemValueTimeSplitRemoteItemUpdateMock,
  itemValueTimeSplitRemoteItemDeleteAllMock,
  channelUpdateMock,
  compatItemValueDtosMock,
} = vi.hoisted(() => ({
  itemValueUpdateMock: vi.fn(),
  itemValueUpdateManyMock: vi.fn(),
  itemValueDeleteAllMock: vi.fn(),
  itemValueRecipientUpdateManyMock: vi.fn(),
  itemValueTimeSplitUpdateMock: vi.fn(),
  itemValueTimeSplitDeleteAllMock: vi.fn(),
  itemValueTimeSplitRecipientUpdateMock: vi.fn(),
  itemValueTimeSplitRecipientDeleteAllMock: vi.fn(),
  itemValueTimeSplitRemoteItemUpdateMock: vi.fn(),
  itemValueTimeSplitRemoteItemDeleteAllMock: vi.fn(),
  channelUpdateMock: vi.fn(),
  compatItemValueDtosMock: vi.fn(),
}));

vi.mock('@podverse/orm', () => ({
  Channel: class Channel {
    id = 0;
    medium_id = 1;
    has_value_time_splits = true;
  },
  Item: class Item {
    id = 0;
  },
  ChannelService: class {
    update = channelUpdateMock;
  },
  ItemValueService: class {
    update = itemValueUpdateMock;
    updateMany = itemValueUpdateManyMock;
    deleteAll = itemValueDeleteAllMock;
  },
  ItemValueRecipientService: class {
    updateMany = itemValueRecipientUpdateManyMock;
  },
  ItemValueTimeSplitService: class {
    update = itemValueTimeSplitUpdateMock;
    deleteAll = itemValueTimeSplitDeleteAllMock;
  },
  ItemValueTimeSplitRecipientService: class {
    update = itemValueTimeSplitRecipientUpdateMock;
    deleteAll = itemValueTimeSplitRecipientDeleteAllMock;
  },
  ItemValueTimeSplitRemoteItemService: class {
    update = itemValueTimeSplitRemoteItemUpdateMock;
    deleteAll = itemValueTimeSplitRemoteItemDeleteAllMock;
  },
}));

vi.mock('@podverse/parser-mapping', () => ({
  compatItemValueDtos: compatItemValueDtosMock,
}));

import type { Episode } from 'podverse-partytime/core';

import { Channel, Item } from '@podverse/orm';

import { handleParsedItemValue } from './itemValue.js';

type ValueHeader = { type: string; method: string; suggested: number | null };

function testChannel(): Channel {
  const channel = new Channel();
  channel.id = 7;
  channel.medium_id = 1;
  channel.has_value_time_splits = true;
  return channel;
}

function testItem(): Item {
  const item = new Item();
  item.id = 9;
  return item;
}

function ignoredEpisode(): Episode {
  // The mapper is mocked. The handler forwards this object and does not read it.
  return { guid: 'ignored' } as Episode;
}

describe('handleParsedItemValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemValueUpdateManyMock.mockImplementation(async (_item: unknown, dtos: ValueHeader[]) =>
      dtos.map((dto, index) => ({ id: index + 1, ...dto }))
    );
    itemValueTimeSplitUpdateMock.mockResolvedValue({ id: 3 });
  });

  it('updates the value row, recipients, and time splits', async () => {
    const channel = testChannel();
    const item = testItem();
    const recipients = [
      {
        type: 'node',
        address: 'node-a',
        split: 100,
        name: null,
        custom_key: null,
        custom_value: null,
        fee: false,
      },
    ];
    const timeSplit = {
      meta: {
        start_time: '10.00',
        duration: '20.00',
        remote_start_time: '0.00',
        remote_percentage: '100.00',
      },
      item_value_time_splits_recipients: recipients,
      item_value_time_splits_remote_item: null,
    };
    const block = {
      item_value: { type: 'lightning', method: 'keysend', suggested: 500 },
      item_value_recipients: recipients,
      item_value_time_splits: [timeSplit],
    };
    compatItemValueDtosMock.mockReturnValue([block]);

    await handleParsedItemValue(ignoredEpisode(), item, channel);

    expect(itemValueUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(itemValueUpdateManyMock).toHaveBeenCalledWith(item, [block.item_value]);
    expect(itemValueDeleteAllMock).not.toHaveBeenCalled();
    expect(itemValueUpdateMock).not.toHaveBeenCalled();
    expect(itemValueRecipientUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lightning', method: 'keysend' }),
      recipients
    );
    expect(itemValueTimeSplitUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lightning', method: 'keysend' }),
      timeSplit.meta
    );
    expect(itemValueTimeSplitRecipientUpdateMock).toHaveBeenCalledWith({ id: 3 }, recipients[0]);
    expect(channelUpdateMock).not.toHaveBeenCalled();
  });

  it('updates an empty recipient list without deleting the item values', async () => {
    const channel = testChannel();
    const item = testItem();
    const block = {
      item_value: { type: 'lightning', method: 'keysend', suggested: null },
      item_value_recipients: [],
      item_value_time_splits: [],
    };
    compatItemValueDtosMock.mockReturnValue([block]);

    await handleParsedItemValue(ignoredEpisode(), item, channel);

    expect(itemValueDeleteAllMock).not.toHaveBeenCalled();
    expect(itemValueRecipientUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(itemValueRecipientUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lightning', method: 'keysend' }),
      []
    );
    expect(itemValueTimeSplitDeleteAllMock).toHaveBeenCalledTimes(1);
  });

  it('deletes every item value when the mapper returns no blocks', async () => {
    const channel = testChannel();
    const item = testItem();
    compatItemValueDtosMock.mockReturnValue([]);

    await handleParsedItemValue(ignoredEpisode(), item, channel);

    expect(itemValueDeleteAllMock).toHaveBeenCalledTimes(1);
    expect(itemValueDeleteAllMock).toHaveBeenCalledWith(item);
    expect(itemValueUpdateManyMock).not.toHaveBeenCalled();
    expect(itemValueRecipientUpdateManyMock).not.toHaveBeenCalled();
    expect(itemValueTimeSplitUpdateMock).not.toHaveBeenCalled();
    expect(itemValueTimeSplitDeleteAllMock).not.toHaveBeenCalled();
  });
});
