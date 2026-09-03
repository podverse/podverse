import { describe, expect, it } from 'vitest';

import { LiveItemStatusEnum } from '@podverse/helpers/dto';

import {
  isBroadcastingNow,
  LIVE_STATUS_MAX_AGE_MS,
  readAddByRssLiveStatus,
  selectBroadcastingKeys,
  toChannelLiveStatuses,
} from './channelLiveStatus';

const NOW = 1_800_000_000_000;

const liveItem = (channelIdText: string, statusId: LiveItemStatusEnum) => ({
  channel: { id_text: channelIdText },
  live_item: { live_item_status_id: statusId },
});

describe('isBroadcastingNow', () => {
  it('is true only for a recent live status', () => {
    expect(
      isBroadcastingNow({ statusId: LiveItemStatusEnum.Live, updatedAtMs: NOW - 1000 }, NOW)
    ).toBe(true);
  });

  it('treats a scheduled show as not broadcasting', () => {
    expect(
      isBroadcastingNow({ statusId: LiveItemStatusEnum.Pending, updatedAtMs: NOW - 1000 }, NOW)
    ).toBe(false);
  });

  it('stops believing a live status once it is past the trust window', () => {
    const stale = NOW - LIVE_STATUS_MAX_AGE_MS;
    expect(isBroadcastingNow({ statusId: LiveItemStatusEnum.Live, updatedAtMs: stale }, NOW)).toBe(
      false
    );
    expect(
      isBroadcastingNow({ statusId: LiveItemStatusEnum.Live, updatedAtMs: stale + 1 }, NOW)
    ).toBe(true);
  });
});

describe('selectBroadcastingKeys', () => {
  it('keeps only the subscriptions on the air right now', () => {
    const keys = selectBroadcastingKeys(
      [
        {
          kind: 'channel',
          statusId: LiveItemStatusEnum.Live,
          subscriptionKey: 'on-air',
          updatedAtMs: NOW - 1000,
        },
        {
          kind: 'channel',
          statusId: LiveItemStatusEnum.Live,
          subscriptionKey: 'stale',
          updatedAtMs: NOW - LIVE_STATUS_MAX_AGE_MS - 1,
        },
        {
          kind: 'add-by-rss',
          statusId: LiveItemStatusEnum.Ended,
          subscriptionKey: 'finished',
          updatedAtMs: NOW,
        },
      ],
      NOW
    );

    expect([...keys]).toEqual(['on-air']);
  });
});

describe('toChannelLiveStatuses', () => {
  it('collapses several live items to one status per channel, strongest winning', () => {
    const statuses = toChannelLiveStatuses([
      liveItem('channel-a', LiveItemStatusEnum.Pending),
      liveItem('channel-a', LiveItemStatusEnum.Live),
      liveItem('channel-b', LiveItemStatusEnum.Pending),
    ]);

    expect(statuses.get('channel-a')).toEqual({
      kind: 'channel',
      statusId: LiveItemStatusEnum.Live,
      subscriptionKey: 'channel-a',
    });
    expect(statuses.get('channel-b')?.statusId).toBe(LiveItemStatusEnum.Pending);
  });

  it('does not let a weaker item later in the response downgrade a channel', () => {
    const statuses = toChannelLiveStatuses([
      liveItem('channel-a', LiveItemStatusEnum.Live),
      liveItem('channel-a', LiveItemStatusEnum.Ended),
    ]);

    expect(statuses.get('channel-a')?.statusId).toBe(LiveItemStatusEnum.Live);
  });

  it('drops items with no channel or no live block rather than guessing', () => {
    const statuses = toChannelLiveStatuses([
      { live_item: { live_item_status_id: LiveItemStatusEnum.Live } },
      { channel: { id_text: 'channel-c' } },
      { channel: { id_text: '   ' }, live_item: { live_item_status_id: LiveItemStatusEnum.Live } },
    ]);

    expect(statuses.size).toBe(0);
  });
});

describe('readAddByRssLiveStatus', () => {
  it('returns the strongest status the bundle declares', () => {
    expect(
      readAddByRssLiveStatus({
        liveItems: [
          { liveItem: { live_item_status: LiveItemStatusEnum.Ended } },
          { liveItem: { live_item_status: LiveItemStatusEnum.Live } },
          { liveItem: { live_item_status: LiveItemStatusEnum.Pending } },
        ],
      })
    ).toBe(LiveItemStatusEnum.Live);
  });

  it('returns null for a bundle with no live items, so the row is cleared', () => {
    expect(readAddByRssLiveStatus({ liveItems: [] })).toBeNull();
    expect(readAddByRssLiveStatus({})).toBeNull();
    expect(readAddByRssLiveStatus(null)).toBeNull();
  });

  it('ignores entries whose status is missing or outside the enum', () => {
    expect(
      readAddByRssLiveStatus({
        liveItems: [
          null,
          { liveItem: null },
          { liveItem: { live_item_status: null } },
          { liveItem: { live_item_status: 99 } },
        ],
      })
    ).toBeNull();
  });
});
