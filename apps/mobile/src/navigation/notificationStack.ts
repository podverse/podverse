import type { NavigationState, PartialState } from '@react-navigation/native';
import {
  getActionFromState,
  getStateFromPath as getDefaultStateFromPath,
} from '@react-navigation/native';

import {
  APP_ROUTES,
  getAppRouteFirstSegment,
  matchesAppRouteSegments,
  MOBILE_HOME_TAB_PATH,
  MOBILE_HOME_TAB_SEGMENT,
} from '@podverse/helpers';

import { isAlbyOAuthCallbackPath } from '../v4v/alby/albyProtocol';
import { mapIncomingPathToScopedPath } from './deepLinking';

export type HomeStackScreenRef =
  | { name: 'HomeRoot' }
  | { name: 'AlbumDetail'; params: { albumId: string } }
  | { name: 'ArtistDetail'; params: { artistId: string } }
  | { name: 'ClipDetail'; params: { clipId: string } }
  | { name: 'EpisodeDetail'; params: { episodeId: string } }
  | { name: 'PodcastDetail'; params: { podcastId: string } }
  | { name: 'TrackDetail'; params: { trackId: string } };

type NavState = PartialState<NavigationState>;

const SEARCH_ROOT_ROUTE_NAME = 'SearchRoot';

const focusedRouteIndex = (state: NavState): number => {
  if (typeof state.index === 'number') {
    return state.index;
  }
  return Math.max(0, state.routes.length - 1);
};

const paramsWithAutoFocus = (params: object | undefined): { autoFocus: true } => {
  if (params === undefined || Array.isArray(params)) {
    return { autoFocus: true };
  }
  return { ...params, autoFocus: true };
};

/**
 * A link that opens Search itself focuses the field. A link that opens a page above Search
 * leaves that request off, so Back onto the field does not focus it.
 */
export const withSearchRootAutoFocus = (state: NavState | undefined): NavState | undefined => {
  if (state === undefined) {
    return undefined;
  }
  return stampFocusedSearchRoot(state);
};

const stampFocusedSearchRoot = (state: NavState): NavState => {
  const index = focusedRouteIndex(state);
  const route = state.routes[index];
  if (route === undefined) {
    return state;
  }

  if (route.state !== undefined) {
    const nextState = stampFocusedSearchRoot(route.state);
    if (nextState === route.state) {
      return state;
    }
    const routes = state.routes.slice();
    routes[index] = { ...route, state: nextState };
    return { ...state, routes };
  }

  if (route.name !== SEARCH_ROOT_ROUTE_NAME) {
    return state;
  }

  const routes = state.routes.slice();
  routes[index] = { ...route, params: paramsWithAutoFocus(route.params) };
  return { ...state, routes };
};

const splitScopedPath = (scopedPath: string): string[] => {
  return scopedPath.split('/').filter((segment) => segment.length > 0);
};

/**
 * Parse a Home-scoped content path into the screens that should sit on the Home stack
 * (Home underneath the destination, plus the parent podcast/album when those ids are present).
 */
