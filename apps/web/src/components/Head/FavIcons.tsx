import { FavIcons as SharedFavIcons } from '@podverse/ui';

import { getRuntimeConfig } from '../../config/runtime-config-store';

/**
 * Tab / browser chrome icons. Optional env overrides (absolute or path-absolute) allow
 * white-label without replacing files baked into the image; unset uses /favicon/* in public/.
 */
export function FavIcons() {
  const { env } = getRuntimeConfig();
  return (
    <SharedFavIcons
      faviconPng96Url={env.NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL}
      faviconIcoUrl={env.NEXT_PUBLIC_BRAND_FAVICON_ICO_URL}
      faviconSvgUrl={env.NEXT_PUBLIC_BRAND_FAVICON_SVG_URL}
      appleTouchIconUrl={env.NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL}
    />
  );
}
