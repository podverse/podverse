import {
  APP_ROUTES,
  buildAppRoutePath,
  buildEpisodePath,
  buildMobileHomeAlbumTrackPath,
  buildMobileHomePodcastEpisodePath,
  buildMobileHomeScopedPath,
  buildPlaylistPath,
  buildProfilePath,
  buildTrackPath,
  FLAT_CONTENT_APP_ROUTES,
  getAppRouteFirstSegment,
  getAppRouteSegments,
  isFlatContentAppRouteSegment,
  matchesAppRouteSegments,
  MOBILE_HOME_TAB_PATH,
  MOBILE_HOME_TAB_SEGMENT,
} from '@podverse/helpers';

const MOBILE_MORE_TAB_PATH = '/more';
const MOBILE_LIBRARY_TAB_PATH = '/my-library';
const MOBILE_NOTIFICATIONS_TAB_PATH = '/notifications';
const MOBILE_SEARCH_TAB_PATH = '/search';
const MOBILE_MORE_TAB_SEGMENT = MOBILE_MORE_TAB_PATH.slice(1);
const MOBILE_LIBRARY_TAB_SEGMENT = MOBILE_LIBRARY_TAB_PATH.slice(1);

const NAV_SCOPED_PREFIXES = [
  MOBILE_HOME_TAB_PATH,
  MOBILE_MORE_TAB_PATH,
  MOBILE_LIBRARY_TAB_PATH,
  MOBILE_NOTIFICATIONS_TAB_PATH,
  MOBILE_SEARCH_TAB_PATH,
];

const AUTH_GATED_PATHS = new Set(['/history', '/my-profile', '/queues', APP_ROUTES.SETTINGS]);

const LIVESTREAM_SEGMENT = getAppRouteSegments(APP_ROUTES.PODCAST_LIVESTREAM)[1];

