import { describe, expect, it } from 'vitest';

import type { ChannelRouteKind } from './medium.js';
import { getChannelRouteKind, getMediumIdArrayFromType, MediumEnum } from './medium.js';

describe('getChannelRouteKind', () => {
  const expectRouteKind = (
    mediumId: number | null | undefined,
    expectedRouteKind: ChannelRouteKind
  ) => {
    expect(getChannelRouteKind(mediumId)).toBe(expectedRouteKind);
  };

  it('maps podcast medium to podcast route', () => {
    expectRouteKind(MediumEnum.Podcast, 'podcast');
  });

  it('maps video medium to podcast route', () => {
    expectRouteKind(MediumEnum.Video, 'podcast');
  });

  it('maps music medium to album route', () => {
    expectRouteKind(MediumEnum.Music, 'album');
  });

  it('maps publisher music medium to artist route', () => {
    expectRouteKind(MediumEnum.PublisherMusic, 'artist');
  });

  it('uses the medium table ids for publisher rows', () => {
    expect(MediumEnum.PublisherPodcast).toBe(21);
    expect(MediumEnum.PublisherMusic).toBe(22);
    expect(MediumEnum.PublisherVideo).toBe(23);
    expect(MediumEnum.PublisherAV).toBe(29);
    expect(getMediumIdArrayFromType('publisher-music')).toEqual([22]);
  });

  it('maps null and unmapped mediums to podcast route', () => {
    expectRouteKind(MediumEnum.Audiobook, 'podcast');
    expectRouteKind(null, 'podcast');
    expectRouteKind(undefined, 'podcast');
  });
});
