import { describe, expect, it } from 'vitest';

import { resolveUnaddedTrackParentAlbum } from './unaddedTrackParentAlbum.js';

const albums = [
  { id_text: 'album-local', podcast_guid: '11111111-1111-4111-8111-111111111111' },
];

describe('resolveUnaddedTrackParentAlbum', () => {
  it('opens the local album when the track feed guid matches', () => {
    expect(
      resolveUnaddedTrackParentAlbum({
        albums,
        feedGuid: '11111111-1111-4111-8111-111111111111',
        feedId: 42,
      })
    ).toEqual({ albumIdText: 'album-local', kind: 'album' });
  });

  it('opens the Podcast Index preview when only a positive feed id is known', () => {
    expect(
      resolveUnaddedTrackParentAlbum({
        albums,
        feedGuid: '22222222-2222-4222-8222-222222222222',
        feedId: 42,
      })
    ).toEqual({ kind: 'podcast-index', podcastIndexId: '42' });
  });

  it('hides the row when neither a local album nor a Podcast Index feed id exists', () => {
    expect(
      resolveUnaddedTrackParentAlbum({
        albums: [],
        feedGuid: '22222222-2222-4222-8222-222222222222',
        feedId: 0,
      })
    ).toBeNull();
    expect(
      resolveUnaddedTrackParentAlbum({
        albums: [],
        feedGuid: null,
        feedId: null,
      })
    ).toBeNull();
  });
});
