const EMBED_PATH_PREFIX = '/embed';

export function isEmbedPathname(pathname: string | null | undefined): boolean {
  if (pathname === null || pathname === undefined || pathname === '') {
    return false;
  }

  // `/embed` is the operator demo index (full app chrome); child routes stay chromeless.
  if (pathname === EMBED_PATH_PREFIX) {
    return false;
  }

  return pathname.startsWith(`${EMBED_PATH_PREFIX}/`);
}
