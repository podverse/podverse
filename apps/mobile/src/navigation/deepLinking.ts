const FLAT_CONTENT_PATHS = new Set(['album', 'artist', 'clip', 'episode', 'podcast', 'track']);
const NAV_SCOPED_PREFIXES = ['/add-by-rss', '/home', '/more', '/my-library', '/search'];
const AUTH_GATED_PATHS = new Set(['/history', '/my-profile', '/queues', '/settings']);

const normalizePath = (path: string): string => {
  if (path.length === 0) {
    return '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
};

const tryParseUrlPath = (value: string): string => {
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
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

const isFlatContentPath = (segments: string[]): boolean => {
  return segments.length === 2 && FLAT_CONTENT_PATHS.has(segments[0] ?? '');
};

const hasNavScopedPrefix = (path: string): boolean => {
  return NAV_SCOPED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

export const mapIncomingPathToScopedPath = (input: string): string => {
  const normalizedPath = normalizePath(tryParseUrlPath(input));
  const basePath = stripQueryAndHash(normalizedPath);
  const segments = getPathSegments(basePath);
  if (segments.length === 0) {
    return '/home';
  }

  if (hasNavScopedPrefix(basePath)) {
    return basePath;
  }

  if (isFlatContentPath(segments)) {
    const [resource, idText] = segments;
    return `/home/${resource}/${idText}`;
  }

  if (segments.length === 2 && segments[0] === 'playlist') {
    return `/my-library/playlist/${segments[1]}`;
  }

  if (segments.length === 2 && segments[0] === 'profile') {
    return `/more/profile/${segments[1]}`;
  }

  if (segments.length === 1 && segments[0] === 'settings') {
    return '/more/settings';
  }

  return '/home';
};

export const mapScopedPathToFlatPath = (path: string): string => {
  const normalizedPath = stripQueryAndHash(normalizePath(path));
  const segments = getPathSegments(normalizedPath);

  if (
    segments.length === 3 &&
    segments[0] === 'home' &&
    FLAT_CONTENT_PATHS.has(segments[1] ?? '')
  ) {
    return `/${segments[1]}/${segments[2]}`;
  }

  if (segments.length === 3 && segments[0] === 'my-library' && segments[1] === 'playlist') {
    return `/playlist/${segments[2]}`;
  }

  if (segments.length === 3 && segments[0] === 'more' && segments[1] === 'profile') {
    return `/profile/${segments[2]}`;
  }

  return normalizedPath;
};

export const isAuthGatedDeepLink = (input: string): boolean => {
  const path = stripQueryAndHash(normalizePath(tryParseUrlPath(input)));
  return AUTH_GATED_PATHS.has(path);
};
