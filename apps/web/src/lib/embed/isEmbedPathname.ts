const EMBED_PATH_PREFIX = '/embed';

export const EMBED_BUILDER_PATHNAME = '/embed/builder';

export function isEmbedPathname(pathname: string | null | undefined): boolean {
  if (pathname === null || pathname === undefined || pathname === '') {
    return false;
  }

  // `/embed` is the operator demo index (full app chrome); child routes stay chromeless.
  if (pathname === EMBED_PATH_PREFIX) {
    return false;
  }

  // `/embed/builder` uses full app chrome like the demo index.
  if (pathname === EMBED_BUILDER_PATHNAME || pathname.startsWith(`${EMBED_BUILDER_PATHNAME}/`)) {
    return false;
  }

  return pathname.startsWith(`${EMBED_PATH_PREFIX}/`);
}
