import { describe, expect, it } from 'vitest';

import type { DTOItemEnclosure } from '../../dtos/item/itemEnclosure.js';
import {
  buildLabeledItemEnclosures,
  labeledItemEnclosuresForDirectDownload,
  pickDefaultDirectDownloadSource,
  resolveItemEnclosureModalityIndicator,
} from './itemEnclosure.js';

function buildEnclosure(overrides: Partial<DTOItemEnclosure>): DTOItemEnclosure {
  return {
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
  };
}

const audioEnclosure = buildEnclosure({ type: 'audio/mpeg', item_enclosure_default: true });
const audioOggEnclosure = buildEnclosure({ type: 'audio/ogg' });
const videoEnclosureByType = buildEnclosure({ type: 'video/mp4' });
const videoEnclosureByHeight = buildEnclosure({ type: 'application/octet-stream', height: 720 });

describe('resolveItemEnclosureModalityIndicator', () => {
  it('returns "none" when there are no enclosures', () => {
    expect(resolveItemEnclosureModalityIndicator([])).toBe('none');
    expect(resolveItemEnclosureModalityIndicator(null)).toBe('none');
    expect(resolveItemEnclosureModalityIndicator(undefined)).toBe('none');
  });

  it('returns "none" for audio-only', () => {
    expect(resolveItemEnclosureModalityIndicator([audioEnclosure])).toBe('none');
  });

  it('returns "none" for multiple audio-only enclosures', () => {
    expect(resolveItemEnclosureModalityIndicator([audioEnclosure, audioOggEnclosure])).toBe('none');
  });

  it('returns "video" for video-only by type', () => {
    expect(resolveItemEnclosureModalityIndicator([videoEnclosureByType])).toBe('video');
  });

  it('returns "video" for video-only detected by height', () => {
    expect(resolveItemEnclosureModalityIndicator([videoEnclosureByHeight])).toBe('video');
  });

  it('returns "mixed" when both audio and video are present', () => {
    expect(resolveItemEnclosureModalityIndicator([audioEnclosure, videoEnclosureByType])).toBe(
      'mixed'
    );
  });
});

describe('buildLabeledItemEnclosures HLS extension', () => {
  it('keeps a query-string HLS playlist extension and maps HLS MIME types to m3u8', () => {
    const fromUri = buildLabeledItemEnclosures([
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [
          { id: 1, item_enclosure_id: 0, uri: 'https://x/live.m3u8?token=1' },
        ],
      }),
    ]);
    expect(fromUri[0]?.fileExtension).toBe('m3u8');

    const fromMime = buildLabeledItemEnclosures([
      buildEnclosure({
        type: 'application/vnd.apple.mpegURL',
        item_enclosure_sources: [{ id: 1, item_enclosure_id: 0, uri: 'https://x/live' }],
      }),
    ]);
    expect(fromMime[0]?.fileExtension).toBe('m3u8');

    const progressive = buildLabeledItemEnclosures([
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [
          { id: 1, item_enclosure_id: 0, uri: 'https://x/ep.mp3?token=1' },
        ],
      }),
    ]);
    expect(progressive[0]?.fileExtension).toBe('mp3');
  });
});

describe('labeledItemEnclosuresForDirectDownload', () => {
  it('keeps the progressive file when an HLS playlist is also present', () => {
    const labeled = buildLabeledItemEnclosures([
      buildEnclosure({
        type: 'application/x-mpegurl',
        item_enclosure_default: true,
        item_enclosure_sources: [{ id: 0, item_enclosure_id: 0, uri: 'https://x/stream.m3u8' }],
      }),
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [{ id: 1, item_enclosure_id: 0, uri: 'https://x/ep.mp3' }],
      }),
    ]);

    const downloadable = labeledItemEnclosuresForDirectDownload(labeled);
    expect(downloadable).toHaveLength(1);
    expect(downloadable[0]?.enclosure.item_enclosure_sources[0]?.uri).toBe('https://x/ep.mp3');
    expect(pickDefaultDirectDownloadSource(labeled)?.uri).toBe('https://x/ep.mp3');
  });

  it('drops a document and a non-http URI, and keeps a missing MIME type', () => {
    const labeled = buildLabeledItemEnclosures([
      buildEnclosure({
        type: 'application/pdf',
        item_enclosure_sources: [{ id: 0, item_enclosure_id: 0, uri: 'https://x/notes.pdf' }],
      }),
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [{ id: 1, item_enclosure_id: 0, uri: 'ftp://x/ep.mp3' }],
      }),
      buildEnclosure({
        type: '',
        item_enclosure_sources: [{ id: 2, item_enclosure_id: 0, uri: 'https://x/ep.mp3' }],
      }),
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [{ id: 3, item_enclosure_id: 0, uri: 'https://x/page.html' }],
      }),
    ]);

    const uris = labeledItemEnclosuresForDirectDownload(labeled).map(
      (labeledEnclosure) => labeledEnclosure.enclosure.item_enclosure_sources[0]?.uri
    );
    expect(uris).toEqual(['https://x/ep.mp3', 'https://x/page.html']);
  });

  it('keeps only the progressive source on a mixed enclosure', () => {
    const labeled = buildLabeledItemEnclosures([
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [
          { id: 0, item_enclosure_id: 0, uri: 'https://x/stream.m3u8' },
          { id: 1, item_enclosure_id: 0, uri: 'https://x/ep.mp3' },
        ],
      }),
    ]);

    const downloadable = labeledItemEnclosuresForDirectDownload(labeled);
    const sources = downloadable[0]?.enclosure.item_enclosure_sources ?? [];
    expect(sources.map((source) => source.uri)).toEqual(['https://x/ep.mp3']);
    expect(downloadable[0]?.fileExtension).toBe('mp3');
  });

  it('prefers audio when a video file is also saveable', () => {
    const labeled = buildLabeledItemEnclosures([
      buildEnclosure({
        type: 'video/mp4',
        height: 720,
        item_enclosure_default: true,
        item_enclosure_sources: [{ id: 0, item_enclosure_id: 0, uri: 'https://x/ep.mp4' }],
      }),
      buildEnclosure({
        type: 'audio/mpeg',
        item_enclosure_sources: [{ id: 1, item_enclosure_id: 0, uri: 'https://x/ep.mp3' }],
      }),
    ]);

    expect(pickDefaultDirectDownloadSource(labeled)?.uri).toBe('https://x/ep.mp3');
    expect(pickDefaultDirectDownloadSource(labeled)?.mediaType).toBe('audio');
  });
});