const normalizePath = (path: string): string => {
  if (path.length === 0) {
    return '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
};

const tryParseUrlPath = (value: string): string => {
  try {
    const parsed = new URL(value);
    // Web / universal links (https://podverse.fm/podcast/<id>): the origin is a real network
    // host, so keep only the pathname (+ query/hash) and drop the domain.
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    // Custom app scheme (podverse-next://podcast/<id>): there is no network host. The URL parser
    // treats the first segment (`podcast`) as the host, so it must be re-joined as the leading
    // path segment — otherwise the resource type is lost and every deep link collapses to Home.
    return `/${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
};

const stripQueryAndHash = (path: string): string => {
  const hashIndex = path.indexOf('#');
  const withoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  return queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
};

const getPathSegments = (input: string): string[] => {
  const path = stripQueryAndHash(normalizePath(tryParseUrlPath(input)));
  return path.split('/').filter((segment) => segment.length > 0);
};

const hasNavScopedPrefix = (path: string): boolean => {
  return NAV_SCOPED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

const findFlatContentRoute = (segment: string | undefined) => {
  if (segment === undefined || !isFlatContentAppRouteSegment(segment)) {
    return undefined;
  }
  return FLAT_CONTENT_APP_ROUTES.find((route) => getAppRouteFirstSegment(route) === segment);
};

export const mapIncomingPathToScopedPath = (input: string): string => {
  const normalizedPath = normalizePath(tryParseUrlPath(input));
  const basePath = stripQueryAndHash(normalizedPath);
  const segments = getPathSegments(basePath);
  if (segments.length === 0) {
    return MOBILE_HOME_TAB_PATH;
  }

  if (basePath === '/add-by-rss') {
    return `${MOBILE_LIBRARY_TAB_PATH}/add-by-rss`;
  }

  if (segments.length >= 1 && segments[0] === 'notifications') {
    return MOBILE_NOTIFICATIONS_TAB_PATH;
  }

  if (
    matchesAppRouteSegments(segments, APP_ROUTES.MEMBERSHIP_RENEW) &&
    segments.length === getAppRouteSegments(APP_ROUTES.MEMBERSHIP_RENEW).length
  ) {
    return `${MOBILE_MORE_TAB_PATH}${APP_ROUTES.MEMBERSHIP}`;
  }

  if (hasNavScopedPrefix(basePath)) {
    return basePath;
  }

  if (
    segments.length === 4 &&
    matchesAppRouteSegments(segments, APP_ROUTES.PODCAST) &&
    (segments[2] === getAppRouteFirstSegment(APP_ROUTES.EPISODE) ||
      segments[2] === LIVESTREAM_SEGMENT) &&
    segments[1] !== undefined &&
    segments[3] !== undefined
  ) {
    return buildMobileHomePodcastEpisodePath(segments[1], segments[3]);
  }

  if (
    segments.length === 4 &&
    matchesAppRouteSegments(segments, APP_ROUTES.ALBUM) &&
    segments[2] === getAppRouteFirstSegment(APP_ROUTES.TRACK) &&
    segments[1] !== undefined &&
    segments[3] !== undefined
  ) {
    return buildMobileHomeAlbumTrackPath(segments[1], segments[3]);
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.PODCAST_LIVESTREAM) &&
    segments[2] !== undefined
  ) {
    return buildMobileHomeScopedPath(APP_ROUTES.EPISODE, segments[2]);
  }

  if (
    segments.length === 3 &&
    matchesAppRouteSegments(segments, APP_ROUTES.MUSIC_LIVESTREAM) &&
    segments[2] !== undefined
  ) {
    return buildMobileHomeScopedPath(APP_ROUTES.EPISODE, segments[2]);
  }

  if (
    segments.length === 2 &&
    matchesAppRouteSegments(segments, APP_ROUTES.VIDEO) &&
    segments[1] !== undefined
  ) {
    return buildMobileHomeScopedPath(APP_ROUTES.EPISODE, segments[1]);
  }

  if (
    segments.length === 2 &&
    matchesAppRouteSegments(segments, APP_ROUTES.CHANNEL) &&
    segments[1] !== undefined
  ) {
    return buildMobileHomeScopedPath(APP_ROUTES.PODCAST, segments[1]);
  }

  const flatContentRoute = findFlatContentRoute(segments[0]);
  if (segments.length === 2 && flatContentRoute !== undefined && segments[1] !== undefined) {
    return buildMobileHomeScopedPath(flatContentRoute, segments[1]);
  }

  if (
    segments.length === 2 &&
    matchesAppRouteSegments(segments, APP_ROUTES.PLAYLIST) &&
    segments[1] !== undefined
  ) {
    return `${MOBILE_LIBRARY_TAB_PATH}${APP_ROUTES.PLAYLIST}/${segments[1]}`;
  }

  if (
    segments.length === 2 &&
    matchesAppRouteSegments(segments, APP_ROUTES.PROFILE) &&
    segments[1] !== undefined
  ) {
    return `${MOBILE_MORE_TAB_PATH}${APP_ROUTES.PROFILE}/${segments[1]}`;
  }

  if (segments.length === 1 && matchesAppRouteSegments(segments, APP_ROUTES.SETTINGS)) {
    return `${MOBILE_MORE_TAB_PATH}${APP_ROUTES.SETTINGS}`;
  }

  return MOBILE_HOME_TAB_PATH;
};

export const mapScopedPathToFlatPath = (path: string): string => {
  const normalizedPath = stripQueryAndHash(normalizePath(path));
  const segments = getPathSegments(normalizedPath);

  if (
    segments.length === 5 &&
    segments[0] === MOBILE_HOME_TAB_SEGMENT &&
    matchesAppRouteSegments(segments, APP_ROUTES.PODCAST, 1) &&
    segments[3] === getAppRouteFirstSegment(APP_ROUTES.EPISODE) &&
    segments[4] !== undefined
  ) {
    return buildEpisodePath(segments[4]);
  }

  if (
    segments.length === 5 &&
    segments[0] === MOBILE_HOME_TAB_SEGMENT &&
    matchesAppRouteSegments(segments, APP_ROUTES.ALBUM, 1) &&
    segments[3] === getAppRouteFirstSegment(APP_ROUTES.TRACK) &&
    segments[4] !== undefined
  ) {
    return buildTrackPath(segments[4]);
  }

  const scopedFlatRoute = findFlatContentRoute(segments[1]);
  if (
    segments.length === 3 &&
    segments[0] === MOBILE_HOME_TAB_SEGMENT &&
    scopedFlatRoute !== undefined &&
    segments[2] !== undefined
  ) {
    return buildAppRoutePath(scopedFlatRoute, segments[2]);
  }

  if (
    segments.length === 3 &&
    segments[0] === MOBILE_LIBRARY_TAB_SEGMENT &&
    matchesAppRouteSegments(segments, APP_ROUTES.PLAYLIST, 1) &&
    segments[2] !== undefined
  ) {
    return buildPlaylistPath(segments[2]);
  }

  if (
    segments.length === 3 &&
    segments[0] === MOBILE_MORE_TAB_SEGMENT &&
    matchesAppRouteSegments(segments, APP_ROUTES.PROFILE, 1) &&
    segments[2] !== undefined
  ) {
    return buildProfilePath(segments[2]);
  }

  return normalizedPath;
};

export const isAuthGatedDeepLink = (input: string): boolean => {
  const path = stripQueryAndHash(normalizePath(tryParseUrlPath(input)));
  return AUTH_GATED_PATHS.has(path);
};
