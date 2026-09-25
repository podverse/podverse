import { describe, expect, it } from 'vitest';

import type { DTOItem, DTOItemEnclosure, DTOLiveItem } from '@podverse/helpers/dto';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';
import type { EnclosureSelectedParams } from '@podverse/helpers/item/itemEnclosure';

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

const selectedParams = (
  type: EnclosureSelectedParams['type'],
  enclosureRowSelected: number,
  sourceRowSelected = 0
): EnclosureSelectedParams => ({
  enclosureRowSelected,
  sourceRowSelected,
  type,
});

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

  it('rejects the asset-server VOD HLS playlist fixture', () => {
    const item = buildItem([
      enclosureWithSource('http://localhost:2111/e2e/hls/e2e-hls-vod.m3u8?fixture=vod', {
        type: 'audio/mpeg',
      }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok === false && result.reason).toBe('hls_playlist');
  });

  it('rejects a query-string HLS playlist even when the MIME type is progressive', () => {
    const item = buildItem([
      enclosureWithSource('https://x/stream.m3u8?token=1', { type: 'audio/mpeg' }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok === false && result.reason).toBe('hls_playlist');
  });

  it('rejects a MIME-only HLS playlist', () => {
    const item = buildItem([enclosureWithSource('https://x/stream', { type: 'audio/mpegurl' })]);
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

  it('keeps a later progressive source on an enclosure that also has an HLS playlist', () => {
    const item = buildItem([
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [
          { id: 0, item_enclosure_id: 0, uri: 'https://x/stream.m3u8' },
          { id: 1, item_enclosure_id: 0, uri: 'https://x/ep.mp3' },
        ],
      }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.uri).toBe('https://x/ep.mp3');
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

  it('uses an explicit selected progressive source when provided', () => {
    const item = buildItem([
      enclosureWithSource('https://x/audio-default.mp3', {
        type: 'audio/mpeg',
        item_enclosure_default: true,
      }),
      enclosureWithSource('https://x/video-selected.mp4', { type: 'video/mp4', height: 720 }),
    ]);
    const result = isItemDownloadable(item, selectedParams('video', 0));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.uri).toBe('https://x/video-selected.mp4');
      expect(result.source.mediaType).toBe('video');
    }
  });

  it('rejects an explicit non-media selection even when a progressive file exists', () => {
    const item = buildItem([
      enclosureWithSource('https://x/audio.mp3', { type: 'audio/mpeg' }),
      enclosureWithSource('https://x/notes.pdf', { type: 'application/pdf' }),
    ]);
    const result = isItemDownloadable(item, selectedParams('audio', 1));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('unsupported_source');
  });

  it('rejects a document MIME type and a non-http URI', () => {
    const pdf = isItemDownloadable(
      buildItem([enclosureWithSource('https://x/notes.pdf', { type: 'application/pdf' })])
    );
    expect(pdf.ok === false && pdf.reason).toBe('unsupported_source');

    const html = isItemDownloadable(
      buildItem([enclosureWithSource('https://x/page.html', { type: 'text/html' })])
    );
    expect(html.ok === false && html.reason).toBe('unsupported_source');

    const ftp = isItemDownloadable(
      buildItem([enclosureWithSource('ftp://x/ep.mp3', { type: 'audio/mpeg' })])
    );
    expect(ftp.ok === false && ftp.reason).toBe('unsupported_source');
  });

  it('keeps a missing MIME type and a media type on a page-like path', () => {
    const missingMime = isItemDownloadable(
      buildItem([enclosureWithSource('https://x/ep.mp3', { type: '' })])
    );
    expect(missingMime.ok).toBe(true);

    const pagePath = isItemDownloadable(
      buildItem([enclosureWithSource('https://x/page.html', { type: 'audio/mpeg' })])
    );
    expect(pagePath.ok).toBe(true);
    if (pagePath.ok) {
      expect(pagePath.source.uri).toBe('https://x/page.html');
    }
  });

  it('skips a non-media sibling and keeps the progressive file', () => {
    const item = buildItem([
      enclosureWithSource('https://x/notes.pdf', { type: 'application/pdf' }),
      enclosureWithSource('https://x/ep.mp3', { type: 'audio/mpeg' }),
    ]);
    const result = isItemDownloadable(item);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.uri).toBe('https://x/ep.mp3');
    }
  });

  it('rejects explicit selected HLS source even when a progressive fallback exists', () => {
    const item = buildItem([
      enclosureWithSource('https://x/audio.mp3', { type: 'audio/mpeg' }),
      enclosureWithSource('https://x/video.m3u8', {
        type: 'application/x-mpegurl',
        height: 720,
      }),
    ]);
    const result = isItemDownloadable(item, selectedParams('video', 0));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('hls_playlist');
  });
});
