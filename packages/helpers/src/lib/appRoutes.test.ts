import { describe, expect, it } from 'vitest';

import {
  APP_ROUTES,
  buildEpisodePath,
  buildMobileHomeAlbumTrackPath,
  buildMobileHomePodcastEpisodePath,
  buildMobileHomeScopedPath,
  buildNotificationLinkPath,
  buildPodcastLivestreamPath,
  getAppRouteFirstSegment,
  getAppRouteSegments,
  getNotificationLinkPathPrefix,
  isFlatContentAppRouteSegment,
  matchesAppRouteSegments,
  MOBILE_HOME_TAB_PATH,
  MOBILE_HOME_TAB_SEGMENT,
} from './appRoutes.js';
import { MediumEnum } from './medium.js';

describe('appRoutes', () => {
  it('builds detail paths from APP_ROUTES prefixes', () => {
    expect(buildEpisodePath('ep-1')).toBe(`${APP_ROUTES.EPISODE}/ep-1`);
    expect(buildPodcastLivestreamPath('ch-1')).toBe(`${APP_ROUTES.PODCAST_LIVESTREAM}/ch-1`);
  });

  it('maps notification message types to path prefixes', () => {
    expect(getNotificationLinkPathPrefix('new-episode', MediumEnum.Podcast)).toBe(
      APP_ROUTES.EPISODE
    );
    expect(getNotificationLinkPathPrefix('livestream-started', MediumEnum.Music)).toBe(
      APP_ROUTES.MUSIC_LIVESTREAM
    );
    expect(getNotificationLinkPathPrefix('livestream-started', MediumEnum.Podcast)).toBe(
      APP_ROUTES.PODCAST_LIVESTREAM
    );
    expect(getNotificationLinkPathPrefix('new', MediumEnum.Podcast)).toBeNull();
  });

  it('builds full notification link paths', () => {
    expect(
      buildNotificationLinkPath({
        channelIdText: 'ch-1',
        itemIdText: 'item-1',
        mediumId: MediumEnum.Podcast,
        messageType: 'new-episode',
      })
    ).toBe(buildEpisodePath('item-1'));

    expect(
      buildNotificationLinkPath({
        channelIdText: 'ch-music',
        itemIdText: 'live-1',
        mediumId: MediumEnum.Music,
        messageType: 'livestream-started',
      })
    ).toBe(`${APP_ROUTES.MUSIC_LIVESTREAM}/live-1`);
  });

  it('derives path segments from APP_ROUTES so deep-link matching stays aligned', () => {
    expect(getAppRouteSegments(APP_ROUTES.EPISODE)).toEqual(['episode']);
    expect(getAppRouteSegments(APP_ROUTES.PODCAST_LIVESTREAM)).toEqual(['podcast', 'livestream']);
    expect(getAppRouteFirstSegment(APP_ROUTES.PODCAST)).toBe('podcast');
    expect(matchesAppRouteSegments(['podcast', 'livestream', 'live-1'], APP_ROUTES.PODCAST_LIVESTREAM)).toBe(
      true
    );
    expect(isFlatContentAppRouteSegment('episode')).toBe(true);
    expect(isFlatContentAppRouteSegment('video')).toBe(false);
  });

  it('scopes mobile Home stack paths from APP_ROUTES', () => {
    expect(buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'ch-1')).toBe(
      `${MOBILE_HOME_TAB_PATH}${APP_ROUTES.PODCAST}/ch-1`
    );
    expect(buildMobileHomePodcastEpisodePath('ch-1', 'ep-1')).toBe(
      `${MOBILE_HOME_TAB_PATH}${APP_ROUTES.PODCAST}/ch-1${APP_ROUTES.EPISODE}/ep-1`
    );
    expect(buildMobileHomeAlbumTrackPath('alb-1', 'trk-1')).toBe(
      `${MOBILE_HOME_TAB_PATH}${APP_ROUTES.ALBUM}/alb-1${APP_ROUTES.TRACK}/trk-1`
    );
    expect(`${MOBILE_HOME_TAB_PATH}`).toBe(`/${MOBILE_HOME_TAB_SEGMENT}`);
  });
});
