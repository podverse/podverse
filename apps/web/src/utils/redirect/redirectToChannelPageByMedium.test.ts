import { describe, expect, it } from 'vitest';

import type { DTOChannel } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { ROUTES } from '../../constants/routes';
import {
  getChannelPath,
  getChannelPathByMedium,
  getChannelRouteKind,
  getItemPathByMedium,
} from './redirectToChannelPageByMedium';

const channel = (medium_id: number): DTOChannel =>
  ({ id: 1, id_text: 'abc123', medium_id }) as DTOChannel;

describe('getChannelRouteKind', () => {
  it('maps podcast and video mediums to podcast', () => {
    expect(getChannelRouteKind(MediumEnum.Podcast)).toBe('podcast');
    expect(getChannelRouteKind(MediumEnum.Video)).toBe('podcast');
  });

  it('maps music and musicL mediums to album', () => {
    expect(getChannelRouteKind(MediumEnum.Music)).toBe('album');
    expect(getChannelRouteKind(MediumEnum.MusicL)).toBe('album');
  });

  it('maps publisher-music medium to artist', () => {
    expect(getChannelRouteKind(MediumEnum.PublisherMusic)).toBe('artist');
  });

  it('defaults unmapped mediums and null to podcast', () => {
    expect(getChannelRouteKind(MediumEnum.Audiobook)).toBe('podcast');
    expect(getChannelRouteKind(null)).toBe('podcast');
    expect(getChannelRouteKind(undefined)).toBe('podcast');
  });
});

describe('getChannelPathByMedium / getChannelPath', () => {
  it('builds the canonical path per medium', () => {
    expect(getChannelPathByMedium(MediumEnum.Podcast, 'abc123')).toBe(`${ROUTES.PODCAST}/abc123`);
    expect(getChannelPathByMedium(MediumEnum.Video, 'abc123')).toBe(`${ROUTES.PODCAST}/abc123`);
    expect(getChannelPathByMedium(MediumEnum.Music, 'abc123')).toBe(`${ROUTES.ALBUM}/abc123`);
    expect(getChannelPathByMedium(MediumEnum.MusicL, 'abc123')).toBe(`${ROUTES.ALBUM}/abc123`);
    expect(getChannelPathByMedium(MediumEnum.PublisherMusic, 'abc123')).toBe(
      `${ROUTES.ARTIST}/abc123`
    );
  });

  it('always returns a non-null path for a channel', () => {
    expect(getChannelPath(channel(MediumEnum.Music))).toBe(`${ROUTES.ALBUM}/abc123`);
    expect(getChannelPath(channel(MediumEnum.Audiobook))).toBe(`${ROUTES.PODCAST}/abc123`);
  });
});

describe('getItemPathByMedium', () => {
  it('uses episode for podcast/video and track for music', () => {
    expect(getItemPathByMedium(MediumEnum.Podcast, 'item1')).toBe(`${ROUTES.EPISODE}/item1`);
    expect(getItemPathByMedium(MediumEnum.Video, 'item1')).toBe(`${ROUTES.EPISODE}/item1`);
    expect(getItemPathByMedium(MediumEnum.Music, 'item1')).toBe(`${ROUTES.TRACK}/item1`);
    expect(getItemPathByMedium(MediumEnum.PublisherMusic, 'item1')).toBe(`${ROUTES.TRACK}/item1`);
  });

  it('defaults unmapped mediums and null to episode', () => {
    expect(getItemPathByMedium(MediumEnum.Audiobook, 'item1')).toBe(`${ROUTES.EPISODE}/item1`);
    expect(getItemPathByMedium(null, 'item1')).toBe(`${ROUTES.EPISODE}/item1`);
  });
});
