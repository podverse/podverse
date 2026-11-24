import { describe, expect, it } from 'vitest';

import type {
  Episode,
  FeedObject,
  Phase4Value,
  Phase4ValueRecipient,
} from '../../types/partytime.js';
import { compatChannelValueDtos } from './channel.js';
import { compatItemValueDtos } from './item.js';

type Surface = 'channel' | 'item';

type MappedBlock = {
  type: string;
  method: string;
  suggested: number | null;
  recipients: Array<{
    type: string;
    address: string;
    split: number;
    custom_key: string | null;
    custom_value: string | null;
  }>;
};

function recipient(
  type: string,
  address: string,
  split = 100,
  extras: Partial<Pick<Phase4ValueRecipient, 'customKey' | 'customValue'>> = {}
): Phase4ValueRecipient {
  return {
    type,
    address,
    split,
    fee: false,
    ...extras,
  };
}

function phaseValue(
  type: string,
  method: string,
  recipients: Phase4ValueRecipient[],
  valueTimeSplits?: Phase4Value['valueTimeSplits']
): Phase4Value {
  return {
    type,
    method,
    recipients,
    ...(valueTimeSplits === undefined ? {} : { valueTimeSplits }),
  };
}

function feed(values: Phase4Value[]): FeedObject {
  return {
    title: 'Feed',
    explicit: false,
    link: 'https://example.com/feed',
    items: [],
    values,
  };
}

function episode(values: Phase4Value[]): Episode {
  return {
    guid: 'episode-1',
    enclosure: {
      url: 'https://example.com/episode.mp3',
      type: 'audio/mpeg',
      length: 1,
    },
    duration: 60,
    explicit: false,
    values,
  };
}

function mappedBlocks(surface: Surface, values: Phase4Value[]): MappedBlock[] {
  if (surface === 'channel') {
    return compatChannelValueDtos(feed(values)).map((dto) => ({
      type: dto.channel_value.type,
      method: dto.channel_value.method,
      suggested: dto.channel_value.suggested,
      recipients: dto.channel_value_recipients,
    }));
  }

  return compatItemValueDtos(episode(values)).map((dto) => ({
    type: dto.item_value.type,
    method: dto.item_value.method,
    suggested: dto.item_value.suggested,
    recipients: dto.item_value_recipients,
  }));
}

describe.each(['channel', 'item'] as const)('compat %s value dtos', (surface) => {
  it('keeps a node-only lightning value on the feed method', () => {
    const blocks = mappedBlocks(surface, [
      phaseValue('lightning', 'keysend', [recipient('node', 'node-a')]),
    ]);

    expect(blocks).toEqual([
      {
        type: 'lightning',
        method: 'keysend',
        suggested: null,
        recipients: [expect.objectContaining({ type: 'node', address: 'node-a', split: 100 })],
      },
    ]);
  });

  it('stores an lnaddress-only lightning value as method lnaddress', () => {
    const blocks = mappedBlocks(surface, [
      phaseValue('lightning', 'keysend', [recipient('lnaddress', 'pod@getalby.com')]),
    ]);

    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'lightning',
        method: 'lnaddress',
        recipients: [expect.objectContaining({ type: 'lnaddress', address: 'pod@getalby.com' })],
      }),
    ]);
  });

  it('splits mixed lightning recipients and does not relabel node', () => {
    const blocks = mappedBlocks(surface, [
      phaseValue('lightning', 'keysend', [
        recipient('node', 'node-a', 40),
        recipient('lnaddress', 'pod@getalby.com', 60),
      ]),
    ]);

    expect(blocks.map((block) => block.method)).toEqual(['lnaddress', 'keysend']);
    expect(blocks[0]?.recipients).toEqual([
      expect.objectContaining({ type: 'lnaddress', address: 'pod@getalby.com', split: 60 }),
    ]);
    expect(blocks[1]?.recipients).toEqual([
      expect.objectContaining({ type: 'node', address: 'node-a', split: 40 }),
    ]);
  });

  it.each([
    ['paypal', 'payer@example.com'],
    ['patreon', 'patron-id'],
    ['buymeacoffee', 'coffee-id'],
  ] as const)(
    'splits lightning beside a %s block and leaves that block unchanged',
    (extraType, address) => {
      const blocks = mappedBlocks(surface, [
        phaseValue('lightning', 'keysend', [
          recipient('lnaddress', 'pod@getalby.com'),
          recipient('node', 'node-a'),
        ]),
        phaseValue(extraType, 'send', [recipient(extraType, address)]),
      ]);

      expect(blocks).toHaveLength(3);
      expect(
        blocks.filter((block) => block.type === 'lightning').map((block) => block.method)
      ).toEqual(['lnaddress', 'keysend']);
      expect(blocks.find((block) => block.type === extraType)).toMatchObject({
        type: extraType,
        method: 'send',
        recipients: [expect.objectContaining({ type: extraType, address })],
      });
      const lightningAddresses = blocks
        .filter((block) => block.type === 'lightning')
        .flatMap((block) => block.recipients.map((row) => row.address));
      expect(lightningAddresses).not.toContain(address);
    }
  );

  it('merges two keysend lightning values into one block', () => {
    const blocks = mappedBlocks(surface, [
      phaseValue('lightning', 'keysend', [recipient('node', 'node-a', 50)]),
      phaseValue('lightning', 'keysend', [recipient('node', 'node-b', 50)]),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'lightning', method: 'keysend' });
    expect(blocks[0]?.recipients?.map((row) => row.address)).toEqual(['node-a', 'node-b']);
  });

  it('keeps the earlier split when a later recipient has the same identity', () => {
    const blocks = mappedBlocks(surface, [
      phaseValue('lightning', 'keysend', [
        recipient('node', 'node-a', 60, { customKey: 'k', customValue: 'v' }),
      ]),
      phaseValue('lightning', 'keysend', [
        recipient('node', 'node-a', 10, { customKey: 'k', customValue: 'v' }),
        recipient('node', 'node-a', 25, { customKey: 'other', customValue: 'v' }),
      ]),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.recipients).toEqual([
      expect.objectContaining({
        type: 'node',
        address: 'node-a',
        split: 60,
        custom_key: 'k',
        custom_value: 'v',
      }),
      expect.objectContaining({
        type: 'node',
        address: 'node-a',
        split: 25,
        custom_key: 'other',
        custom_value: 'v',
      }),
    ]);
  });
});

describe('compatItemValueDtos time splits', () => {
  it('copies a recipient time split onto each block of a split lightning value', () => {
    const blocks = compatItemValueDtos(
      episode([
        phaseValue(
          'lightning',
          'keysend',
          [recipient('lnaddress', 'pod@getalby.com'), recipient('node', 'node-a')],
          [
            {
              type: 'recipients',
              startTime: 10,
              duration: 20,
              recipients: [recipient('node', 'split-node')],
            },
          ]
        ),
      ])
    );

    expect(blocks.map((block) => block.item_value.method)).toEqual(['lnaddress', 'keysend']);
    for (const block of blocks) {
      expect(block.item_value_time_splits).toEqual([
        expect.objectContaining({
          meta: expect.objectContaining({ start_time: '10.00', duration: '20.00' }),
          item_value_time_splits_recipients: [
            expect.objectContaining({ type: 'node', address: 'split-node' }),
          ],
        }),
      ]);
    }
  });
});
