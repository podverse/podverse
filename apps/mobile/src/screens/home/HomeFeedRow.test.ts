import { describe, expect, it } from 'vitest';

import { resolveHomeFeedRowDownload } from './homeFeedRowDownload';

const item = { id_text: 'item-1' };

describe('resolveHomeFeedRowDownload', () => {
  it('does not bind a control when downloadItem is missing', () => {
    expect(resolveHomeFeedRowDownload(undefined, 'podcast-episode-download-0')).toBeUndefined();
  });

  it('passes the testID through unchanged when the item is present', () => {
    expect(resolveHomeFeedRowDownload(item, 'podcast-episode-download-0')).toEqual({
      item,
      testID: 'podcast-episode-download-0',
    });
    expect(resolveHomeFeedRowDownload(item, 'podcast-downloaded-download-3')).toEqual({
      item,
      testID: 'podcast-downloaded-download-3',
    });
    expect(resolveHomeFeedRowDownload(item, 'album-track-download-1')).toEqual({
      item,
      testID: 'album-track-download-1',
    });
    expect(resolveHomeFeedRowDownload(item, 'artist-track-download-2')).toEqual({
      item,
      testID: 'artist-track-download-2',
    });
  });
});
