import { describe, expect, it } from 'vitest';

import { HLS_PLAYLIST_MIME_TYPE } from '@podverse/helpers';

import { resolveLivestreamVideoJsSourceType } from './livestreamVideoJsSourceType';

describe('resolveLivestreamVideoJsSourceType', () => {
  it('keeps an explicit enclosure type', () => {
    expect(resolveLivestreamVideoJsSourceType('https://x/live.m3u8', 'video/mp4')).toBe(
      'video/mp4'
    );
  });

  it('infers an HLS playlist type for a query-string URI when the enclosure type is missing', () => {
    expect(resolveLivestreamVideoJsSourceType('https://x/live.m3u8?token=1', '')).toBe(
      HLS_PLAYLIST_MIME_TYPE
    );
    expect(resolveLivestreamVideoJsSourceType('https://x/live.m3u8?token=1', null)).toBe(
      HLS_PLAYLIST_MIME_TYPE
    );
  });

  it('uses an HLS content type when the enclosure type is blank', () => {
    expect(
      resolveLivestreamVideoJsSourceType('https://x/live', '  ', 'application/vnd.apple.mpegURL')
    ).toBe('application/vnd.apple.mpegURL');
  });

  it('leaves a progressive file with no type unresolved', () => {
    expect(resolveLivestreamVideoJsSourceType('https://x/ep.mp3?playlist=a.m3u8', null)).toBe(
      null
    );
  });
});
