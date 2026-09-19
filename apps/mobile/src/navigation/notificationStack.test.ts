import { describe, expect, it } from 'vitest';

import {
  APP_ROUTES,
  buildMobileHomeAlbumTrackPath,
  buildMobileHomePodcastEpisodePath,
  buildMobileHomeScopedPath,
  MOBILE_HOME_TAB_PATH,
  MOBILE_HOME_TAB_SEGMENT,
} from '@podverse/helpers';

import {
  applyHomeContentStackToState,
  parseHomeContentStackPath,
  resolveMobileDeepLinkAction,
} from './notificationStack';

describe('parseHomeContentStackPath', () => {
  it('builds Home > podcast > episode', () => {
    expect(parseHomeContentStackPath(buildMobileHomePodcastEpisodePath('ch-1', 'ep-1'))).toEqual([
      { name: 'HomeRoot' },
      { name: 'PodcastDetail', params: { podcastId: 'ch-1' } },
      { name: 'EpisodeDetail', params: { episodeId: 'ep-1' } },
    ]);
  });

  it('builds Home > podcast for a channel-only path', () => {
    expect(
      parseHomeContentStackPath(buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'ch-1'))
    ).toEqual([{ name: 'HomeRoot' }, { name: 'PodcastDetail', params: { podcastId: 'ch-1' } }]);
  });

  it('builds Home > album > track', () => {
    expect(parseHomeContentStackPath(buildMobileHomeAlbumTrackPath('alb-1', 'trk-1'))).toEqual([
      { name: 'HomeRoot' },
      { name: 'AlbumDetail', params: { albumId: 'alb-1' } },
      { name: 'TrackDetail', params: { trackId: 'trk-1' } },
    ]);
  });

  it('returns null for non-content home paths', () => {
    expect(parseHomeContentStackPath(MOBILE_HOME_TAB_PATH)).toBeNull();
    expect(parseHomeContentStackPath(`/more${APP_ROUTES.SETTINGS}`)).toBeNull();
    expect(parseHomeContentStackPath('/notifications')).toBeNull();
  });
});

describe('applyHomeContentStackToState', () => {
  it('replaces the Home stack and selects the Home tab', () => {
    const next = applyHomeContentStackToState(
      {
        routes: [
          {
            name: 'MainTabs',
            state: {
              index: 2,
              routes: [
                { name: 'Home', state: { index: 0, routes: [{ name: 'HomeRoot' }] } },
                { name: 'Search' },
                { name: 'More' },
              ],
            },
          },
        ],
      },
      [
        { name: 'HomeRoot' },
        { name: 'PodcastDetail', params: { podcastId: 'ch-1' } },
        { name: 'EpisodeDetail', params: { episodeId: 'ep-1' } },
      ]
    );

    const mainTabs = next.routes?.[0];
    expect(mainTabs?.state?.index).toBe(0);
    expect(mainTabs?.state?.routes?.[0]?.state).toEqual({
      index: 2,
      routes: [
        { name: 'HomeRoot' },
        { name: 'PodcastDetail', params: { podcastId: 'ch-1' } },
        { name: 'EpisodeDetail', params: { episodeId: 'ep-1' } },
      ],
      type: 'stack',
    });
  });
});

describe('resolveMobileDeepLinkAction', () => {
  const options = {
    screens: {
      MainTabs: {
        screens: {
          Home: {
            screens: {
              EpisodeDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.EPISODE}/:episodeId`,
              HomeRoot: MOBILE_HOME_TAB_SEGMENT,
              PodcastDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.PODCAST}/:podcastId`,
            },
          },
        },
      },
    },
  };

  // A RESET payload would replace the root screen, taking the tab bar and every tab stack with it.
  it('navigates to the destination rather than resetting the root', () => {
    const action = resolveMobileDeepLinkAction(
      `${APP_ROUTES.PODCAST}/ch-1${APP_ROUTES.EPISODE}/ep-1`,
      options
    );

    expect(action).toMatchObject({ payload: { name: 'MainTabs' }, type: 'NAVIGATE' });
  });
});
