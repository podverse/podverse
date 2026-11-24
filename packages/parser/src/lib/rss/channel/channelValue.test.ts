import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  channelValueUpdateMock,
  channelValueUpdateManyMock,
  channelValueDeleteAllMock,
  channelValueRecipientUpdateMock,
  channelValueRecipientUpdateManyMock,
  compatChannelValueDtosMock,
} = vi.hoisted(() => ({
  channelValueUpdateMock: vi.fn(),
  channelValueUpdateManyMock: vi.fn(),
  channelValueDeleteAllMock: vi.fn(),
  channelValueRecipientUpdateMock: vi.fn(),
  channelValueRecipientUpdateManyMock: vi.fn(),
  compatChannelValueDtosMock: vi.fn(),
}));

vi.mock('@parser/factories/timerManager.js', () => ({
  timerManager: {
    start: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock('@podverse/orm', () => ({
  Channel: class Channel {
    id = 0;
  },
  ChannelValueService: class {
    update = channelValueUpdateMock;
    updateMany = channelValueUpdateManyMock;
    deleteAll = channelValueDeleteAllMock;
  },
  ChannelValueRecipientService: class {
    update = channelValueRecipientUpdateMock;
    updateMany = channelValueRecipientUpdateManyMock;
  },
}));

vi.mock('@podverse/parser-mapping', () => ({
  compatChannelValueDtos: compatChannelValueDtosMock,
}));

import type { FeedObject } from 'podverse-partytime/core';

import { Channel } from '@podverse/orm';

import { handleParsedChannelValue } from './channelValue.js';

type ValueHeader = { type: string; method: string; suggested: number | null };

function testChannel(): Channel {
  const channel = new Channel();
  channel.id = 7;
  return channel;
}

function ignoredFeed(): FeedObject {
  // The mapper is mocked. The handler forwards this object and does not read it.
  return { title: 'ignored' } as FeedObject;
}

function expectSingleRowUpdatesUnused(): void {
  expect(channelValueUpdateMock).not.toHaveBeenCalled();
  expect(channelValueRecipientUpdateMock).not.toHaveBeenCalled();
}

describe('handleParsedChannelValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelValueUpdateManyMock.mockImplementation(async (_channel: unknown, dtos: ValueHeader[]) =>
      dtos.map((dto, index) => ({ id: index + 1, ...dto }))
    );
  });

  it('replaces value rows and updates an empty recipient list without deleting the channel', async () => {
    const channel = testChannel();
    const lightning = {
      channel_value: { type: 'lightning', method: 'keysend', suggested: 1000 },
      channel_value_recipients: [
        {
          type: 'node',
          address: 'node-a',
          split: 100,
          name: null,
          custom_key: null,
          custom_value: null,
          fee: false,
        },
      ],
    };
    const paypal = {
      channel_value: { type: 'paypal', method: 'send', suggested: null },
      channel_value_recipients: [],
    };
    compatChannelValueDtosMock.mockReturnValue([lightning, paypal]);

    await handleParsedChannelValue(ignoredFeed(), channel);

    expect(channelValueUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(channelValueUpdateManyMock).toHaveBeenCalledWith(channel, [
      lightning.channel_value,
      paypal.channel_value,
    ]);
    expect(channelValueDeleteAllMock).not.toHaveBeenCalled();
    expect(channelValueRecipientUpdateManyMock).toHaveBeenCalledTimes(2);
    expect(channelValueRecipientUpdateManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'lightning', method: 'keysend' }),
      lightning.channel_value_recipients
    );
    expect(channelValueRecipientUpdateManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'paypal', method: 'send' }),
      []
    );
    expectSingleRowUpdatesUnused();
  });

  it('deletes every channel value when the mapper returns no blocks', async () => {
    const channel = testChannel();
    compatChannelValueDtosMock.mockReturnValue([]);

    await handleParsedChannelValue(ignoredFeed(), channel);

    expect(channelValueDeleteAllMock).toHaveBeenCalledTimes(1);
    expect(channelValueDeleteAllMock).toHaveBeenCalledWith(channel);
    expect(channelValueUpdateManyMock).not.toHaveBeenCalled();
    expect(channelValueRecipientUpdateManyMock).not.toHaveBeenCalled();
    expectSingleRowUpdatesUnused();
  });
});
