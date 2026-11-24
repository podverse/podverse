import { describe, expect, it } from 'vitest';

import type { DTOChannelValue, DTOChannelValueRecipient } from '@podverse/helpers';

import { getBoostEligibilityForContent } from './boostEligibility.js';

const recipient = (type: string): DTOChannelValueRecipient => ({
  address: 'host@example.com',
  custom_key: null,
  custom_value: null,
  fee: false,
  id: 1,
  name: 'Host',
  split: 100,
  type,
});

const channelValue = (type: string, recipientType: string | null): DTOChannelValue => ({
  channel_value_recipients: recipientType === null ? [] : [recipient(recipientType)],
  id: 1,
  method: type === 'paypal' ? 'send' : 'keysend',
  suggested: null,
  type,
});

const itemValue = (type: string, recipientType: string) => ({
  id: 1,
  item_value_recipients: [{ type: recipientType }],
  method: type === 'paypal' ? 'send' : 'keysend',
  suggested: null,
  type,
});

const mbrssV1 = {
  node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
  standard: 'mbrss-v1',
};

const mbV1 = {
  node: 'https://api.example.com/v1/s/mb-v1/boost/abc/',
  standard: 'mb-v1',
};

describe('getBoostEligibilityForContent', () => {
  it('shows the boost action when a channel value row has MetaBoost standard mbrss-v1', () => {
    expect(
      getBoostEligibilityForContent({
        channel: {
          channel_meta_boost: mbrssV1,
          channel_values: [
            {
              channel_value_recipients: [],
              id: 1,
              method: 'keysend',
              suggested: null,
              type: 'lightning',
            },
          ],
          podcast_guid: 'guid-1',
        },
      }).canShowBoostAction
    ).toBe(true);
  });

  it('keeps the boost action and the public message list hidden when a lightning value has no node or lnaddress recipient and no MetaBoost tag', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [
          {
            channel_value_recipients: [],
            id: 1,
            method: 'keysend',
            suggested: null,
            type: 'lightning',
          },
        ],
      },
    });

    expect(result.canShowBoostAction).toBe(false);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('shows the boost action for a lightning node recipient when the channel has no MetaBoost tag', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [channelValue('lightning', 'node')],
      },
    });

    expect(result.canShowBoostAction).toBe(true);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('shows the boost action for a lightning LNAddress recipient when the channel has no MetaBoost tag', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [channelValue('lightning', 'LNAddress')],
      },
    });

    expect(result.canShowBoostAction).toBe(true);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('hides the boost action when a lightning value recipient is PayPal and the channel has no MetaBoost tag', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [channelValue('lightning', 'paypal')],
      },
    });

    expect(result.canShowBoostAction).toBe(false);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('hides the boost action when a PayPal value has a node recipient and the channel has no MetaBoost tag', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [channelValue('paypal', 'node')],
      },
    });

    expect(result.canShowBoostAction).toBe(false);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('shows the boost action and the public message list when a PayPal value row has MetaBoost standard mbrss-v1 and a podcast guid', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_meta_boost: mbrssV1,
        channel_values: [channelValue('paypal', 'paypal')],
        podcast_guid: 'guid-paypal',
      },
    });

    expect(result.canShowBoostAction).toBe(true);
    expect(result.canShowBoostMessagesTab).toBe(true);
  });

  it('shows the boost action for an item lightning node recipient when the channel is missing', () => {
    const result = getBoostEligibilityForContent({
      channel: null,
      itemValues: [itemValue('lightning', 'node')],
    });

    expect(result.canShowBoostAction).toBe(true);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('hides the boost action when that item list is omitted and the channel value list is empty', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [],
      },
    });

    expect(result.canShowBoostAction).toBe(false);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('shows the boost action from the channel lightning node when itemValues is empty and the channel has no MetaBoost tag', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [channelValue('lightning', 'node')],
      },
      itemValues: [],
    });

    expect(result.canShowBoostAction).toBe(true);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('hides the boost action when a non-empty PayPal item list replaces a channel lightning node and the channel has no MetaBoost tag', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_values: [channelValue('lightning', 'node')],
      },
      itemValues: [itemValue('paypal', 'paypal')],
    });

    expect(result.canShowBoostAction).toBe(false);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });

  it('shows the boost action from a channel value row and MetaBoost standard mb-v1 when the item list is PayPal, and keeps the public message list hidden', () => {
    const result = getBoostEligibilityForContent({
      channel: {
        channel_meta_boost: mbV1,
        channel_values: [channelValue('paypal', 'paypal')],
        podcast_guid: 'guid-mb',
      },
      itemValues: [itemValue('paypal', 'paypal')],
    });

    expect(result.canShowBoostAction).toBe(true);
    expect(result.canShowBoostMessagesTab).toBe(false);
  });
});
