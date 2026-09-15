import { describe, expect, it } from 'vitest';

import { mergeDownloadChannelIdentity, usableDownloadChannelText } from './downloadChannelIdentity';

describe('usableDownloadChannelText', () => {
  it('keeps a real title and drops blanks', () => {
    expect(usableDownloadChannelText('Podcasting 2.0')).toBe('Podcasting 2.0');
    expect(usableDownloadChannelText('  ')).toBeNull();
    expect(usableDownloadChannelText('')).toBeNull();
    expect(usableDownloadChannelText(null)).toBeNull();
  });
});

describe('mergeDownloadChannelIdentity', () => {
  it('takes the id from a list payload and the title from a sibling download', () => {
    expect(
      mergeDownloadChannelIdentity([
        { channelIdText: 'podverse-e2e-channel', channelTitle: null },
        { channelIdText: null, channelTitle: 'Podcasting 2.0' },
      ])
    ).toEqual({
      channelIdText: 'podverse-e2e-channel',
      channelTitle: 'Podcasting 2.0',
    });
  });

  it('prefers the first usable id and title and ignores later empties', () => {
    expect(
      mergeDownloadChannelIdentity([
        { channelIdText: 'first', channelTitle: '' },
        { channelIdText: 'second', channelTitle: 'Show' },
      ])
    ).toEqual({
      channelIdText: 'first',
      channelTitle: 'Show',
    });
  });
});
