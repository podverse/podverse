import { getBrandSiteOrigin } from '../../config';

const EMBED_PATH_PREFIX = '/embed';

const EMBED_MAIN_SITE_ROUTE_PATTERN =
  /^\/(episode|track|clip|chapter|official-clip|podcast|album|playlist)\/[^/]+\/?$/;

export function embedPathnameToMainSitePath(pathname: string): string | null {
  if (!pathname.startsWith(`${EMBED_PATH_PREFIX}/`)) {
    return null;
  }

  const mainSitePath = pathname.slice(EMBED_PATH_PREFIX.length).replace(/\/$/, '');
  if (!EMBED_MAIN_SITE_ROUTE_PATTERN.test(mainSitePath)) {
    return null;
  }

  return mainSitePath;
}

export function buildEmbedMainSiteUrl(pathname: string): string | null {
  const mainSitePath = embedPathnameToMainSitePath(pathname);
  if (mainSitePath === null) {
    return null;
  }

  const brandSiteOrigin = getBrandSiteOrigin();
  if (brandSiteOrigin === null) {
    return null;
  }

  return new URL(mainSitePath, brandSiteOrigin).toString();
}
