/**
 * A sidebar row is current when the URL is that destination.
 * `/` matches only the home page. Any other path also matches routes nested under it.
 * A query on the href (My Clips is `/my-profile?tab=clips`) must be present; extra query
 * keys on the page do not clear the match.
 */
export const isSidebarLinkCurrent = (href: string, pathname: string, search: string): boolean => {
  const hashIndex = href.indexOf('#');
  const hrefWithoutHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const queryIndex = hrefWithoutHash.indexOf('?');
  const hrefPath = queryIndex === -1 ? hrefWithoutHash : hrefWithoutHash.slice(0, queryIndex);
  const hrefQuery = queryIndex === -1 ? '' : hrefWithoutHash.slice(queryIndex + 1);
  const path = normalizePath(hrefPath);
  const currentPath = normalizePath(pathname);

  const pathMatches =
    path === '/subscribed'
      ? currentPath === '/subscribed' || currentPath === '/'
      : path === '/'
        ? currentPath === '/'
        : currentPath === path || currentPath.startsWith(`${path}/`);

  if (!pathMatches) {
    return false;
  }

  if (hrefQuery === '') {
    return true;
  }

  const required = new URLSearchParams(hrefQuery);
  const actual = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of required) {
    if (actual.get(key) !== value) {
      return false;
    }
  }
  return true;
};

const normalizePath = (path: string): string => {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
};
