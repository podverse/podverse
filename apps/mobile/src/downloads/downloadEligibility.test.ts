import { describe, expect, it } from 'vitest';

import type { DTOItem, DTOItemEnclosure, DTOLiveItem } from '@podverse/helpers/dto';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';

import { isHlsSource, isItemDownloadable } from './downloadEligibility';

const liveItemFixture: DTOLiveItem = {
  id: 1,
  item_id: 1,
  live_item_status: { id: LiveItemStatusEnum.Live },
  live_item_status_id: LiveItemStatusEnum.Live,
  start_time: '2026-01-01T00:00:00.000Z',
};

const buildEnclosure = (overrides: Partial<DTOItemEnclosure>): DTOItemEnclosure => ({
  id: 0,
  item_id: 0,
  type: 'audio/mpeg',
  length: null,
  bitrate: null,
  height: null,
  language: null,
  title: null,
  rel: null,
  codecs: null,
  item_enclosure_default: false,
  item_enclosure_integrity: null,
  item_enclosure_sources: [],
  ...overrides,
});

const enclosureWithSource = (uri: string, overrides: Partial<DTOItemEnclosure> = {}) =>
  buildEnclosure({
    ...overrides,
    item_enclosure_sources: [
      { id: 0, item_enclosure_id: 0, uri, content_type: overrides.type ?? null },
    ],
  });

const buildItem = (enclosures: DTOItemEnclosure[], overrides: Partial<DTOItem> = {}): DTOItem => {
  const item: Partial<DTOItem> = {
    id: 1,
    id_text: 'itemABC',
    channel_id: 1,
    item_flag_status_id: 1,
    live_item: null,
    item_enclosures: enclosures,
    ...overrides,
  };
  // Only the fields exercised by eligibility are populated; cast documents the partial fixture.
  return item as DTOItem;
};

describe('isHlsSource', () => {
  it('detects .m3u8 URIs (with and without query/hash)', () => {
    expect(isHlsSource('https://x/stream.m3u8', null)).toBe(true);
    expect(isHlsSource('https://x/stream.m3u8?token=1', null)).toBe(true);
    expect(isHlsSource('https://x/stream.m3u8#frag', 'audio/mpeg')).toBe(true);
  });

  it('detects HLS MIME types', () => {
    expect(isHlsSource('https://x/stream', 'application/x-mpegurl')).toBe(true);
    expect(isHlsSource('https://x/stream', 'application/vnd.apple.mpegURL')).toBe(true);
  });

  it('returns false for progressive files', () => {
    expect(isHlsSource('https://x/ep.mp3', 'audio/mpeg')).toBe(false);
    expect(isHlsSource('https://x/ep.mp4', 'video/mp4')).toBe(false);
  });
});

describe('isItemDownloadable', () => {
  it('rejects livestreams (live_item set)', () => {
    const item = buildItem([enclosureWithSource('https://x/ep.mp3')], {
      live_item: liveItemFixture,
    });
    const result = isItemDownloadable(item);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('livestream');
  });

  it('rejects items with no enclosures', () => {
    const result = isItemDownloadable(buildItem([]));
    expect(result.ok === false && result.reason).toBe('no_enclosure');
  });

  it('rejects enclosures without a usable source URI', () => {
    const result = isItemDownloadable(buildItem([buildEnclosure({ type: 'audio/mpeg' })]));
    expect(result.ok === false && result.reason).toBe('no_enclosure');
  });

  it('rejects HLS-only items', () => {
    const item = buildItem([
      enclosureWithSource('https://x/stream.m3u8', { type: 'application/x-mpegurl' }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok === false && result.reason).toBe('hls_playlist');
  });

  it('accepts a progressive audio file and selects it', () => {
    const item = buildItem([
      enclosureWithSource('https://x/ep.mp3', { type: 'audio/mpeg', item_enclosure_default: true }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.uri).toBe('https://x/ep.mp3');
      expect(result.source.mediaType).toBe('audio');
      expect(result.source.fileExtension).toBe('mp3');
    }
  });

  it('prefers the progressive source when both HLS and a progressive file exist', () => {
    const item = buildItem([
      enclosureWithSource('https://x/stream.m3u8', { type: 'application/x-mpegurl' }),
      enclosureWithSource('https://x/ep.m4a', { type: 'audio/mp4' }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.uri).toBe('https://x/ep.m4a');
    }
  });

  it('accepts a video-only progressive item', () => {
    const item = buildItem([
      enclosureWithSource('https://x/ep.mp4', { type: 'video/mp4', height: 720 }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.mediaType).toBe('video');
      expect(result.source.fileExtension).toBe('mp4');
    }
  });
});
