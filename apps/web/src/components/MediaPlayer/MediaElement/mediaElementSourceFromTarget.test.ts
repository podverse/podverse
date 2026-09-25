import { describe, expect, it } from 'vitest';

import { HLS_PLAYLIST_MIME_TYPE } from '@podverse/helpers';

import { toFileMediaElementSource } from './mediaElementSourceFromTarget';

describe('toFileMediaElementSource', () => {
  it('marks a query-string HLS playlist as hls and fills an HLS playlist MIME type', () => {
    expect(toFileMediaElementSource('https://x/live.m3u8?token=1', 'audio/mpeg')).toEqual({
      kind: 'file',
      src: 'https://x/live.m3u8?token=1',
      mimeType: HLS_PLAYLIST_MIME_TYPE,
      delivery: 'hls',
    });
    expect(toFileMediaElementSource('https://x/live', null)).toEqual({
      kind: 'file',
      src: 'https://x/live',
      delivery: 'file',
    });
  });

  it('marks the asset-server VOD HLS playlist as hls when the enclosure type is audio/mpeg', () => {
    const vodUrl = 'http://localhost:2111/e2e/hls/e2e-hls-vod.m3u8?fixture=vod';
    expect(toFileMediaElementSource(vodUrl, 'audio/mpeg')).toEqual({
      kind: 'file',
      src: vodUrl,
      mimeType: HLS_PLAYLIST_MIME_TYPE,
      delivery: 'hls',
    });
  });

  it('keeps an HLS enclosure type and a progressive file type', () => {
    expect(toFileMediaElementSource('https://x/live', 'application/vnd.apple.mpegURL')).toEqual({
      kind: 'file',
      src: 'https://x/live',
      mimeType: 'application/vnd.apple.mpegURL',
      delivery: 'hls',
    });
    expect(toFileMediaElementSource('https://x/ep.mp3?token=1', 'audio/mpeg')).toEqual({
      kind: 'file',
      src: 'https://x/ep.mp3?token=1',
      mimeType: 'audio/mpeg',
      delivery: 'file',
    });
  });
});
