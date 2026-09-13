import { describe, expect, it } from 'vitest';

import { groupUnsubscribedDownloadChannels } from './unsubscribedDownloadChannels';
import type { UnsubscribedDownloadSourceRow } from './unsubscribedDownloadChannels';

const row = (
  itemIdText: string,
  channelIdText: string | null,
  extras: Partial<UnsubscribedDownloadSourceRow> = {}
): UnsubscribedDownloadSourceRow => ({
  artworkUrl: extras.artworkUrl ?? null,
  channelIdText,
  channelTitle: extras.channelTitle ?? null,
  itemIdText,
});

describe('groupUnsubscribedDownloadChannels', () => {
  it('keeps a channel that is not subscribed and counts its completed rows', () => {
    const grouped = groupUnsubscribedDownloadChannels(
      [
        row('ep-1', 'twib', { artworkUrl: 'art-1', channelTitle: 'This Week in Bitcoin' }),
        row('ep-2', 'twib', { channelTitle: 'This Week in Bitcoin' }),
      ],
      new Set(['other']),
      new Map()
    );

    expect(grouped).toEqual([
      {
        channelIdText: 'twib',
        downloadedCount: 2,
        imageUrl: 'art-1',
        title: 'This Week in Bitcoin',
      },
    ]);
  });

  it('omits a channel the user already follows', () => {
    const grouped = groupUnsubscribedDownloadChannels(
      [row('ep-1', 'subscribed')],
      new Set(['subscribed']),
      new Map()
    );

    expect(grouped).toEqual([]);
  });

  it('resolves a missing channel id from the channel_item hint so older rows still appear', () => {
    const grouped = groupUnsubscribedDownloadChannels(
      [row('ep-1', null, { artworkUrl: 'ep-art' })],
      new Set(),
      new Map([['ep-1', { channelIdText: 'twib', imageUrl: 'channel-art' }]])
    );

    expect(grouped).toEqual([
      {
        channelIdText: 'twib',
        downloadedCount: 1,
        imageUrl: 'ep-art',
        title: 'twib',
      },
    ]);
  });

  it('uses the hint artwork when the download row has none', () => {
    const grouped = groupUnsubscribedDownloadChannels(
      [row('ep-1', null)],
      new Set(),
      new Map([['ep-1', { channelIdText: 'twib', imageUrl: 'channel-art' }]])
    );

    expect(grouped[0]?.imageUrl).toBe('channel-art');
  });
});
