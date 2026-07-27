import { describe, expect, it, vi } from 'vitest';

import { DIRECTORY_ADD_POLL_TIMEOUT_MS, MediumEnum } from '@podverse/helpers';

import {
  getChannelDetailRouteKind,
  isParsedReadyChannel,
  PI_FEED_ADD_POLL_TIMEOUT_MS,
  pollUntilParsedReadyChannel,
} from './podcastIndexFeedPreview';

describe('podcastIndexFeedPreview helpers', () => {
  it('uses the shared 10-minute directory-add poll timeout', () => {
    expect(PI_FEED_ADD_POLL_TIMEOUT_MS).toBe(DIRECTORY_ADD_POLL_TIMEOUT_MS);
    expect(DIRECTORY_ADD_POLL_TIMEOUT_MS).toBe(10 * 60 * 1000);
  });

  it('isParsedReadyChannel requires id_text and medium_id', () => {
    expect(isParsedReadyChannel(null)).toBe(false);
    expect(isParsedReadyChannel({ id_text: '', medium_id: MediumEnum.Podcast })).toBe(false);
    expect(isParsedReadyChannel({ id_text: 'abc', medium_id: 0 })).toBe(false);
    expect(isParsedReadyChannel({ id_text: 'abc', medium_id: MediumEnum.Podcast })).toBe(true);
  });

  it('getChannelDetailRouteKind maps medium to podcast, album, or artist', () => {
    expect(getChannelDetailRouteKind(MediumEnum.Podcast)).toBe('podcast');
    expect(getChannelDetailRouteKind(MediumEnum.Music)).toBe('album');
    expect(getChannelDetailRouteKind(MediumEnum.PublisherMusic)).toBe('artist');
  });

  it('pollUntilParsedReadyChannel resolves when the channel becomes ready', async () => {
    const fetchChannel = vi
      .fn<() => Promise<{ id_text: string; medium_id: number } | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id_text: 'ready-id', medium_id: MediumEnum.Podcast });

    const result = await pollUntilParsedReadyChannel({
      fetchChannel,
      intervalMs: 1,
      timeoutMs: 100,
      sleep: async () => undefined,
    });

    expect(result.outcome).toBe('ready');
    expect(result.channel?.id_text).toBe('ready-id');
    expect(fetchChannel).toHaveBeenCalledTimes(2);
  });

  it('pollUntilParsedReadyChannel times out when never ready', async () => {
    const fetchChannel = vi
      .fn<() => Promise<{ id_text: string; medium_id: number } | null>>()
      .mockResolvedValue(null);

    const result = await pollUntilParsedReadyChannel({
      fetchChannel,
      intervalMs: 1,
      timeoutMs: 5,
      sleep: async () => undefined,
    });

    expect(result.outcome).toBe('timeout');
    expect(result.channel).toBeNull();
    expect(fetchChannel.mock.calls.length).toBeGreaterThan(0);
  });

  it('pollUntilParsedReadyChannel returns cancelled when shouldContinue becomes false', async () => {
    const fetchChannel = vi
      .fn<() => Promise<{ id_text: string; medium_id: number } | null>>()
      .mockResolvedValue(null);

    const result = await pollUntilParsedReadyChannel({
      fetchChannel,
      intervalMs: 1,
      timeoutMs: 100,
      shouldContinue: () => false,
      sleep: async () => undefined,
    });

    expect(result.outcome).toBe('cancelled');
    expect(result.channel).toBeNull();
  });
});
