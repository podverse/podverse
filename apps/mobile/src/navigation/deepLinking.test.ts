import { describe, expect, it } from 'vitest';

import {
  APP_ROUTES,
  buildAlbumPath,
  buildArtistPath,
  buildChannelPath,
  buildClipPath,
  buildEpisodePath,
  buildMobileHomeAlbumTrackPath,
  buildMobileHomePodcastEpisodePath,
  buildMobileHomeScopedPath,
  buildMusicLivestreamPath,
  buildPlaylistPath,
  buildPodcastLivestreamPath,
  buildPodcastPath,
  buildProfilePath,
  buildTrackPath,
  buildVideoPath,
  MOBILE_HOME_TAB_PATH,
} from '@podverse/helpers';

import {
  isAuthGatedDeepLink,
  mapIncomingPathToScopedPath,
  mapScopedPathToFlatPath,
} from './deepLinking';

describe('mapIncomingPathToScopedPath', () => {
  it('maps flat content routes to home-scoped paths', () => {
    expect(mapIncomingPathToScopedPath(buildPodcastPath('pod123'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123')
    );
    expect(mapIncomingPathToScopedPath(buildEpisodePath('ep123'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.EPISODE, 'ep123')
    );
    expect(mapIncomingPathToScopedPath(buildClipPath('clip123'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.CLIP, 'clip123')
    );
    expect(mapIncomingPathToScopedPath(buildAlbumPath('alb123'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.ALBUM, 'alb123')
    );
    expect(mapIncomingPathToScopedPath(buildArtistPath('art123'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.ARTIST, 'art123')
    );
    expect(mapIncomingPathToScopedPath(buildTrackPath('trk123'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.TRACK, 'trk123')
    );
  });

  it('keeps nav-scoped paths unchanged', () => {
    expect(mapIncomingPathToScopedPath(`/more${APP_ROUTES.SETTINGS}`)).toBe(
      `/more${APP_ROUTES.SETTINGS}`
    );
    expect(mapIncomingPathToScopedPath(`/search${APP_ROUTES.PODCAST}/pod123`)).toBe(
      `/search${APP_ROUTES.PODCAST}/pod123`
    );
  });

  it('maps playlist and profile routes to their tab-scoped stacks', () => {
    expect(mapIncomingPathToScopedPath(buildPlaylistPath('plst123'))).toBe(
      `/my-library${APP_ROUTES.PLAYLIST}/plst123`
    );
    expect(mapIncomingPathToScopedPath(buildProfilePath('user123'))).toBe(
      `/more${APP_ROUTES.PROFILE}/user123`
    );
  });

  it('maps stacked and livestream web paths onto the Home stack', () => {
    expect(
      mapIncomingPathToScopedPath(`${APP_ROUTES.PODCAST}/ch-1${APP_ROUTES.EPISODE}/ep-1`)
    ).toBe(buildMobileHomePodcastEpisodePath('ch-1', 'ep-1'));
    expect(mapIncomingPathToScopedPath(buildPodcastLivestreamPath('live-1'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.EPISODE, 'live-1')
    );
    expect(mapIncomingPathToScopedPath(buildMusicLivestreamPath('live-2'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.EPISODE, 'live-2')
    );
    expect(mapIncomingPathToScopedPath(buildVideoPath('vid-1'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.EPISODE, 'vid-1')
    );
    expect(mapIncomingPathToScopedPath(buildChannelPath('ch-1'))).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'ch-1')
    );
    expect(mapIncomingPathToScopedPath(`${APP_ROUTES.ALBUM}/alb-1${APP_ROUTES.TRACK}/trk-1`)).toBe(
      buildMobileHomeAlbumTrackPath('alb-1', 'trk-1')
    );
  });

  it('maps bare settings to more settings', () => {
    expect(mapIncomingPathToScopedPath(APP_ROUTES.SETTINGS)).toBe(`/more${APP_ROUTES.SETTINGS}`);
  });

  it('handles full web URLs and strips query/hash', () => {
    expect(
      mapIncomingPathToScopedPath(`https://podverse.fm${buildPodcastPath('pod123')}?foo=1#bar`)
    ).toBe(buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123'));
  });

  it('handles full custom-scheme deep links (host is a route segment, not a domain)', () => {
    // The buffer path (App.tsx pending-deep-link + notification open) forwards the full scheme
    // URL, so the leading route segment arrives as the URL "host" and must be preserved.
    expect(mapIncomingPathToScopedPath(`podverse-next:/${buildPodcastPath('pod123')}`)).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123')
    );
    expect(mapIncomingPathToScopedPath(`podverse:/${buildPodcastPath('pod123')}`)).toBe(
      buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123')
    );
    expect(
      mapIncomingPathToScopedPath(`podverse-next:/${buildPodcastPath('pod123')}?foo=1#bar`)
    ).toBe(buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123'));
    expect(mapIncomingPathToScopedPath(`podverse-next:/${MOBILE_HOME_TAB_PATH}`)).toBe(
      MOBILE_HOME_TAB_PATH
    );
    expect(mapIncomingPathToScopedPath(`podverse-next://more${APP_ROUTES.SETTINGS}`)).toBe(
      `/more${APP_ROUTES.SETTINGS}`
    );
    expect(mapIncomingPathToScopedPath(`podverse-next:/${buildPlaylistPath('plst123')}`)).toBe(
      `/my-library${APP_ROUTES.PLAYLIST}/plst123`
    );
  });

  it('falls back to home for empty or unknown routes', () => {
    expect(mapIncomingPathToScopedPath('')).toBe(MOBILE_HOME_TAB_PATH);
    expect(mapIncomingPathToScopedPath('/not-a-route')).toBe(MOBILE_HOME_TAB_PATH);
  });
});

describe('mapScopedPathToFlatPath', () => {
  it('maps scoped content routes to flat web paths', () => {
    expect(mapScopedPathToFlatPath(buildMobileHomeScopedPath(APP_ROUTES.PODCAST, 'pod123'))).toBe(
      buildPodcastPath('pod123')
    );
    expect(mapScopedPathToFlatPath(buildMobileHomeScopedPath(APP_ROUTES.EPISODE, 'ep123'))).toBe(
      buildEpisodePath('ep123')
    );
    expect(mapScopedPathToFlatPath(buildMobileHomeScopedPath(APP_ROUTES.CLIP, 'clip123'))).toBe(
      buildClipPath('clip123')
    );
    expect(mapScopedPathToFlatPath(buildMobileHomeScopedPath(APP_ROUTES.ALBUM, 'alb123'))).toBe(
      buildAlbumPath('alb123')
    );
    expect(mapScopedPathToFlatPath(buildMobileHomeScopedPath(APP_ROUTES.ARTIST, 'art123'))).toBe(
      buildArtistPath('art123')
    );
    expect(mapScopedPathToFlatPath(buildMobileHomeScopedPath(APP_ROUTES.TRACK, 'trk123'))).toBe(
      buildTrackPath('trk123')
    );
    expect(mapScopedPathToFlatPath(buildMobileHomePodcastEpisodePath('ch-1', 'ep-1'))).toBe(
      buildEpisodePath('ep-1')
    );
    expect(mapScopedPathToFlatPath(buildMobileHomeAlbumTrackPath('alb-1', 'trk-1'))).toBe(
      buildTrackPath('trk-1')
    );
  });

  it('maps scoped playlist/profile routes to flat paths', () => {
    expect(mapScopedPathToFlatPath(`/my-library${APP_ROUTES.PLAYLIST}/plst123`)).toBe(
      buildPlaylistPath('plst123')
    );
    expect(mapScopedPathToFlatPath(`/more${APP_ROUTES.PROFILE}/user123`)).toBe(
      buildProfilePath('user123')
    );
  });

  it('returns normalized path for non-mapped routes and strips query/hash', () => {
    expect(mapScopedPathToFlatPath(`/more${APP_ROUTES.SETTINGS}`)).toBe(
      `/more${APP_ROUTES.SETTINGS}`
    );
    expect(mapScopedPathToFlatPath(`/more${APP_ROUTES.SETTINGS}?foo=1#bar`)).toBe(
      `/more${APP_ROUTES.SETTINGS}`
    );
  });
});

describe('isAuthGatedDeepLink', () => {
  it('returns true for auth-gated routes', () => {
    expect(isAuthGatedDeepLink('/history')).toBe(true);
    expect(isAuthGatedDeepLink('/queues')).toBe(true);
    expect(isAuthGatedDeepLink('/my-profile')).toBe(true);
    expect(isAuthGatedDeepLink(APP_ROUTES.SETTINGS)).toBe(true);
  });

  it('returns false for public routes', () => {
    expect(isAuthGatedDeepLink(buildPodcastPath('pod123'))).toBe(false);
    expect(isAuthGatedDeepLink(buildEpisodePath('ep123'))).toBe(false);
    expect(isAuthGatedDeepLink(buildPlaylistPath('plst123'))).toBe(false);
  });
});