export const parseHomeContentStackPath = (scopedPath: string): HomeStackScreenRef[] | null => {
  const segments = splitScopedPath(scopedPath);
  if (segments[0] !== MOBILE_HOME_TAB_SEGMENT || segments.length < 3) {
    return null;
  }

  if (
    segments.length === 5 &&
    matchesAppRouteSegments(segments, APP_ROUTES.PODCAST, 1) &&
    segments[3] === getAppRouteFirstSegment(APP_ROUTES.EPISODE) &&
    segments[2] !== undefined &&
    segments[4] !== undefined
  ) {
    return [
      { name: 'HomeRoot' },
      { name: 'PodcastDetail', params: { podcastId: segments[2] } },
      { name: 'EpisodeDetail', params: { episodeId: segments[4] } },
    ];
  }

  if (
    segments.length === 5 &&
    matchesAppRouteSegments(segments, APP_ROUTES.ALBUM, 1) &&
    segments[3] === getAppRouteFirstSegment(APP_ROUTES.TRACK) &&
    segments[2] !== undefined &&
    segments[4] !== undefined
  ) {
    return [
      { name: 'HomeRoot' },
      { name: 'AlbumDetail', params: { albumId: segments[2] } },
      { name: 'TrackDetail', params: { trackId: segments[4] } },
    ];
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.PODCAST, 1) &&
    segments[2] !== undefined
  ) {
    return [{ name: 'HomeRoot' }, { name: 'PodcastDetail', params: { podcastId: segments[2] } }];
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.EPISODE, 1) &&
    segments[2] !== undefined
  ) {
    return [{ name: 'HomeRoot' }, { name: 'EpisodeDetail', params: { episodeId: segments[2] } }];
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.ALBUM, 1) &&
    segments[2] !== undefined
  ) {
    return [{ name: 'HomeRoot' }, { name: 'AlbumDetail', params: { albumId: segments[2] } }];
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.TRACK, 1) &&
    segments[2] !== undefined
  ) {
    return [{ name: 'HomeRoot' }, { name: 'TrackDetail', params: { trackId: segments[2] } }];
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.ARTIST, 1) &&
    segments[2] !== undefined
  ) {
    return [{ name: 'HomeRoot' }, { name: 'ArtistDetail', params: { artistId: segments[2] } }];
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.CLIP, 1) &&
    segments[2] !== undefined
  ) {
    return [{ name: 'HomeRoot' }, { name: 'ClipDetail', params: { clipId: segments[2] } }];
  }

  return null;
};

const toHomeStackRoute = (screen: HomeStackScreenRef) => {
  if (screen.name === 'HomeRoot') {
    return { name: screen.name };
  }
  return { name: screen.name, params: screen.params };
};

export const applyHomeContentStackToState = (
  base: NavState,
  screens: HomeStackScreenRef[]
): NavState => {
  if (base.routes === undefined) {
    return base;
  }

  return {
    ...base,
    routes: base.routes.map((route) => {
      if (route.name !== 'MainTabs' || route.state?.routes === undefined) {
        return route;
      }

      const homeTabIndex = route.state.routes.findIndex((tab) => tab.name === 'Home');
      return {
        ...route,
        state: {
          ...route.state,
          index: homeTabIndex >= 0 ? homeTabIndex : route.state.index,
          routes: route.state.routes.map((tab) => {
            if (tab.name !== 'Home') {
              return tab;
            }
            return {
              ...tab,
              state: {
                routes: screens.map(toHomeStackRoute),
                index: screens.length - 1,
                type: 'stack',
              },
            };
          }),
        },
      };
    }),
  };
};

export const resolveMobileDeepLinkState = (
  path: string,
  options: Parameters<typeof getDefaultStateFromPath>[1]
) => {
  if (isAlbyOAuthCallbackPath(path)) {
    return undefined;
  }

  const scopedPath = mapIncomingPathToScopedPath(path);
  const stackScreens = parseHomeContentStackPath(scopedPath);
  if (stackScreens !== null) {
    const base =
      getDefaultStateFromPath(MOBILE_HOME_TAB_PATH, options) ??
      getDefaultStateFromPath(scopedPath, options);
    if (base !== undefined) {
      return applyHomeContentStackToState(base, stackScreens);
    }
  }

  return withSearchRootAutoFocus(
    getDefaultStateFromPath(scopedPath, options) ??
      getDefaultStateFromPath(MOBILE_HOME_TAB_PATH, options) ??
      undefined
  );
};

/**
 * Navigation action for a link opened while the app is already running.
 *
 * A link has to reach its destination without replacing the root screen. The root screen owns the
 * tab bar and every tab's stack, so replacing it removes all of those native views at the moment
 * the renderer is also re-laying-out the tab bar — on Android the outgoing views are still held by
 * their old parents when the new tree is mounted, which fails the mount and tears the app down.
 * Navigating to the destination leaves the mounted tree in place and pushes onto it.
 *
 * `undefined` when the path resolves to nothing the navigator can act on; the caller decides where
 * to land instead.
 */
export const resolveMobileDeepLinkAction = (
  path: string,
  options: Parameters<typeof getDefaultStateFromPath>[1]
): ReturnType<typeof getActionFromState> => {
  const state = resolveMobileDeepLinkState(path, options);
  if (state === undefined) {
    return undefined;
  }

  return getActionFromState(state, options);
};
